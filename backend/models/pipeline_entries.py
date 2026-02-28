"""PipelineEntry model — tracks a deal's position in the sales pipeline."""

from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin

PipelineStage = Enum(
    "lead", "analyzing", "offer_sent", "under_contract",
    "due_diligence", "closed", "dead",
    name="pipelinestage",
)


class PipelineEntry(TimestampMixin, Base):
    """Tracks a deal's current stage in the deal pipeline Kanban board."""

    __tablename__ = "pipeline_entries"

    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)
    stage = Column(PipelineStage, nullable=False)
    entered_stage_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    notes = Column(Text, nullable=True)

    # Relationships
    deal = relationship("Deal", back_populates="pipeline_entries")
    user = relationship("User", back_populates="pipeline_entries", foreign_keys=[user_id])
