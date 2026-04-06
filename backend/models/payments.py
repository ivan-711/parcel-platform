"""Payment model — tracks individual payments made or received on financing instruments."""

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin


class Payment(TimestampMixin, Base):
    """A payment record for a financing instrument."""

    __tablename__ = "payments"

    # Ownership
    instrument_id = Column(UUID(as_uuid=True), ForeignKey("financing_instruments.id"), nullable=False, index=True)
    obligation_id = Column(UUID(as_uuid=True), ForeignKey("obligations.id"), nullable=True, index=True)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)

    # Payment details
    payment_type = Column(String, nullable=False)
    # Types: regular, extra_principal, balloon, late_fee, insurance, tax, escrow

    amount = Column(Numeric(14, 2), nullable=False)
    principal_portion = Column(Numeric(14, 2), nullable=True)
    interest_portion = Column(Numeric(14, 2), nullable=True)
    escrow_portion = Column(Numeric(14, 2), nullable=True)

    # Tracking
    payment_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=True)
    is_late = Column(Boolean, default=False)
    late_fee_amount = Column(Numeric(10, 2), nullable=True)

    # Source
    payment_method = Column(String, nullable=True)  # bank_transfer, check, cash, auto_pay
    confirmation_number = Column(String, nullable=True)

    # Direction
    direction = Column(String, nullable=False, default="outgoing")
    # outgoing = you're paying (sub-to underlying, seller finance to seller)
    # incoming = you're collecting (wrap payment from buyer, rent from tenant)

    notes = Column(Text, nullable=True)

    # Soft delete
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    instrument = relationship("FinancingInstrument", back_populates="payments")
    obligation = relationship("Obligation")
    property = relationship("Property")
