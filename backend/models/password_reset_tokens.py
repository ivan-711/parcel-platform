"""PasswordResetToken model — stores secure tokens for password reset flow."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID

from database import Base
from models.base import TimestampMixin


class PasswordResetToken(TimestampMixin, Base):
    """A one-time-use token for resetting a user's password."""

    __tablename__ = "password_reset_tokens"

    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    token_hash = Column(String, nullable=False, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
