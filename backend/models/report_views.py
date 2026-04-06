"""ReportView model — tracks engagement on shared reports."""

from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID

from database import Base
from models.base import TimestampMixin


class ReportView(TimestampMixin, Base):
    """A single view event on a shared report."""

    __tablename__ = "report_views"

    report_id = Column(
        UUID(as_uuid=True), ForeignKey("reports.id"), nullable=False, index=True
    )
    ip_hash = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    referrer = Column(String, nullable=True)
    sections_viewed = Column(JSONB, nullable=True)
    time_spent_seconds = Column(Integer, nullable=True)
