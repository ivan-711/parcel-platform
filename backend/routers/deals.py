"""Deals router — CRUD for deal analyses plus a public share endpoint."""

import importlib
import logging
import os
from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from core.billing.tier_gate import require_feature, require_quota, record_usage
from core.security.jwt import get_current_user
from database import get_db
from limiter import limiter
from models.deals import Deal
from models.users import User
from schemas.deals import (
    DealCreateRequest,
    DealListItem,
    DealResponse,
    DealUpdateRequest,
    OfferLetterResponse,
    ShareDealActionResponse,
    SharedByInfo,
    SharedDealResponse,
)

router = APIRouter(prefix="/deals", tags=["deals"])

# ---------------------------------------------------------------------------
# Primary metric extraction
# ---------------------------------------------------------------------------

_METRIC_MAP: dict[str, tuple[str, str]] = {
    # strategy       → (display_label,            output_key)
    "wholesale":        ("Maximum Allowable Offer", "mao"),
    "buy_and_hold":     ("Cash-on-Cash Return",     "coc_return"),
    "flip":             ("Gross Profit",             "gross_profit"),
    "brrrr":            ("Money Left In",            "money_left_in"),
    "creative_finance": ("Monthly Cash Flow",        "monthly_cash_flow"),
}


def _primary_metric(
    strategy: str, outputs: dict[str, Any],
) -> tuple[Optional[str], Optional[float]]:
    """Extract the most meaningful metric from deal outputs for list display.

    Returns (label, value) or (None, None) if outputs are empty.
    """
    if not outputs:
        return None, None
    label_name, key = _METRIC_MAP.get(strategy, ("", ""))
    value = outputs.get(key)
    if value is None:
        return None, None
    return label_name, float(value)


# ---------------------------------------------------------------------------
# Risk factor derivation (read-only — does NOT touch risk_score.py)
# ---------------------------------------------------------------------------


def build_risk_factors(
    strategy: str, inputs: dict, outputs: dict, risk_score: int
) -> dict:
    """Derive the most meaningful risk indicators from deal inputs/outputs.

    Returns a flat dict of named factors keyed by strategy. Always includes
    ``risk_score`` for convenience.
    """
    factors: dict[str, Any] = {"risk_score": risk_score}

    if strategy == "wholesale":
        arv = inputs.get("arv") or 0
        asking = inputs.get("asking_price") or 0
        repair = inputs.get("repair_costs") or 0
        factors["spread_vs_arv_pct"] = round((arv - asking) / arv * 100, 2) if arv else None
        factors["repair_to_arv_ratio"] = round(repair / arv * 100, 2) if arv else None
        factors["estimated_profit"] = outputs.get("profit_at_ask")
        mao = outputs.get("mao")
        factors["mao_vs_asking"] = round(mao - asking, 2) if mao is not None else None

    elif strategy == "buy_and_hold":
        factors["monthly_cash_flow"] = outputs.get("monthly_cash_flow")
        factors["cash_on_cash_return"] = outputs.get("coc_return")
        factors["cap_rate"] = outputs.get("cap_rate")
        factors["debt_service_coverage"] = outputs.get("dscr")
        monthly_rent = inputs.get("monthly_rent") or 0
        vacancy = inputs.get("vacancy_rate_pct") or 0
        factors["vacancy_impact_monthly"] = round(monthly_rent * vacancy / 100, 2)

    elif strategy == "brrrr":
        factors["equity_left_in"] = outputs.get("money_left_in")
        factors["monthly_cash_flow"] = outputs.get("monthly_cash_flow")
        factors["refinance_proceeds"] = outputs.get("refi_proceeds")
        purchase = inputs.get("purchase_price") or 0
        rehab = inputs.get("rehab_costs") or 0
        factors["total_invested"] = round(purchase + rehab, 2)

    elif strategy == "flip":
        factors["projected_profit"] = outputs.get("gross_profit")
        factors["roi_pct"] = outputs.get("roi")
        purchase = inputs.get("purchase_price") or 0
        rehab = inputs.get("rehab_budget") or 0
        financing = inputs.get("financing_costs") or 0
        factors["total_cost"] = round(purchase + rehab + financing, 2)
        arv = inputs.get("arv") or 0
        net_profit = outputs.get("gross_profit")
        factors["profit_margin_pct"] = (
            round(net_profit / arv * 100, 2) if arv and net_profit is not None else None
        )

    elif strategy == "creative_finance":
        rent_est = inputs.get("monthly_rent_estimate") or 0
        piti = inputs.get("monthly_piti") or 0
        expenses = inputs.get("monthly_expenses") or 0
        factors["monthly_spread"] = round(rent_est - piti, 2)
        factors["annual_cash_flow"] = round((rent_est - piti - expenses) * 12, 2)
        arv = inputs.get("arv") or 0
        loan_balance = inputs.get("existing_loan_balance") or 0
        factors["equity_capture"] = round(arv - loan_balance, 2)

    return factors


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_owned_deal(deal_id: UUID, current_user: User, db: Session) -> Deal:
    """Fetch a deal by id that belongs to the current user (not soft-deleted).

    Raises 404 if not found or 403 if owned by another user.
    """
    deal = db.query(Deal).filter(Deal.id == deal_id, Deal.deleted_at.is_(None)).first()
    if not deal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Deal not found", "code": "DEAL_NOT_FOUND"},
        )
    if deal.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Access denied", "code": "ACCESS_DENIED"},
        )
    return deal


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/", response_model=DealResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
async def create_deal(
    request: Request,
    body: DealCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _quota_deals: None = Depends(require_quota("saved_deals")),
    _quota_analyses: None = Depends(require_quota("analyses_per_month")),
) -> DealResponse:
    """Create a new deal analysis.

    Dynamically imports the strategy calculator. Returns 422 if the calculator
    has not yet been implemented for the given strategy.
    """
    try:
        calc_mod = importlib.import_module(f"core.calculators.{body.strategy}")
        calc_fn = getattr(calc_mod, f"calculate_{body.strategy}")
        risk_mod = importlib.import_module("core.calculators.risk_score")
        risk_fn = risk_mod.calculate_risk_score
    except (ImportError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "Calculator not yet implemented for this strategy",
                "code": "CALCULATOR_NOT_IMPLEMENTED",
            },
        )

    inputs_dict: dict = body.inputs.model_dump()
    outputs: dict = calc_fn(inputs_dict)
    risk_score: int = risk_fn(body.strategy, inputs_dict, outputs)
    risk_factors = build_risk_factors(
        body.strategy, inputs_dict, outputs, risk_score,
    )

    deal = Deal(
        user_id=current_user.id,
        team_id=None,
        address=body.address,
        zip_code=body.zip_code,
        property_type=body.property_type,
        strategy=body.strategy,
        inputs=inputs_dict,
        outputs=outputs,
        risk_score=risk_score,
        risk_factors=risk_factors,
        status="draft",
    )
    db.add(deal)
    record_usage(current_user.id, "analyses_per_month", db)
    db.commit()
    db.refresh(deal)
    return DealResponse.model_validate(deal)


@router.get("/", response_model=list[DealListItem])
@limiter.limit("60/minute")
async def list_deals(
    request: Request,
    strategy: Optional[str] = Query(None),
    deal_status: Optional[str] = Query(None, alias="status"),
    zip_code: Optional[str] = Query(None),
    search: Optional[str] = Query(None, alias="q"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort: str = Query("created_at_desc"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[DealListItem]:
    """List deals owned by the current user, with optional filtering, search, and pagination."""
    q = db.query(Deal).filter(
        Deal.user_id == current_user.id,
        Deal.deleted_at.is_(None),
    )

    if strategy:
        q = q.filter(Deal.strategy == strategy)
    if deal_status:
        q = q.filter(Deal.status == deal_status)
    if zip_code:
        q = q.filter(Deal.zip_code == zip_code)
    if search:
        q = q.filter(Deal.address.ilike(f"%{search}%"))

    # Sorting
    if sort == "created_at_asc":
        q = q.order_by(Deal.created_at.asc())
    else:
        q = q.order_by(Deal.created_at.desc())

    deals = q.offset((page - 1) * per_page).limit(per_page).all()

    items: list[DealListItem] = []
    for d in deals:
        label, value = _primary_metric(d.strategy, d.outputs or {})
        items.append(
            DealListItem(
                id=d.id,
                address=d.address,
                zip_code=d.zip_code,
                strategy=d.strategy,
                primary_metric_label=label,
                primary_metric_value=value,
                risk_score=d.risk_score,
                status=d.status,
                created_at=d.created_at,
            )
        )
    return items


@router.get("/{deal_id}", response_model=DealResponse)
@limiter.limit("60/minute")
async def get_deal(
    request: Request,
    deal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DealResponse:
    """Return the full detail for a single deal owned by the current user."""
    deal = _get_owned_deal(deal_id, current_user, db)

    # Backfill risk_score and risk_factors for deals with missing values
    if deal.inputs and deal.outputs:
        needs_score = deal.risk_score is None or deal.risk_score == 0
        needs_factors = deal.risk_factors is None
        if needs_score or needs_factors:
            try:
                risk_mod = importlib.import_module("core.calculators.risk_score")
                score = risk_mod.calculate_risk_score(
                    deal.strategy, deal.inputs, deal.outputs,
                )
                deal.risk_score = score
                deal.risk_factors = build_risk_factors(
                    deal.strategy, deal.inputs, deal.outputs, score,
                )
                db.commit()
                db.refresh(deal)
            except (ImportError, AttributeError):
                pass

    return DealResponse.model_validate(deal)


@router.put("/{deal_id}", response_model=DealResponse)
async def update_deal(
    deal_id: UUID,
    body: DealUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DealResponse:
    """Partially update a deal's fields (address, inputs, status, etc.)."""
    deal = _get_owned_deal(deal_id, current_user, db)

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(deal, field, value)

    # Recompute outputs + risk when inputs change
    if "inputs" in update_data and deal.inputs:
        try:
            calc_mod = importlib.import_module(
                f"core.calculators.{deal.strategy}",
            )
            calc_fn = getattr(calc_mod, f"calculate_{deal.strategy}")
            risk_mod = importlib.import_module(
                "core.calculators.risk_score",
            )
            risk_fn = risk_mod.calculate_risk_score

            deal.outputs = calc_fn(deal.inputs)
            deal.risk_score = risk_fn(
                deal.strategy, deal.inputs, deal.outputs,
            )
            deal.risk_factors = build_risk_factors(
                deal.strategy, deal.inputs, deal.outputs,
                deal.risk_score,
            )
        except (ImportError, AttributeError):
            pass  # calculator not available — keep existing values

    deal.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(deal)
    return DealResponse.model_validate(deal)


@router.delete("/{deal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deal(
    deal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Soft-delete a deal by setting deleted_at (never hard-deleted)."""
    deal = _get_owned_deal(deal_id, current_user, db)
    deal.deleted_at = datetime.utcnow()
    deal.updated_at = datetime.utcnow()
    db.commit()


@router.put("/{deal_id}/share/", response_model=ShareDealActionResponse)
async def share_deal(
    deal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ShareDealActionResponse:
    """Mark a deal as shared and return the share URL.

    Only the deal owner can share. Sets deal.status to 'shared'.
    The share URL uses the FRONTEND_URL environment variable.
    """
    deal = _get_owned_deal(deal_id, current_user, db)

    deal.status = "shared"
    deal.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(deal)

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    share_url = f"{frontend_url}/share/{deal.id}"

    return ShareDealActionResponse(
        id=deal.id,
        user_id=deal.user_id,
        team_id=deal.team_id,
        address=deal.address,
        zip_code=deal.zip_code,
        property_type=deal.property_type,
        strategy=deal.strategy,
        inputs=deal.inputs or {},
        outputs=deal.outputs or {},
        risk_score=deal.risk_score,
        status=deal.status,
        share_url=share_url,
        created_at=deal.created_at,
        updated_at=deal.updated_at,
    )


@router.get("/{deal_id}/share/", response_model=SharedDealResponse)
@limiter.limit("60/minute")
async def get_shared_deal(
    request: Request,
    deal_id: UUID,
    db: Session = Depends(get_db),
) -> SharedDealResponse:
    """Public endpoint — returns a shared deal without requiring authentication.

    Only deals with status 'shared' are accessible. Sensitive fields like
    user_id and team_id are excluded from the response.
    """
    deal = db.query(Deal).filter(
        Deal.id == deal_id,
        Deal.status == "shared",
        Deal.deleted_at.is_(None),
    ).first()

    if not deal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Shared deal not found", "code": "DEAL_NOT_FOUND"},
        )

    first_name = deal.user.name.split()[0] if deal.user and deal.user.name else "Unknown"
    label, value = _primary_metric(deal.strategy, deal.outputs or {})

    return SharedDealResponse(
        id=deal.id,
        address=deal.address,
        zip_code=deal.zip_code,
        property_type=deal.property_type,
        strategy=deal.strategy,
        inputs=deal.inputs or {},
        outputs=deal.outputs or {},
        risk_score=deal.risk_score,
        primary_metric_label=label,
        primary_metric_value=value,
        shared_by=SharedByInfo(name=first_name),
        created_at=deal.created_at,
    )


# ---------------------------------------------------------------------------
# Offer Letter Generation
# ---------------------------------------------------------------------------

logger = logging.getLogger(__name__)


@router.post(
    "/{deal_id}/offer-letter/",
    response_model=OfferLetterResponse,
)
@limiter.limit("5/minute")
async def generate_deal_offer_letter(
    request: Request,
    deal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _gate: None = Depends(require_feature("offer_letter")),
) -> OfferLetterResponse:
    """Generate a professional offer letter for a deal using Claude AI."""
    deal = _get_owned_deal(deal_id, current_user, db)

    try:
        from core.ai.offer_letter import generate_offer_letter

        letter_text = generate_offer_letter(deal)
    except Exception:
        logger.exception("Offer letter generation failed for deal %s", deal_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Failed to generate offer letter",
                "code": "GENERATION_FAILED",
            },
        )

    return OfferLetterResponse(
        deal_id=deal.id,
        address=deal.address,
        strategy=deal.strategy,
        offer_letter=letter_text,
        generated_at=datetime.utcnow(),
    )
