"""Subscription model — tracks Stripe subscription state for billing."""

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin

SubscriptionStatus = Enum(
    "trialing", "active", "past_due", "canceled",
    "unpaid", "incomplete", "paused",
    name="subscriptionstatus",
)


class Subscription(TimestampMixin, Base):
    """A Stripe subscription tied to a Parcel user."""

    __tablename__ = "subscriptions"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    stripe_subscription_id = Column(String, unique=True, nullable=True, index=True)
    stripe_customer_id = Column(String, nullable=True, index=True)
    status = Column(SubscriptionStatus, nullable=False, server_default="active")
    plan_tier = Column(String(20), nullable=False, server_default="free")

    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    trial_start = Column(DateTime, nullable=True)
    trial_end = Column(DateTime, nullable=True)

    cancel_at_period_end = Column(Boolean, nullable=False, default=False, server_default="false")
    canceled_at = Column(DateTime, nullable=True)
    cancel_reason = Column(String, nullable=True)
    ended_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="subscriptions")
