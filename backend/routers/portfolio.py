"""Portfolio router — track closed deals and aggregate performance metrics."""

from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.security.jwt import get_current_user
from database import get_db
from models.deals import Deal
from models.portfolio_entries import PortfolioEntry
from models.users import User
from schemas.portfolio import (
    PortfolioCreateRequest,
    PortfolioEntryResponse,
    PortfolioResponse,
    PortfolioSummary,
)

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


@router.get("/", response_model=PortfolioResponse)
async def get_portfolio(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PortfolioResponse:
    """Return portfolio summary metrics and all entries for the current user.

    Entries are ordered by closed_date descending (most recent first).
    Summary aggregates are computed from the returned entries.
    """
    rows = (
        db.query(PortfolioEntry, Deal)
        .join(Deal, PortfolioEntry.deal_id == Deal.id)
        .filter(
            PortfolioEntry.user_id == current_user.id,
            Deal.deleted_at.is_(None),
        )
        .order_by(PortfolioEntry.closed_date.desc())
        .all()
    )

    entries = [
        PortfolioEntryResponse(
            id=entry.id,
            deal_id=entry.deal_id,
            address=deal.address,
            strategy=deal.strategy,
            closed_date=entry.closed_date,
            closed_price=entry.closed_price,
            profit=entry.profit,
            monthly_cash_flow=entry.monthly_cash_flow,
            notes=entry.notes,
        )
        for entry, deal in rows
    ]

    total_equity = sum((e.closed_price for e in entries), Decimal(0))
    total_cash_flow = sum((e.monthly_cash_flow or Decimal(0) for e in entries), Decimal(0))
    total_profit = sum((e.profit for e in entries), Decimal(0))

    summary = PortfolioSummary(
        total_equity=total_equity,
        total_monthly_cash_flow=total_cash_flow,
        total_deals_closed=len(entries),
        avg_annualized_return=None,
        total_profit=total_profit,
    )

    return PortfolioResponse(summary=summary, entries=entries)


@router.post("/", response_model=PortfolioEntryResponse, status_code=status.HTTP_201_CREATED)
async def add_portfolio_entry(
    body: PortfolioCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PortfolioEntryResponse:
    """Add a closed deal to the portfolio.

    Validates that the deal exists and belongs to the current user before
    creating the portfolio entry.
    """
    deal = db.query(Deal).filter(
        Deal.id == body.deal_id,
        Deal.user_id == current_user.id,
        Deal.deleted_at.is_(None),
    ).first()
    if not deal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Deal not found", "code": "DEAL_NOT_FOUND"},
        )

    entry = PortfolioEntry(
        deal_id=deal.id,
        user_id=current_user.id,
        team_id=current_user.team_id,
        closed_date=body.closed_date,
        closed_price=body.closed_price,
        profit=body.profit,
        monthly_cash_flow=body.monthly_cash_flow,
        notes=body.notes,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    return PortfolioEntryResponse(
        id=entry.id,
        deal_id=entry.deal_id,
        address=deal.address,
        strategy=deal.strategy,
        closed_date=entry.closed_date,
        closed_price=entry.closed_price,
        profit=entry.profit,
        monthly_cash_flow=entry.monthly_cash_flow,
        notes=entry.notes,
    )
