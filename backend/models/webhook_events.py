"""WebhookEvent model — idempotency log for incoming Stripe webhooks."""

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB

from database import Base
from models.base import TimestampMixin


class WebhookEvent(TimestampMixin, Base):
    """A recorded Stripe webhook event for idempotent processing."""

    __tablename__ = "webhook_events"

    stripe_event_id = Column(String, unique=True, nullable=False, index=True)
    event_type = Column(String, nullable=False, index=True)
    payload = Column(JSONB, nullable=False)
    processed = Column(Boolean, nullable=False, default=False, server_default="false")
    processed_at = Column(DateTime, nullable=True)
    error = Column(Text, nullable=True)
    retry_count = Column(Integer, nullable=False, default=0, server_default="0")
