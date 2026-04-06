"""Task model — action items attached to properties, deals, or contacts."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID

from database import Base
from models.base import TimestampMixin


class Task(TimestampMixin, Base):
    """An action item that can be linked to a property, deal, or contact."""

    __tablename__ = "tasks"

    team_id = Column(UUID(as_uuid=True), nullable=True)
    created_by = Column(UUID(as_uuid=True), nullable=False, index=True)
    assigned_to = Column(UUID(as_uuid=True), nullable=True)

    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="open", nullable=False)
    # open | due | snoozed | done | canceled
    priority = Column(String, default="normal", nullable=False)
    # low | normal | high | urgent
    due_date = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Polymorphic attachment
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=True)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id"), nullable=True)
    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id"), nullable=True)

    is_deleted = Column(Boolean, default=False, nullable=False)
