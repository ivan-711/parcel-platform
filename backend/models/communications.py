"""Communication model — passive log of calls, emails, meetings, notes + real message delivery."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from database import Base
from models.base import TimestampMixin


class Communication(TimestampMixin, Base):
    """A record of communication — call, sms, email, meeting, or note."""

    __tablename__ = "communications"

    team_id = Column(UUID(as_uuid=True), nullable=True)
    created_by = Column(UUID(as_uuid=True), nullable=False, index=True)

    channel = Column(String, nullable=False)
    # call | sms | email | meeting | note
    direction = Column(String, nullable=True)
    # inbound | outbound | null for notes
    subject = Column(String, nullable=True)
    body = Column(Text, nullable=True)

    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id"), nullable=True)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id"), nullable=True)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=True)

    occurred_at = Column(DateTime, nullable=False)

    is_deleted = Column(Boolean, default=False, nullable=False)

    # --- Delivery tracking (Wave 4) ---
    external_id = Column(String, nullable=True, index=True)  # Twilio MessageSid or SendGrid message ID
    status = Column(String, default="logged", nullable=False)
    # logged | queued | sent | delivered | failed | bounced | opened | clicked
    status_updated_at = Column(DateTime, nullable=True)
    error_message = Column(String, nullable=True)
    cost_cents = Column(Integer, nullable=True)  # SMS cost in cents
    delivery_metadata = Column("metadata", JSONB, nullable=True)  # delivery details, open/click tracking
