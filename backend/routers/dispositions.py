"""Dispositions router — match scoring and buyer packet endpoints."""

import os
import secrets
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from core.dispositions.match_engine import score_property_against_buy_box
from core.security.jwt import get_current_user
from database import get_db
from models.analysis_scenarios import AnalysisScenario
from models.buy_boxes import BuyBox
from models.buyer_packets import BuyerPacket, BuyerPacketSend
from models.communications import Communication
from models.contacts import Contact
from models.properties import Property
from models.users import User
from schemas.dispositions import (
    BuyerInfo,
    BuyerMatchResponse,
    BuyerMatchResult,
    MatchBreakdown,
    MatchPreviewRequest,
    MatchPreviewResponse,
    PacketListItem,
    PacketResponse,
    PropertyInfo,
    PropertyMatchResponse,
    PropertyMatchResult,
    CreatePacketRequest,
    SendPacketRequest,
    SendPacketResponse,
    SharedPacketResponse,
)

router = APIRouter(prefix="/dispositions", tags=["dispositions"])

_FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_property_or_404(db: Session, property_id: UUID, user_id: UUID) -> Property:
    prop = db.query(Property).filter(
        Property.id == property_id,
        Property.created_by == user_id,
        Property.is_deleted == False,  # noqa: E712
    ).first()
    if not prop:
        raise HTTPException(
            status_code=404,
            detail={"error": "Property not found", "code": "PROPERTY_NOT_FOUND"},
        )
    return prop


def _get_primary_scenario(db: Session, property_id: UUID) -> Optional[AnalysisScenario]:
    """Return the most recent non-deleted scenario for a property."""
    return (
        db.query(AnalysisScenario)
        .filter(
            AnalysisScenario.property_id == property_id,
            AnalysisScenario.is_deleted == False,  # noqa: E712
        )
        .order_by(AnalysisScenario.created_at.desc())
        .first()
    )


def _property_to_dict(prop: Property) -> dict:
    """Extract fields needed by the match engine from a Property ORM object."""
    return {
        "city": prop.city,
        "state": prop.state,
        "zip_code": prop.zip_code,
        "property_type": prop.property_type,
        "bedrooms": prop.bedrooms,
        "bathrooms": float(prop.bathrooms) if prop.bathrooms is not None else None,
        "sqft": prop.sqft,
        "year_built": prop.year_built,
    }


def _scenario_to_dict(scenario: Optional[AnalysisScenario]) -> Optional[dict]:
    """Extract scoring fields from an AnalysisScenario ORM object."""
    if scenario is None:
        return None
    return {
        "purchase_price": float(scenario.purchase_price) if scenario.purchase_price is not None else None,
        "after_repair_value": float(scenario.after_repair_value) if scenario.after_repair_value is not None else None,
        "repair_cost": float(scenario.repair_cost) if scenario.repair_cost is not None else None,
        "strategy": scenario.strategy,
        "outputs": scenario.outputs or {},
    }


def _buy_box_to_dict(box: BuyBox) -> dict:
    """Extract all scoring criteria from a BuyBox ORM object."""
    return {
        "target_markets": box.target_markets,
        "min_price": float(box.min_price) if box.min_price is not None else None,
        "max_price": float(box.max_price) if box.max_price is not None else None,
        "min_arv": float(box.min_arv) if box.min_arv is not None else None,
        "max_arv": float(box.max_arv) if box.max_arv is not None else None,
        "min_cash_flow": float(box.min_cash_flow) if box.min_cash_flow is not None else None,
        "min_cap_rate": float(box.min_cap_rate) if box.min_cap_rate is not None else None,
        "min_coc_return": float(box.min_coc_return) if box.min_coc_return is not None else None,
        "max_repair_cost": float(box.max_repair_cost) if box.max_repair_cost is not None else None,
        "property_types": box.property_types,
        "min_bedrooms": box.min_bedrooms,
        "min_bathrooms": box.min_bathrooms,
        "min_sqft": box.min_sqft,
        "min_year_built": box.min_year_built,
        "max_year_built": box.max_year_built,
        "strategies": box.strategies,
    }


def _freeze_packet_data(prop: Property, scenario: AnalysisScenario, user: User) -> dict:
    """Build a full JSONB snapshot for a buyer packet."""
    return {
        "property": {
            "address": prop.address_line1,
            "city": prop.city,
            "state": prop.state,
            "zip_code": prop.zip_code,
            "property_type": prop.property_type,
            "bedrooms": prop.bedrooms,
            "bathrooms": float(prop.bathrooms) if prop.bathrooms is not None else None,
            "sqft": prop.sqft,
            "year_built": prop.year_built,
        },
        "scenario": {
            "strategy": scenario.strategy,
            "purchase_price": float(scenario.purchase_price) if scenario.purchase_price is not None else None,
            "after_repair_value": float(scenario.after_repair_value) if scenario.after_repair_value is not None else None,
            "repair_cost": float(scenario.repair_cost) if scenario.repair_cost is not None else None,
            "monthly_rent": float(scenario.monthly_rent) if scenario.monthly_rent is not None else None,
            "outputs": scenario.outputs or {},
        },
        "ai_narrative": scenario.ai_narrative,
        "seller_name": user.name,
        "seller_email": user.email,
        "seller_phone": None,
    }


def _strategy_title(strategy: Optional[str]) -> str:
    titles = {
        "fix_and_flip": "Fix & Flip",
        "buy_and_hold": "Buy & Hold",
        "wholesale": "Wholesale",
        "brrrr": "BRRRR",
        "airbnb": "Short-Term Rental",
        "subject_to": "Subject-To",
        "creative_finance": "Creative Finance",
    }
    if not strategy:
        return "Investment"
    return titles.get(strategy.lower(), strategy.replace("_", " ").title())


def _share_url(token: str) -> str:
    return f"{_FRONTEND_URL}/packets/view/{token}"


# ---------------------------------------------------------------------------
# Match scoring endpoints
# ---------------------------------------------------------------------------

@router.get("/matches/property/{property_id}", response_model=PropertyMatchResponse)
async def matches_for_property(
    property_id: UUID,
    min_score: int = Query(40, ge=0, le=100),
    funding_type: Optional[str] = Query(None),
    has_pof: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Find buyers whose buy boxes match a specific property."""
    prop = _get_property_or_404(db, property_id, current_user.id)
    scenario = _get_primary_scenario(db, property_id)

    prop_dict = _property_to_dict(prop)
    scenario_dict = _scenario_to_dict(scenario)

    # All buyer contacts with at least one active buy box for this user
    buyers = (
        db.query(Contact)
        .filter(
            Contact.created_by == current_user.id,
            Contact.contact_type == "buyer",
            Contact.is_deleted == False,  # noqa: E712
        )
        .all()
    )

    results: list[PropertyMatchResult] = []

    for buyer in buyers:
        boxes = (
            db.query(BuyBox)
            .filter(
                BuyBox.contact_id == buyer.id,
                BuyBox.is_active == True,  # noqa: E712
                BuyBox.deleted_at.is_(None),
            )
            .all()
        )
        if not boxes:
            continue

        # Score each buy box, keep the best
        best: Optional[dict] = None
        best_box: Optional[BuyBox] = None
        for box in boxes:
            result = score_property_against_buy_box(
                prop_dict, scenario_dict, _buy_box_to_dict(box)
            )
            if best is None or result["total_score"] > best["total_score"]:
                best = result
                best_box = box

        if best is None or best["total_score"] < min_score:
            continue

        # Optional filters
        if funding_type and (best_box.funding_type or "") != funding_type:
            continue
        if has_pof is True and not best_box.proof_of_funds:
            continue

        bd = best["breakdown"]
        results.append(
            PropertyMatchResult(
                contact_id=buyer.id,
                buyer_name=f"{buyer.first_name} {buyer.last_name}".strip(),
                company=buyer.company,
                buy_box_id=best_box.id,
                buy_box_name=best_box.name,
                score=best["total_score"],
                match_level=best["match_level"],
                breakdown=MatchBreakdown(
                    location=bd["location"],
                    financial=bd["financial"],
                    property=bd["property"],
                    strategy=bd["strategy"],
                ),
                reasons=best["reasons"],
                funding_type=best_box.funding_type,
                has_pof=best_box.proof_of_funds or False,
                can_close_days=best_box.can_close_days,
            )
        )

    results.sort(key=lambda r: r.score, reverse=True)

    try:
        from core.telemetry import track_event
        track_event(current_user.id, "property_matches_viewed", {
            "property_id": str(property_id),
            "match_count": len(results),
            "min_score": min_score,
        })
    except Exception:
        pass

    return PropertyMatchResponse(
        property=PropertyInfo(
            id=prop.id,
            address=prop.address_line1,
            city=prop.city,
            state=prop.state,
            zip_code=prop.zip_code,
            strategy=scenario.strategy if scenario else None,
            purchase_price=float(scenario.purchase_price) if scenario and scenario.purchase_price else None,
            scenario_id=scenario.id if scenario else None,
        ),
        matches=results,
    )


@router.get("/matches/buyer/{contact_id}", response_model=BuyerMatchResponse)
async def matches_for_buyer(
    contact_id: UUID,
    min_score: int = Query(40, ge=0, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Find properties that match a buyer's buy box criteria."""
    buyer = (
        db.query(Contact)
        .filter(
            Contact.id == contact_id,
            Contact.created_by == current_user.id,
            Contact.contact_type == "buyer",
            Contact.is_deleted == False,  # noqa: E712
        )
        .first()
    )
    if not buyer:
        raise HTTPException(
            status_code=404,
            detail={"error": "Buyer not found", "code": "BUYER_NOT_FOUND"},
        )

    boxes = (
        db.query(BuyBox)
        .filter(
            BuyBox.contact_id == contact_id,
            BuyBox.is_active == True,  # noqa: E712
            BuyBox.deleted_at.is_(None),
        )
        .all()
    )

    if not boxes:
        return BuyerMatchResponse(
            buyer=BuyerInfo(
                id=buyer.id,
                name=f"{buyer.first_name} {buyer.last_name}".strip(),
                company=buyer.company,
            ),
            matches=[],
        )

    properties = (
        db.query(Property)
        .filter(
            Property.created_by == current_user.id,
            Property.is_deleted == False,  # noqa: E712
            Property.status != "archived",
        )
        .all()
    )

    # Track best score per property across all buy boxes
    best_per_property: dict[UUID, tuple[dict, BuyBox, AnalysisScenario | None]] = {}

    for prop in properties:
        scenario = _get_primary_scenario(db, prop.id)
        prop_dict = _property_to_dict(prop)
        scenario_dict = _scenario_to_dict(scenario)

        for box in boxes:
            result = score_property_against_buy_box(
                prop_dict, scenario_dict, _buy_box_to_dict(box)
            )
            current_best = best_per_property.get(prop.id)
            if current_best is None or result["total_score"] > current_best[0]["total_score"]:
                best_per_property[prop.id] = (result, box, scenario)

    # Build results filtered by min_score
    match_results: list[BuyerMatchResult] = []
    for prop in properties:
        entry = best_per_property.get(prop.id)
        if entry is None:
            continue
        best, best_box, scenario = entry
        if best["total_score"] < min_score:
            continue
        bd = best["breakdown"]
        match_results.append(
            BuyerMatchResult(
                property_id=prop.id,
                address=prop.address_line1,
                city=prop.city,
                state=prop.state,
                zip_code=prop.zip_code,
                strategy=scenario.strategy if scenario else None,
                purchase_price=float(scenario.purchase_price) if scenario and scenario.purchase_price else None,
                buy_box_name=best_box.name,
                score=best["total_score"],
                match_level=best["match_level"],
                breakdown=MatchBreakdown(
                    location=bd["location"],
                    financial=bd["financial"],
                    property=bd["property"],
                    strategy=bd["strategy"],
                ),
            )
        )

    match_results.sort(key=lambda r: r.score, reverse=True)
    match_results = match_results[:50]

    try:
        from core.telemetry import track_event
        track_event(current_user.id, "buyer_matches_viewed_v2", {
            "contact_id": str(contact_id),
            "match_count": len(match_results),
        })
    except Exception:
        pass

    return BuyerMatchResponse(
        buyer=BuyerInfo(
            id=buyer.id,
            name=f"{buyer.first_name} {buyer.last_name}".strip(),
            company=buyer.company,
        ),
        matches=match_results,
    )


@router.post("/match-preview", response_model=MatchPreviewResponse)
async def match_preview(
    body: MatchPreviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Preview the match score between a single property and a single buy box."""
    prop = _get_property_or_404(db, body.property_id, current_user.id)

    box = (
        db.query(BuyBox)
        .filter(
            BuyBox.id == body.buy_box_id,
            BuyBox.created_by == current_user.id,
            BuyBox.deleted_at.is_(None),
        )
        .first()
    )
    if not box:
        raise HTTPException(
            status_code=404,
            detail={"error": "Buy box not found", "code": "BUY_BOX_NOT_FOUND"},
        )

    scenario = _get_primary_scenario(db, prop.id)
    result = score_property_against_buy_box(
        _property_to_dict(prop),
        _scenario_to_dict(scenario),
        _buy_box_to_dict(box),
    )

    bd = result["breakdown"]
    return MatchPreviewResponse(
        score=result["total_score"],
        match_level=result["match_level"],
        breakdown=MatchBreakdown(
            location=bd["location"],
            financial=bd["financial"],
            property=bd["property"],
            strategy=bd["strategy"],
        ),
        reasons=result["reasons"],
    )


# ---------------------------------------------------------------------------
# Buyer packet endpoints
# ---------------------------------------------------------------------------

@router.post("/packets", response_model=PacketResponse, status_code=status.HTTP_201_CREATED)
async def create_packet(
    body: CreatePacketRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a frozen buyer packet from a property + scenario."""
    prop = _get_property_or_404(db, body.property_id, current_user.id)

    scenario = (
        db.query(AnalysisScenario)
        .filter(
            AnalysisScenario.id == body.scenario_id,
            AnalysisScenario.property_id == prop.id,
            AnalysisScenario.is_deleted == False,  # noqa: E712
        )
        .first()
    )
    if not scenario:
        raise HTTPException(
            status_code=404,
            detail={"error": "Scenario not found", "code": "SCENARIO_NOT_FOUND"},
        )

    share_token = secrets.token_urlsafe(16)

    # Auto-generate title
    if body.title:
        title = body.title
    else:
        address = prop.address_line1 or f"{prop.city}, {prop.state}"
        strat_title = _strategy_title(scenario.strategy)
        title = f"{address} — {strat_title} Analysis"

    packet_data = _freeze_packet_data(prop, scenario, current_user)

    packet = BuyerPacket(
        property_id=prop.id,
        scenario_id=scenario.id,
        created_by=current_user.id,
        team_id=current_user.team_id,
        title=title,
        share_token=share_token,
        packet_data=packet_data,
        asking_price=body.asking_price,
        assignment_fee=body.assignment_fee,
        notes_to_buyer=body.notes_to_buyer,
        is_public=True,
        view_count=0,
    )
    db.add(packet)
    db.commit()
    db.refresh(packet)

    send_count = db.query(BuyerPacketSend).filter(
        BuyerPacketSend.packet_id == packet.id
    ).count()

    try:
        from core.telemetry import track_event
        track_event(current_user.id, "buyer_packet_created", {
            "packet_id": str(packet.id),
            "property_id": str(prop.id),
            "strategy": scenario.strategy,
        })
    except Exception:
        pass

    return PacketResponse(
        id=packet.id,
        property_id=packet.property_id,
        scenario_id=packet.scenario_id,
        title=packet.title,
        share_token=packet.share_token,
        share_url=_share_url(packet.share_token),
        asking_price=float(packet.asking_price) if packet.asking_price is not None else None,
        assignment_fee=float(packet.assignment_fee) if packet.assignment_fee is not None else None,
        notes_to_buyer=packet.notes_to_buyer,
        is_public=packet.is_public,
        view_count=packet.view_count,
        last_viewed_at=packet.last_viewed_at.isoformat() if packet.last_viewed_at else None,
        send_count=send_count,
        created_at=packet.created_at,
        updated_at=packet.updated_at,
    )


@router.get("/packets", response_model=list[PacketListItem])
async def list_packets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List the current user's buyer packets with send counts."""
    packets = (
        db.query(BuyerPacket)
        .filter(
            BuyerPacket.created_by == current_user.id,
            BuyerPacket.deleted_at.is_(None),
        )
        .order_by(BuyerPacket.created_at.desc())
        .all()
    )

    items: list[PacketListItem] = []
    for packet in packets:
        send_count = db.query(BuyerPacketSend).filter(
            BuyerPacketSend.packet_id == packet.id
        ).count()

        # Derive property address from snapshot or relationship
        prop_data = (packet.packet_data or {}).get("property", {})
        address = prop_data.get("address_line1") or packet.title

        items.append(
            PacketListItem(
                id=packet.id,
                title=packet.title,
                share_url=_share_url(packet.share_token),
                property_address=address,
                asking_price=float(packet.asking_price) if packet.asking_price is not None else None,
                view_count=packet.view_count,
                send_count=send_count,
                created_at=packet.created_at,
            )
        )

    return items


@router.get("/packets/share/{share_token}", response_model=SharedPacketResponse)
async def view_shared_packet(
    share_token: str,
    request: Request,
    ref: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Public endpoint — view a shared buyer packet by token."""
    packet = (
        db.query(BuyerPacket)
        .filter(
            BuyerPacket.share_token == share_token,
            BuyerPacket.is_public == True,  # noqa: E712
            BuyerPacket.deleted_at.is_(None),
        )
        .first()
    )
    if not packet:
        raise HTTPException(
            status_code=404,
            detail={"error": "Packet not found or not public", "code": "PACKET_NOT_FOUND"},
        )

    # S2: Bot-filtered view count increment
    user_agent = (request.headers.get("user-agent") or "").lower()
    is_bot = any(bot in user_agent for bot in ["googlebot", "bingbot", "headlesschrome", "crawler", "spider", "bot/"])

    if not is_bot:
        packet.view_count = (packet.view_count or 0) + 1
        packet.last_viewed_at = datetime.utcnow()

    # S2: Track opened_at for specific buyer sends
    if ref:
        try:
            from uuid import UUID as UUID_type
            ref_uuid = UUID_type(ref)
            send_record = db.query(BuyerPacketSend).filter(
                BuyerPacketSend.packet_id == packet.id,
                BuyerPacketSend.contact_id == ref_uuid,
                BuyerPacketSend.opened_at.is_(None),
            ).first()
            if send_record:
                send_record.opened_at = datetime.utcnow()
        except (ValueError, AttributeError):
            pass  # invalid ref UUID, ignore

    db.commit()

    return SharedPacketResponse(
        title=packet.title,
        packet_data=packet.packet_data or {},
        asking_price=float(packet.asking_price) if packet.asking_price is not None else None,
        assignment_fee=float(packet.assignment_fee) if packet.assignment_fee is not None else None,
        notes_to_buyer=packet.notes_to_buyer,
        created_at=packet.created_at,
    )


@router.post("/packets/{packet_id}/send", response_model=SendPacketResponse)
async def send_packet(
    packet_id: UUID,
    body: SendPacketRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a buyer packet to one or more buyer contacts (max 50)."""
    packet = (
        db.query(BuyerPacket)
        .filter(
            BuyerPacket.id == packet_id,
            BuyerPacket.created_by == current_user.id,
            BuyerPacket.deleted_at.is_(None),
        )
        .first()
    )
    if not packet:
        raise HTTPException(
            status_code=404,
            detail={"error": "Packet not found", "code": "PACKET_NOT_FOUND"},
        )

    if not body.buyer_contact_ids:
        raise HTTPException(
            status_code=400,
            detail={"error": "At least one buyer contact is required", "code": "NO_BUYERS"},
        )

    # Validate all buyer contacts belong to the user and are typed as buyers
    contacts = (
        db.query(Contact)
        .filter(
            Contact.id.in_(body.buyer_contact_ids),
            Contact.created_by == current_user.id,
            Contact.contact_type == "buyer",  # S1: must be a buyer contact
            Contact.is_deleted == False,  # noqa: E712
        )
        .all()
    )
    found_ids = {c.id for c in contacts}
    missing = [str(cid) for cid in body.buyer_contact_ids if cid not in found_ids]
    if missing:
        raise HTTPException(
            status_code=404,
            detail={"error": f"Contacts not found: {missing}", "code": "CONTACTS_NOT_FOUND"},
        )

    now = datetime.utcnow()
    buyer_names: list[str] = []

    for contact in contacts:
        # Create Communication record
        comm = Communication(
            created_by=current_user.id,
            team_id=current_user.team_id,
            channel="packet",
            direction="outbound",
            subject=packet.title,
            body=body.message,
            contact_id=contact.id,
            property_id=packet.property_id,
            occurred_at=now,
            is_deleted=False,
        )
        db.add(comm)
        db.flush()  # get comm.id

        # Create BuyerPacketSend record
        send = BuyerPacketSend(
            packet_id=packet.id,
            contact_id=contact.id,
            communication_id=comm.id,
            sent_at=now,
        )
        db.add(send)

        buyer_names.append(f"{contact.first_name} {contact.last_name}".strip())

    db.commit()

    try:
        from core.telemetry import track_event
        track_event(current_user.id, "buyer_packet_sent", {
            "packet_id": str(packet_id),
            "recipient_count": len(contacts),
        })
    except Exception:
        pass

    return SendPacketResponse(
        sent_count=len(contacts),
        buyer_names=buyer_names,
    )
