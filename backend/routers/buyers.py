"""Buyers router — buyer contacts with buy box criteria and property matching."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from core.security.jwt import get_current_user
from database import get_db
from models.buy_boxes import BuyBox
from models.communications import Communication
from models.contacts import Contact
from models.deal_contacts import DealContact
from models.deals import Deal
from models.properties import Property
from models.analysis_scenarios import AnalysisScenario
from models.users import User
from schemas.buyers import (
    BuyBoxResponse,
    BuyerDetailResponse,
    BuyerListItem,
    CreateBuyBoxRequest,
    MatchingPropertyItem,
    QuickAddBuyerRequest,
    UpdateBuyBoxRequest,
)

router = APIRouter(prefix="/buyers", tags=["buyers"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_buyer_or_404(db: Session, contact_id: UUID, user_id: UUID) -> Contact:
    contact = db.query(Contact).filter(
        Contact.id == contact_id,
        Contact.created_by == user_id,
        Contact.contact_type == "buyer",
        Contact.is_deleted == False,  # noqa: E712
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail={"error": "Buyer not found", "code": "BUYER_NOT_FOUND"})
    return contact


def _get_buy_box_or_404(db: Session, box_id: UUID, contact_id: UUID, user_id: UUID) -> BuyBox:
    box = db.query(BuyBox).filter(
        BuyBox.id == box_id,
        BuyBox.contact_id == contact_id,
        BuyBox.created_by == user_id,
        BuyBox.deleted_at.is_(None),
    ).first()
    if not box:
        raise HTTPException(status_code=404, detail={"error": "Buy box not found", "code": "BUY_BOX_NOT_FOUND"})
    return box


def _build_buyer_item(db: Session, contact: Contact) -> BuyerListItem:
    """Build a BuyerListItem with buy boxes and computed fields."""
    boxes = db.query(BuyBox).filter(
        BuyBox.contact_id == contact.id,
        BuyBox.deleted_at.is_(None),
    ).all()

    deal_count = db.query(func.count(DealContact.id)).filter(
        DealContact.contact_id == contact.id,
    ).scalar() or 0

    last_comm = db.query(func.max(Communication.occurred_at)).filter(
        Communication.contact_id == contact.id,
    ).scalar()

    # Derive funding_type and has_pof from active buy boxes
    active_boxes = [b for b in boxes if b.is_active]
    funding = active_boxes[0].funding_type if active_boxes else None
    has_pof = any(b.proof_of_funds for b in active_boxes)

    return BuyerListItem(
        id=contact.id,
        first_name=contact.first_name,
        last_name=contact.last_name,
        email=contact.email,
        phone=contact.phone,
        company=contact.company,
        contact_type=contact.contact_type,
        buy_boxes=[BuyBoxResponse.model_validate(b, from_attributes=True) for b in boxes],
        deal_count=deal_count,
        last_communication=last_comm.isoformat() if last_comm else None,
        funding_type=funding,
        has_pof=has_pof,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("", response_model=list[BuyerListItem])
async def list_buyers(
    funding_type: Optional[str] = Query(None),
    has_pof: Optional[bool] = Query(None),
    market: Optional[str] = Query(None),
    strategy: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all buyer contacts with their buy boxes."""
    query = db.query(Contact).filter(
        Contact.created_by == current_user.id,
        Contact.contact_type == "buyer",
        Contact.is_deleted == False,  # noqa: E712
    )

    if q:
        search = f"%{q}%"
        query = query.filter(or_(
            Contact.first_name.ilike(search),
            Contact.last_name.ilike(search),
            Contact.email.ilike(search),
            Contact.phone.ilike(search),
            Contact.company.ilike(search),
        ))

    buyers = query.order_by(Contact.created_at.desc()).all()

    # Build items and apply buy-box-level filters
    items = []
    for contact in buyers:
        item = _build_buyer_item(db, contact)

        # Filter by funding type
        if funding_type and item.funding_type != funding_type:
            continue

        # Filter by POF
        if has_pof is True and not item.has_pof:
            continue

        # Filter by market (search in target_markets of any box)
        if market:
            market_lower = market.lower()
            has_market = any(
                any(market_lower in m.lower() for m in (b.target_markets or []))
                for b in item.buy_boxes
            )
            if not has_market:
                continue

        # Filter by strategy (search in strategies of any box)
        if strategy:
            has_strategy = any(
                strategy in (b.strategies or [])
                for b in item.buy_boxes
            )
            if not has_strategy:
                continue

        items.append(item)

    try:
        from core.telemetry import track_event
        track_event(current_user.id, "buyers_list_viewed", {"count": len(items)})
    except Exception:
        pass

    return items


@router.get("/{contact_id}", response_model=BuyerDetailResponse)
async def get_buyer(
    contact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Full buyer profile with buy boxes and deal stats."""
    contact = _get_buyer_or_404(db, contact_id, current_user.id)
    item = _build_buyer_item(db, contact)

    # Deal volume
    deals = (
        db.query(Deal)
        .join(DealContact, DealContact.deal_id == Deal.id)
        .filter(DealContact.contact_id == contact.id)
        .all()
    )
    total_volume = sum(
        float(d.inputs.get("purchase_price", 0) or 0) if d.inputs else 0
        for d in deals
    )

    try:
        from core.telemetry import track_event
        track_event(current_user.id, "buyer_detail_viewed", {
            "contact_id": str(contact_id),
            "buy_box_count": len(item.buy_boxes),
        })
    except Exception:
        pass

    return BuyerDetailResponse(
        **item.model_dump(),
        notes=contact.notes,
        tags=contact.tags,
        total_deals_closed=len(deals),
        total_deal_volume=round(total_volume, 2),
    )


@router.post("/{contact_id}/buy-boxes", response_model=BuyBoxResponse, status_code=status.HTTP_201_CREATED)
async def create_buy_box(
    contact_id: UUID,
    body: CreateBuyBoxRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a buy box for a buyer contact."""
    _get_buyer_or_404(db, contact_id, current_user.id)

    box = BuyBox(
        contact_id=contact_id,
        created_by=current_user.id,
        team_id=current_user.team_id,
        **body.model_dump(),
    )
    db.add(box)
    db.commit()
    db.refresh(box)

    try:
        from core.telemetry import track_event
        track_event(current_user.id, "buy_box_created", {
            "has_price_range": body.min_price is not None or body.max_price is not None,
            "has_markets": bool(body.target_markets),
            "strategies_count": len(body.strategies or []),
        })
    except Exception:
        pass

    return BuyBoxResponse.model_validate(box, from_attributes=True)


@router.patch("/{contact_id}/buy-boxes/{box_id}", response_model=BuyBoxResponse)
async def update_buy_box(
    contact_id: UUID,
    box_id: UUID,
    body: UpdateBuyBoxRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update buy box criteria."""
    _get_buyer_or_404(db, contact_id, current_user.id)
    box = _get_buy_box_or_404(db, box_id, contact_id, current_user.id)

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(box, key, value)

    db.commit()
    db.refresh(box)
    return BuyBoxResponse.model_validate(box, from_attributes=True)


@router.delete("/{contact_id}/buy-boxes/{box_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_buy_box(
    contact_id: UUID,
    box_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Soft delete a buy box."""
    _get_buyer_or_404(db, contact_id, current_user.id)
    box = _get_buy_box_or_404(db, box_id, contact_id, current_user.id)
    box.deleted_at = datetime.utcnow()
    db.commit()


@router.post("/quick-add", response_model=BuyerListItem, status_code=status.HTTP_201_CREATED)
async def quick_add_buyer(
    body: QuickAddBuyerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a buyer contact and first buy box in one request."""
    contact = Contact(
        first_name=body.first_name,
        last_name=body.last_name,
        phone=body.phone,
        email=body.email,
        company=body.company,
        contact_type="buyer",
        created_by=current_user.id,
        team_id=current_user.team_id,
    )
    db.add(contact)
    db.flush()

    box = BuyBox(
        contact_id=contact.id,
        created_by=current_user.id,
        team_id=current_user.team_id,
        **body.buy_box.model_dump(),
    )
    if body.funding_type:
        box.funding_type = body.funding_type
    if body.proof_of_funds:
        box.proof_of_funds = body.proof_of_funds
    db.add(box)
    db.commit()
    db.refresh(contact)

    try:
        from core.telemetry import track_event
        track_event(current_user.id, "buyer_created", {
            "funding_type": body.funding_type,
            "has_pof": body.proof_of_funds,
        })
    except Exception:
        pass

    return _build_buyer_item(db, contact)


@router.get("/{contact_id}/matches", response_model=list[MatchingPropertyItem])
async def buyer_matches(
    contact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Properties matching this buyer's buy box criteria."""
    _get_buyer_or_404(db, contact_id, current_user.id)

    boxes = db.query(BuyBox).filter(
        BuyBox.contact_id == contact_id,
        BuyBox.created_by == current_user.id,
        BuyBox.is_active == True,  # noqa: E712
        BuyBox.deleted_at.is_(None),
    ).all()

    if not boxes:
        return []

    matched_ids = set()
    results = []

    for box in boxes:
        q = db.query(Property).filter(
            Property.created_by == current_user.id,
            Property.is_deleted == False,  # noqa: E712
            Property.status != "archived",
        )

        # Property type filter
        if box.property_types:
            q = q.filter(Property.property_type.in_(box.property_types))

        # Bedroom/bathroom/sqft filters
        if box.min_bedrooms:
            q = q.filter(Property.bedrooms >= box.min_bedrooms)
        if box.min_bathrooms:
            q = q.filter(Property.bathrooms >= box.min_bathrooms)
        if box.min_sqft:
            q = q.filter(Property.sqft >= box.min_sqft)

        # Year built filter
        if box.min_year_built:
            q = q.filter(Property.year_built >= box.min_year_built)
        if box.max_year_built:
            q = q.filter(Property.year_built <= box.max_year_built)

        # Location filter — check city, state, zip against target_markets
        if box.target_markets:
            location_filters = []
            for market in box.target_markets:
                market_lower = market.strip().lower()
                location_filters.append(func.lower(Property.city).contains(market_lower))
                location_filters.append(func.lower(Property.state).contains(market_lower))
                location_filters.append(Property.zip_code.contains(market.strip()))
            if location_filters:
                q = q.filter(or_(*location_filters))

        properties = q.limit(50).all()

        for prop in properties:
            if prop.id in matched_ids:
                continue

            # Price filter (requires scenario data)
            scenario = db.query(AnalysisScenario).filter(
                AnalysisScenario.property_id == prop.id,
                AnalysisScenario.is_deleted == False,  # noqa: E712
            ).order_by(AnalysisScenario.created_at.desc()).first()

            pp = float(scenario.purchase_price or 0) if scenario else 0
            arv = float(scenario.after_repair_value or 0) if scenario else 0
            strategy = scenario.strategy if scenario else None

            if box.min_price and pp > 0 and pp < float(box.min_price):
                continue
            if box.max_price and pp > 0 and pp > float(box.max_price):
                continue

            matched_ids.add(prop.id)
            results.append(MatchingPropertyItem(
                id=prop.id,
                address=prop.address_line1,
                city=prop.city,
                state=prop.state,
                zip_code=prop.zip_code,
                purchase_price=pp if pp > 0 else None,
                after_repair_value=arv if arv > 0 else None,
                property_type=prop.property_type,
                bedrooms=prop.bedrooms,
                bathrooms=int(prop.bathrooms) if prop.bathrooms else None,
                sqft=prop.sqft,
                strategy=strategy,
            ))

            if len(results) >= 20:
                break
        if len(results) >= 20:
            break

    try:
        from core.telemetry import track_event
        track_event(current_user.id, "buyer_matches_viewed", {
            "contact_id": str(contact_id),
            "match_count": len(results),
        })
    except Exception:
        pass

    return results
