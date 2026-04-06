"""Obligation model — recurring or one-time obligations tied to financing instruments."""

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin


class Obligation(TimestampMixin, Base):
    """A scheduled obligation (payment, balloon, insurance renewal, etc.)."""

    __tablename__ = "obligations"

    # Ownership
    instrument_id = Column(UUID(as_uuid=True), ForeignKey("financing_instruments.id"), nullable=False, index=True)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)

    # Obligation details
    obligation_type = Column(String, nullable=False)
    # Types: monthly_payment, balloon_payment, insurance_renewal, tax_payment,
    #        escrow_payment, option_expiration, rate_adjustment, annual_review,
    #        lease_renewal, prepayment_deadline

    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    # Amount
    amount = Column(Numeric(14, 2), nullable=True)
    amount_type = Column(String, nullable=True)  # fixed, calculated, variable

    # Schedule
    due_date = Column(Date, nullable=True)  # for one-time obligations
    recurrence = Column(String, nullable=True)  # monthly, quarterly, annually, one_time
    recurrence_day = Column(Integer, nullable=True)  # day of month (1-28)
    next_due = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)

    # Status
    status = Column(String, nullable=False, default="active")
    # Statuses: active, completed, overdue, snoozed, waived, expired

    # Alert settings — stored as JSON list e.g. [90, 60, 30, 7]
    alert_days_before = Column(JSONB, nullable=True)
    severity = Column(String, nullable=False, default="normal")
    # Severities: critical (balloon), high (insurance), normal (monthly payment), low (annual review)

    # Soft delete
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    instrument = relationship("FinancingInstrument", back_populates="obligations")
    property = relationship("Property")
