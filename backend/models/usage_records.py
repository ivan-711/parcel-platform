"""UsageRecord model — tracks per-metric usage counts for billing enforcement."""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin


class UsageRecord(TimestampMixin, Base):
    """A single usage counter for a user/metric/period combination."""

    __tablename__ = "usage_records"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    metric = Column(String(50), nullable=False)  # "analyses", "ai_messages", "documents", "deals"
    period_start = Column(DateTime, nullable=False)
    count = Column(Integer, nullable=False, default=1, server_default="1")

    # Relationships
    user = relationship("User", back_populates="usage_records")
