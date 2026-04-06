"""DataSourceEvent model — provenance tracking for external data fetches."""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func

from database import Base
from models.base import TimestampMixin


class DataSourceEvent(TimestampMixin, Base):
    """Records each external data fetch for audit trail and cost tracking."""

    __tablename__ = "data_source_events"

    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False, index=True)
    provider = Column(String, nullable=False)
    # bricked | rentcast | parcl_labs | manual

    request_type = Column(String, nullable=False)
    # comps | property_details | rent_estimate | arv
    response_status = Column(String, nullable=False)
    # success | partial | failed | timeout
    response_data = Column(JSONB, nullable=True)  # raw response cached

    fields_populated = Column(JSONB, nullable=True)  # which fields this event filled
    confidence_scores = Column(JSONB, nullable=True)  # {field: confidence}

    latency_ms = Column(Integer, nullable=True)
    cost_cents = Column(Integer, nullable=True)  # track API costs per call

    fetched_at = Column(DateTime, server_default=func.now(), nullable=False)
