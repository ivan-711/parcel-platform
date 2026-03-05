"""Pydantic schemas for deal creation, updates, and responses."""

import uuid
from datetime import datetime
from typing import Annotated, Any, Literal, Optional, Union

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Strategy-specific input schemas
# ---------------------------------------------------------------------------

class DealInputsWholesale(BaseModel):
    """Inputs for a wholesale deal analysis."""

    arv: float
    repair_costs: float
    desired_profit: float
    holding_costs: float
    closing_costs_pct: float
    asking_price: float


class DealInputsCreativeFinance(BaseModel):
    """Inputs for a subject-to or seller-finance deal analysis."""

    existing_loan_balance: float
    existing_interest_rate: float
    monthly_piti: float
    monthly_rent_estimate: float
    monthly_expenses: float
    finance_type: Literal["subject_to", "seller_finance"]
    new_rate: float
    new_term_years: int
    arv: float


class DealInputsBRRRR(BaseModel):
    """Inputs for a BRRRR (Buy, Rehab, Rent, Refinance, Repeat) deal analysis."""

    purchase_price: float
    rehab_costs: float
    arv_post_rehab: float
    refinance_ltv_pct: float
    new_loan_rate: float
    new_loan_term_years: int
    monthly_rent: float
    monthly_expenses: float


class DealInputsBuyHold(BaseModel):
    """Inputs for a buy-and-hold rental property analysis."""

    purchase_price: float
    down_payment_pct: float
    interest_rate: float
    loan_term_years: int
    monthly_rent: float
    monthly_taxes: float
    monthly_insurance: float
    vacancy_rate_pct: float
    maintenance_pct: float
    mgmt_fee_pct: float


class DealInputsFlip(BaseModel):
    """Inputs for a fix-and-flip deal analysis."""

    purchase_price: float
    rehab_budget: float
    arv: float
    holding_months: int
    selling_costs_pct: float
    financing_costs: float


# ---------------------------------------------------------------------------
# Request schemas — discriminated union on strategy
# ---------------------------------------------------------------------------

class _DealCreateBase(BaseModel):
    address: str
    zip_code: str
    property_type: str


class WholesaleCreateRequest(_DealCreateBase):
    strategy: Literal["wholesale"]
    inputs: DealInputsWholesale


class CreativeFinanceCreateRequest(_DealCreateBase):
    strategy: Literal["creative_finance"]
    inputs: DealInputsCreativeFinance


class BRRRRCreateRequest(_DealCreateBase):
    strategy: Literal["brrrr"]
    inputs: DealInputsBRRRR


class BuyHoldCreateRequest(_DealCreateBase):
    strategy: Literal["buy_and_hold"]
    inputs: DealInputsBuyHold


class FlipCreateRequest(_DealCreateBase):
    strategy: Literal["flip"]
    inputs: DealInputsFlip


DealCreateRequest = Annotated[
    Union[
        WholesaleCreateRequest,
        CreativeFinanceCreateRequest,
        BRRRRCreateRequest,
        BuyHoldCreateRequest,
        FlipCreateRequest,
    ],
    Field(discriminator="strategy"),
]


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
    risk_factors: Optional[dict[str, Any]] = None
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


class SharedByInfo(BaseModel):
    """Minimal author info for the public share page — first name only."""

    name: str


class SharedDealResponse(BaseModel):
    """Public deal view returned by GET /deals/:id/share/ — no sensitive user data."""

    id: uuid.UUID
    address: str
    zip_code: str
    property_type: str
    strategy: str
    inputs: dict[str, Any]
    outputs: dict[str, Any]
    risk_score: Optional[int]
    primary_metric_label: Optional[str]
    primary_metric_value: Optional[float]
    shared_by: SharedByInfo
    created_at: datetime


class ShareDealActionResponse(BaseModel):
    """Response for PUT /deals/:id/share/ — full deal data plus the generated share URL."""

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
    share_url: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OfferLetterResponse(BaseModel):
    """Response for POST /deals/:id/offer-letter/ — AI-generated offer letter."""

    deal_id: uuid.UUID
    address: str
    strategy: str
    offer_letter: str
    generated_at: datetime
