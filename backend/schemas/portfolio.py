"""Pydantic schemas for portfolio entries and summary analytics."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class PortfolioCreateRequest(BaseModel):
    """Request body for adding a closed deal to the portfolio."""

    deal_id: uuid.UUID
    closed_date: date
    closed_price: Decimal
    profit: Decimal
    monthly_cash_flow: Optional[Decimal] = None
    notes: Optional[str] = None


class UpdatePortfolioEntryRequest(BaseModel):
    """Request body for updating an existing portfolio entry."""

    closed_date: date
    closed_price: Decimal
    profit: Decimal
    monthly_cash_flow: Optional[Decimal] = None
    notes: Optional[str] = None


class PortfolioEntryResponse(BaseModel):
    """A single portfolio entry with deal context."""

    id: uuid.UUID
    deal_id: uuid.UUID
    address: str
    strategy: str
    closed_date: date
    closed_price: Decimal
    profit: Decimal
    monthly_cash_flow: Optional[Decimal]
    notes: Optional[str]

    model_config = {"from_attributes": True}


class PortfolioSummary(BaseModel):
    """Aggregate metrics across all portfolio entries."""

    total_equity: Decimal
    total_monthly_cash_flow: Decimal
    total_deals_closed: int
    avg_annualized_return: Optional[float]
    total_profit: Decimal


class PortfolioResponse(BaseModel):
    """Full portfolio response with summary and individual entries."""

    summary: PortfolioSummary
    entries: list[PortfolioEntryResponse]
