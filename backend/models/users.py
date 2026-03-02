"""User model — represents a registered Parcel user."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin

UserRole = Enum("wholesaler", "investor", "agent", name="userrole")


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

    # Relationships
    deals = relationship("Deal", back_populates="user", foreign_keys="Deal.user_id")
    team_memberships = relationship("TeamMember", back_populates="user", foreign_keys="TeamMember.user_id")
    pipeline_entries = relationship("PipelineEntry", back_populates="user", foreign_keys="PipelineEntry.user_id")
    documents = relationship("Document", back_populates="user", foreign_keys="Document.user_id")
    chat_messages = relationship("ChatMessage", back_populates="user")
    portfolio_entries = relationship("PortfolioEntry", back_populates="user", foreign_keys="PortfolioEntry.user_id")
