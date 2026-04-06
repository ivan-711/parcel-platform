"""Report model — generated analysis reports for properties and deals."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID

from database import Base
from models.base import TimestampMixin


class Report(TimestampMixin, Base):
    """A generated report — analysis, portfolio snapshot, buyer packet, etc."""

    __tablename__ = "reports"

    team_id = Column(UUID(as_uuid=True), nullable=True)
    created_by = Column(UUID(as_uuid=True), nullable=False, index=True)

    title = Column(String, nullable=False)
    report_type = Column(String, nullable=False)
    # analysis | portfolio_snapshot | obligation_summary | rehab_summary | buyer_packet

    # Source links
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=True)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id"), nullable=True)
    scenario_id = Column(UUID(as_uuid=True), ForeignKey("analysis_scenarios.id"), nullable=True)

    # Frozen data snapshot — report content at creation time
    report_data = Column(JSONB, nullable=True)

    # Audience and branding
    audience = Column(String, nullable=True)  # internal | client | lender | partner
    brand_logo_url = Column(String, nullable=True)
    brand_colors = Column(JSONB, nullable=True)

    # Share state
    share_token = Column(String, unique=True, nullable=True)
    is_public = Column(Boolean, default=False, nullable=False)

    # Engagement tracking
    view_count = Column(Integer, default=0, nullable=False)
    last_viewed_at = Column(DateTime, nullable=True)

    # PDF cache
    pdf_s3_key = Column(String, nullable=True)
    pdf_generated_at = Column(DateTime, nullable=True)

    is_deleted = Column(Boolean, default=False, nullable=False)
