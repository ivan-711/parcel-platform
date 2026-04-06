"""Transaction model — financial records tied to properties."""

from sqlalchemy import Boolean, Column, Date, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID

from database import Base
from models.base import TimestampMixin


class Transaction(TimestampMixin, Base):
    """A financial transaction linked to a property and optionally a deal."""

    __tablename__ = "transactions"

    team_id = Column(UUID(as_uuid=True), nullable=True)
    created_by = Column(UUID(as_uuid=True), nullable=False, index=True)

    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id"), nullable=True)

    transaction_type = Column(String, nullable=False)
    # purchase | sale | rent_income | expense | rehab_draw | assignment_fee
    # mortgage_payment | insurance | tax | hoa | utility | other

    amount = Column(Numeric(12, 2), nullable=False)  # positive = income, negative = expense
    description = Column(String, nullable=True)
    occurred_at = Column(Date, nullable=False)

    category = Column(String, nullable=True)  # for grouping in reports
    vendor = Column(String, nullable=True)

    is_deleted = Column(Boolean, default=False, nullable=False)
