"""SkipTrace model — owner lookup results attached to properties or contacts."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin


class SkipTrace(TimestampMixin, Base):
    """Result of a skip-trace lookup for an owner or lead."""

    __tablename__ = "skip_traces"

    # Core FKs
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=True, index=True)
    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id"), nullable=True, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    team_id = Column(UUID(as_uuid=True), nullable=True)

    # Input fields
    input_address = Column(String, nullable=True)
    input_name = Column(String, nullable=True)
    input_city = Column(String, nullable=True)
    input_state = Column(String, nullable=True)
    input_zip = Column(String, nullable=True)

    # Status — pending | processing | found | not_found | failed
    status = Column(String, nullable=False, default="pending")

    # Owner identity
    owner_first_name = Column(String, nullable=True)
    owner_last_name = Column(String, nullable=True)

    # Contact data (JSONB arrays/objects)
    phones = Column(JSONB, nullable=True)          # [{number, type, is_primary}]
    emails = Column(JSONB, nullable=True)          # [{email, is_primary}]
    mailing_address = Column(JSONB, nullable=True) # {line1, city, state, zip}

    # Classification
    is_absentee_owner = Column(Boolean, nullable=True)

    # Extended data
    demographics = Column(JSONB, nullable=True)
    raw_response = Column(JSONB, nullable=True)

    # Billing
    cost_cents = Column(Integer, nullable=True)

    # Timestamps / grouping
    traced_at = Column(DateTime, nullable=True)
    batch_id = Column(String, nullable=True, index=True)  # groups batch traces
    deleted_at = Column(DateTime, nullable=True)
    compliance_acknowledged_at = Column(DateTime, nullable=True)

    # Relationships
    property = relationship("Property", foreign_keys=[property_id])
    contact = relationship("Contact", foreign_keys=[contact_id])
