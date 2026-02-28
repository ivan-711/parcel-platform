"""Pydantic schemas for deal creation, updates, and responses."""

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Strategy-specific input schemas (for documentation / validation reference)
# ---------------------------------------------------------------------------

class DealInputsWholesale(BaseModel):
    """Inputs for a wholesale deal analysis."""

    asking_price: float
    arv: float
    repair_cost: float
    assignment_fee: float
    closing_costs: float


class DealInputsCreativeFinance(BaseModel):
    """Inputs for a subject-to or seller-finance deal analysis."""

    asking_price: float
    existing_loan_balance: float
    interest_rate: float
    monthly_payment: float
    rent_estimate: float
    vacancy_rate: float
    operating_expenses: float


class DealInputsBRRRR(BaseModel):
    """Inputs for a BRRRR (Buy, Rehab, Rent, Refinance, Repeat) deal analysis."""

    purchase_price: float
    repair_cost: float
    arv: float
    refinance_ltv: float
    interest_rate: float
    loan_term_years: int
    rent_estimate: float
    vacancy_rate: float
    operating_expenses: float
    closing_costs: float


class DealInputsBuyHold(BaseModel):
    """Inputs for a buy-and-hold rental property analysis."""

    purchase_price: float
    down_payment_pct: float
    interest_rate: float
    loan_term_years: int
    rent_estimate: float
    vacancy_rate: float
    operating_expenses: float
    closing_costs: float
    annual_appreciation: float


class DealInputsFlip(BaseModel):
    """Inputs for a fix-and-flip deal analysis."""

    purchase_price: float
    repair_cost: float
    arv: float
    holding_months: int
    financing_rate: float
    closing_costs_buy: float
    closing_costs_sell: float
    carrying_costs_monthly: float


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class DealCreateRequest(BaseModel):
    """Request body for POST /deals — creates a new deal analysis."""

    address: str
    zip_code: str
    property_type: str
    strategy: str
    inputs: dict[str, Any]


class DealUpdateRequest(BaseModel):
    """Request body for PUT /deals/:id — partial update of any deal fields."""

    address: Optional[str] = None
    zip_code: Optional[str] = None
    property_type: Optional[str] = None
    strategy: Optional[str] = None
    inputs: Optional[dict[str, Any]] = None
    status: Optional[str] = None


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class DealResponse(BaseModel):
    """Full deal object returned for GET /deals/:id and POST /deals."""

    id: uuid.UUID
    user_id: uuid.UUID
    team_id: Optional[uuid.UUID]
    address: str
    zip_code: str
    property_type: str
    strategy: str
    inputs: dict[str, Any]
    outputs: dict[str, Any]
    risk_score: Optional[int]
    status: str
    deleted_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DealListItem(BaseModel):
    """Compact deal summary used in GET /deals list responses."""

    id: uuid.UUID
    address: str
    zip_code: str
    strategy: str
    primary_metric_label: Optional[str]
    primary_metric_value: Optional[float]
    risk_score: Optional[int]
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
