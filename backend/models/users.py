"""User model — represents a registered Parcel user."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin

UserRole = Enum("wholesaler", "investor", "agent", name="userrole")
PlanTier = Enum("free", "starter", "pro", "team", name="plantier")


class User(TimestampMixin, Base):
    """A registered user of the Parcel platform."""

    __tablename__ = "users"

    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(UserRole, nullable=False, default="investor")
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)
    email_notifications = Column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    stripe_customer_id = Column(String, unique=True, nullable=True, index=True)
    plan_tier = Column(PlanTier, nullable=False, default="free", server_default="free")
    trial_ends_at = Column(DateTime, nullable=True)

    # Relationships
    deals = relationship("Deal", back_populates="user", foreign_keys="Deal.user_id")
    team_memberships = relationship("TeamMember", back_populates="user", foreign_keys="TeamMember.user_id")
    pipeline_entries = relationship("PipelineEntry", back_populates="user", foreign_keys="PipelineEntry.user_id")
    documents = relationship("Document", back_populates="user", foreign_keys="Document.user_id")
    chat_messages = relationship("ChatMessage", back_populates="user")
    portfolio_entries = relationship("PortfolioEntry", back_populates="user", foreign_keys="PortfolioEntry.user_id")
    subscriptions = relationship("Subscription", back_populates="user", foreign_keys="Subscription.user_id")
    usage_records = relationship("UsageRecord", back_populates="user", foreign_keys="UsageRecord.user_id")
