"""Deals router — CRUD for deal analyses plus a public share endpoint."""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from core.security.jwt import get_current_user
from database import get_db
from models.deals import Deal
from models.users import User
from schemas.deals import DealCreateRequest, DealListItem, DealResponse, DealUpdateRequest

router = APIRouter(prefix="/deals", tags=["deals"])

# ---------------------------------------------------------------------------
# Primary metric extraction
# ---------------------------------------------------------------------------

_METRIC_MAP: dict[str, tuple[str, str]] = {
    "wholesale": ("Profit", "profit"),
    "creative_finance": ("Monthly Cash Flow", "monthly_cash_flow"),
    "brrrr": ("Cash-on-Cash Return", "cash_on_cash"),
    "buy_and_hold": ("Cash-on-Cash Return", "cash_on_cash"),
    "flip": ("Net Profit", "net_profit"),
}


def _primary_metric(strategy: str, outputs: dict[str, Any]) -> tuple[Optional[str], Optional[float]]:
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
async def create_deal(
    body: DealCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DealResponse:
    """Create a new deal analysis.

    Stores the provided calculator inputs as JSONB; outputs default to {}.
    The calculator will populate outputs separately (written by Ivan).
    """
    deal = Deal(
        user_id=current_user.id,
        team_id=current_user.team_id,
        address=body.address,
        zip_code=body.zip_code,
        property_type=body.property_type,
        strategy=body.strategy,
        inputs=body.inputs,
        outputs={},
        status="draft",
    )
    db.add(deal)
    db.commit()
    db.refresh(deal)
    return DealResponse.model_validate(deal)


@router.get("/", response_model=list[DealListItem])
async def list_deals(
    strategy: Optional[str] = Query(None),
    deal_status: Optional[str] = Query(None, alias="status"),
    zip_code: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort: str = Query("created_at_desc"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[DealListItem]:
    """List deals owned by the current user, with optional filtering and pagination."""
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
async def get_deal(
    deal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DealResponse:
    """Return the full detail for a single deal owned by the current user."""
    deal = _get_owned_deal(deal_id, current_user, db)
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


@router.get("/{deal_id}/share", response_model=DealResponse)
async def get_shared_deal(
    deal_id: UUID,
    db: Session = Depends(get_db),
) -> DealResponse:
    """Public endpoint — returns a deal's details without requiring authentication.

    Only deals with status 'shared' are accessible here.
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

    return DealResponse.model_validate(deal)
