"""FinancingInstrument model — tracks stacked financing on a property."""

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin


class FinancingInstrument(TimestampMixin, Base):
    """A financing instrument attached to a property (mortgage, wrap, lease option, etc.)."""

    __tablename__ = "financing_instruments"

    # Ownership
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False, index=True)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id"), nullable=True, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)

    # Instrument identity
    name = Column(String, nullable=False)
    instrument_type = Column(String, nullable=False)
    # Types: conventional_mortgage, sub_to_mortgage, seller_finance, wrap_mortgage,
    #        lease_option, hard_money, private_money, heloc, land_contract
    position = Column(Integer, nullable=False, default=1)
    status = Column(String, nullable=False, default="active")
    # Statuses: active, paid_off, defaulted, refinanced, assumed, expired

    # Core terms
    original_balance = Column(Numeric(14, 2), nullable=True)
    current_balance = Column(Numeric(14, 2), nullable=True)
    interest_rate = Column(Numeric(6, 4), nullable=True)
    rate_type = Column(String, nullable=True)  # fixed, adjustable, interest_only, graduated
    term_months = Column(Integer, nullable=True)
    amortization_months = Column(Integer, nullable=True)
    monthly_payment = Column(Numeric(10, 2), nullable=True)

    # Dates
    origination_date = Column(Date, nullable=True)
    maturity_date = Column(Date, nullable=True)
    first_payment_date = Column(Date, nullable=True)

    # Balloon
    has_balloon = Column(Boolean, default=False)
    balloon_date = Column(Date, nullable=True)
    balloon_amount = Column(Numeric(14, 2), nullable=True)

    # Sub-to specific
    is_sub_to = Column(Boolean, default=False)
    original_borrower = Column(String, nullable=True)
    servicer = Column(String, nullable=True)
    loan_number_last4 = Column(String(4), nullable=True)
    due_on_sale_risk = Column(String, nullable=True)  # low, medium, high

    # Wrap specific
    is_wrap = Column(Boolean, default=False)
    underlying_instrument_id = Column(
        UUID(as_uuid=True), ForeignKey("financing_instruments.id"), nullable=True
    )
    wrap_rate = Column(Numeric(6, 4), nullable=True)
    wrap_payment = Column(Numeric(10, 2), nullable=True)

    # Lease option specific
    option_consideration = Column(Numeric(10, 2), nullable=True)
    option_expiration = Column(Date, nullable=True)
    monthly_credit = Column(Numeric(10, 2), nullable=True)
    strike_price = Column(Numeric(14, 2), nullable=True)

    # Seller finance specific
    down_payment = Column(Numeric(14, 2), nullable=True)
    late_fee_pct = Column(Numeric(5, 2), nullable=True)
    late_fee_grace_days = Column(Integer, nullable=True)
    prepayment_penalty = Column(Boolean, default=False)

    # Insurance/escrow
    requires_insurance = Column(Boolean, default=True)
    insurance_verified_date = Column(Date, nullable=True)
    escrow_amount = Column(Numeric(10, 2), nullable=True)

    # Extended data
    terms_extended = Column(JSONB, nullable=True)
    notes = Column(Text, nullable=True)

    # Soft delete
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    property = relationship("Property", back_populates="financing_instruments")
    deal = relationship("Deal", back_populates="financing_instruments")
    underlying_instrument = relationship(
        "FinancingInstrument",
        remote_side="FinancingInstrument.id",
        foreign_keys=[underlying_instrument_id],
    )
    obligations = relationship("Obligation", back_populates="instrument", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="instrument", cascade="all, delete-orphan")
