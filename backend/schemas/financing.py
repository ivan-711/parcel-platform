"""Pydantic schemas for financing instruments, obligations, and payments."""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# FinancingInstrument
# ---------------------------------------------------------------------------

class CreateFinancingInstrumentRequest(BaseModel):
    property_id: UUID
    deal_id: Optional[UUID] = None
    name: str = Field(..., min_length=1, max_length=200)
    instrument_type: str
    position: int = 1
    status: str = "active"

    # Core terms
    original_balance: Optional[Decimal] = None
    current_balance: Optional[Decimal] = None
    interest_rate: Optional[Decimal] = None
    rate_type: Optional[str] = None
    term_months: Optional[int] = None
    amortization_months: Optional[int] = None
    monthly_payment: Optional[Decimal] = None

    # Dates
    origination_date: Optional[date] = None
    maturity_date: Optional[date] = None
    first_payment_date: Optional[date] = None

    # Balloon
    has_balloon: bool = False
    balloon_date: Optional[date] = None
    balloon_amount: Optional[Decimal] = None

    # Sub-to
    is_sub_to: bool = False
    original_borrower: Optional[str] = None
    servicer: Optional[str] = None
    loan_number_last4: Optional[str] = Field(None, max_length=4)
    due_on_sale_risk: Optional[str] = None

    # Wrap
    is_wrap: bool = False
    underlying_instrument_id: Optional[UUID] = None
    wrap_rate: Optional[Decimal] = None
    wrap_payment: Optional[Decimal] = None

    # Lease option
    option_consideration: Optional[Decimal] = None
    option_expiration: Optional[date] = None
    monthly_credit: Optional[Decimal] = None
    strike_price: Optional[Decimal] = None

    # Seller finance
    down_payment: Optional[Decimal] = None
    late_fee_pct: Optional[Decimal] = None
    late_fee_grace_days: Optional[int] = None
    prepayment_penalty: bool = False

    # Insurance/escrow
    requires_insurance: bool = True
    insurance_verified_date: Optional[date] = None
    escrow_amount: Optional[Decimal] = None

    # Extended
    terms_extended: Optional[dict] = None
    notes: Optional[str] = None


class UpdateFinancingInstrumentRequest(BaseModel):
    name: Optional[str] = None
    instrument_type: Optional[str] = None
    position: Optional[int] = None
    status: Optional[str] = None
    original_balance: Optional[Decimal] = None
    current_balance: Optional[Decimal] = None
    interest_rate: Optional[Decimal] = None
    rate_type: Optional[str] = None
    term_months: Optional[int] = None
    amortization_months: Optional[int] = None
    monthly_payment: Optional[Decimal] = None
    origination_date: Optional[date] = None
    maturity_date: Optional[date] = None
    first_payment_date: Optional[date] = None
    has_balloon: Optional[bool] = None
    balloon_date: Optional[date] = None
    balloon_amount: Optional[Decimal] = None
    is_sub_to: Optional[bool] = None
    original_borrower: Optional[str] = None
    servicer: Optional[str] = None
    loan_number_last4: Optional[str] = Field(None, max_length=4)
    due_on_sale_risk: Optional[str] = None
    is_wrap: Optional[bool] = None
    underlying_instrument_id: Optional[UUID] = None
    wrap_rate: Optional[Decimal] = None
    wrap_payment: Optional[Decimal] = None
    option_consideration: Optional[Decimal] = None
    option_expiration: Optional[date] = None
    monthly_credit: Optional[Decimal] = None
    strike_price: Optional[Decimal] = None
    down_payment: Optional[Decimal] = None
    late_fee_pct: Optional[Decimal] = None
    late_fee_grace_days: Optional[int] = None
    prepayment_penalty: Optional[bool] = None
    requires_insurance: Optional[bool] = None
    insurance_verified_date: Optional[date] = None
    escrow_amount: Optional[Decimal] = None
    terms_extended: Optional[dict] = None
    notes: Optional[str] = None


class FinancingInstrumentResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    property_id: UUID
    deal_id: Optional[UUID] = None
    created_by: UUID
    team_id: Optional[UUID] = None
    name: str
    instrument_type: str
    position: int
    status: str
    original_balance: Optional[Decimal] = None
    current_balance: Optional[Decimal] = None
    interest_rate: Optional[Decimal] = None
    rate_type: Optional[str] = None
    term_months: Optional[int] = None
    amortization_months: Optional[int] = None
    monthly_payment: Optional[Decimal] = None
    origination_date: Optional[date] = None
    maturity_date: Optional[date] = None
    first_payment_date: Optional[date] = None
    has_balloon: bool
    balloon_date: Optional[date] = None
    balloon_amount: Optional[Decimal] = None
    is_sub_to: bool
    original_borrower: Optional[str] = None
    servicer: Optional[str] = None
    loan_number_last4: Optional[str] = None
    due_on_sale_risk: Optional[str] = None
    is_wrap: bool
    underlying_instrument_id: Optional[UUID] = None
    wrap_rate: Optional[Decimal] = None
    wrap_payment: Optional[Decimal] = None
    option_consideration: Optional[Decimal] = None
    option_expiration: Optional[date] = None
    monthly_credit: Optional[Decimal] = None
    strike_price: Optional[Decimal] = None
    down_payment: Optional[Decimal] = None
    late_fee_pct: Optional[Decimal] = None
    late_fee_grace_days: Optional[int] = None
    prepayment_penalty: bool
    requires_insurance: bool
    insurance_verified_date: Optional[date] = None
    escrow_amount: Optional[Decimal] = None
    terms_extended: Optional[dict] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class InstrumentSummary(BaseModel):
    """Compact instrument view for lists."""
    model_config = {"from_attributes": True}

    id: UUID
    name: str
    instrument_type: str
    current_balance: Optional[Decimal] = None
    interest_rate: Optional[Decimal] = None
    monthly_payment: Optional[Decimal] = None
    status: str


# ---------------------------------------------------------------------------
# Obligation
# ---------------------------------------------------------------------------

class CreateObligationRequest(BaseModel):
    instrument_id: UUID
    property_id: UUID
    obligation_type: str
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    amount: Optional[Decimal] = None
    amount_type: Optional[str] = None
    due_date: Optional[date] = None
    recurrence: Optional[str] = None
    recurrence_day: Optional[int] = Field(None, ge=1, le=28)
    next_due: Optional[date] = None
    end_date: Optional[date] = None
    status: str = "active"
    alert_days_before: Optional[list[int]] = None
    severity: str = "normal"


class ObligationResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    instrument_id: UUID
    property_id: UUID
    created_by: UUID
    team_id: Optional[UUID] = None
    obligation_type: str
    title: str
    description: Optional[str] = None
    amount: Optional[Decimal] = None
    amount_type: Optional[str] = None
    due_date: Optional[date] = None
    recurrence: Optional[str] = None
    recurrence_day: Optional[int] = None
    next_due: Optional[date] = None
    end_date: Optional[date] = None
    status: str
    alert_days_before: Optional[list[int]] = None
    severity: str
    created_at: datetime
    updated_at: datetime

    @property
    def days_until_due(self) -> Optional[int]:
        if self.next_due:
            return (self.next_due - date.today()).days
        return None


class ObligationAlert(BaseModel):
    """Obligation surfaced in Today briefing."""
    id: UUID
    title: str
    due_date: Optional[date] = None
    days_until_due: Optional[int] = None
    severity: str
    instrument_name: str
    property_address: str


# ---------------------------------------------------------------------------
# Payment
# ---------------------------------------------------------------------------

class CreatePaymentRequest(BaseModel):
    instrument_id: UUID
    obligation_id: Optional[UUID] = None
    property_id: UUID
    payment_type: str
    amount: Decimal = Field(..., gt=0)
    principal_portion: Optional[Decimal] = Field(None, ge=0)
    interest_portion: Optional[Decimal] = Field(None, ge=0)
    escrow_portion: Optional[Decimal] = None
    payment_date: date
    due_date: Optional[date] = None
    is_late: bool = False
    late_fee_amount: Optional[Decimal] = None
    payment_method: Optional[str] = None
    confirmation_number: Optional[str] = None
    direction: str = "outgoing"
    notes: Optional[str] = None


class PaymentResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    instrument_id: UUID
    obligation_id: Optional[UUID] = None
    property_id: UUID
    created_by: UUID
    team_id: Optional[UUID] = None
    payment_type: str
    amount: Decimal
    principal_portion: Optional[Decimal] = None
    interest_portion: Optional[Decimal] = None
    escrow_portion: Optional[Decimal] = None
    payment_date: date
    due_date: Optional[date] = None
    is_late: bool
    late_fee_amount: Optional[Decimal] = None
    payment_method: Optional[str] = None
    confirmation_number: Optional[str] = None
    direction: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Wrap Spread
# ---------------------------------------------------------------------------

class WrapSpreadSummary(BaseModel):
    """Spread between wrap collections and underlying payments."""
    monthly_incoming: float
    monthly_outgoing: float
    monthly_spread: float
    annual_spread: float
    spread_margin_pct: float
    underlying_rate: float
    wrap_rate: float
    rate_spread: float


# ---------------------------------------------------------------------------
# Amortization
# ---------------------------------------------------------------------------

class AmortizationEntry(BaseModel):
    month: int
    payment_date: Optional[date] = Field(None, alias="date")
    payment: float
    principal: float
    interest: float
    balance: float

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# Instrument — list & detail views
# ---------------------------------------------------------------------------

class InstrumentListItem(FinancingInstrumentResponse):
    months_remaining: Optional[int] = None
    next_payment_due: Optional[date] = None
    payoff_amount_estimate: Optional[float] = None
    wrap_spread: Optional[WrapSpreadSummary] = None


class InstrumentDetailResponse(FinancingInstrumentResponse):
    obligations: list[ObligationResponse] = []
    recent_payments: list[PaymentResponse] = []
    wrap_spread: Optional[WrapSpreadSummary] = None
    amortization_schedule: list[AmortizationEntry] = []


class PaginatedInstruments(BaseModel):
    items: list[InstrumentListItem]
    total: int
    page: int
    per_page: int
    pages: int


# ---------------------------------------------------------------------------
# Obligation — computed, grouped, update, complete
# ---------------------------------------------------------------------------

class ObligationWithComputed(BaseModel):
    """Obligation with computed display fields (avoids @property shadow from parent)."""
    model_config = {"from_attributes": True}

    id: UUID
    instrument_id: UUID
    property_id: UUID
    created_by: UUID
    team_id: Optional[UUID] = None
    obligation_type: str
    title: str
    description: Optional[str] = None
    amount: Optional[Decimal] = None
    amount_type: Optional[str] = None
    due_date: Optional[date] = None
    recurrence: Optional[str] = None
    recurrence_day: Optional[int] = None
    next_due: Optional[date] = None
    end_date: Optional[date] = None
    status: str
    alert_days_before: Optional[list[int]] = None
    severity: str
    created_at: datetime
    updated_at: datetime
    # Computed
    days_until_due: Optional[int] = None
    is_overdue: bool = False
    instrument_name: Optional[str] = None
    property_address: Optional[str] = None


class PaginatedObligations(BaseModel):
    items: list[ObligationWithComputed]
    total: int
    page: int
    per_page: int
    pages: int


class ObligationGrouped(BaseModel):
    critical: list[ObligationWithComputed] = []
    high: list[ObligationWithComputed] = []
    normal: list[ObligationWithComputed] = []


class UpdateObligationRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[Decimal] = None
    next_due: Optional[date] = None
    status: Optional[str] = None
    severity: Optional[str] = None
    alert_days_before: Optional[list[int]] = None


class ObligationCompleteRequest(BaseModel):
    payment_amount: Optional[Decimal] = None
    payment_date: Optional[date] = None
    payment_method: Optional[str] = None


# ---------------------------------------------------------------------------
# Payment — paginated, summary
# ---------------------------------------------------------------------------

class PaginatedPayments(BaseModel):
    items: list[PaymentResponse]
    total: int
    page: int
    per_page: int
    pages: int


class PropertyPaymentSummary(BaseModel):
    property_id: UUID
    address: str
    total: float


class MonthlyHistory(BaseModel):
    month: str
    incoming: float
    outgoing: float
    net: float


class PaymentSummaryResponse(BaseModel):
    total_outgoing_monthly: float
    total_incoming_monthly: float
    net_monthly: float
    outgoing_by_property: list[PropertyPaymentSummary] = []
    incoming_by_property: list[PropertyPaymentSummary] = []
    payment_history: list[MonthlyHistory] = []


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

class BalloonAlert(BaseModel):
    instrument_name: str
    property_address: str
    balloon_date: Optional[date] = None
    balloon_amount: Optional[Decimal] = None
    days_until: Optional[int] = None


class WrapSpreadItem(BaseModel):
    property_address: str
    monthly_spread: float
    annual_spread: float


class DueOnSaleRiskItem(BaseModel):
    property_address: str
    instrument_name: str
    risk_level: str


class FinancingDashboardResponse(BaseModel):
    total_instruments: int = 0
    total_balance: float = 0
    total_monthly_obligations: float = 0
    total_monthly_income: float = 0
    net_monthly_cash_flow: float = 0
    upcoming_balloons: list[BalloonAlert] = []
    wrap_spreads: list[WrapSpreadItem] = []
    due_on_sale_risks: list[DueOnSaleRiskItem] = []
