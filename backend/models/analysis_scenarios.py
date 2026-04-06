"""AnalysisScenario model — an immutable strategy snapshot tied to a property."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin


class AnalysisScenario(TimestampMixin, Base):
    """A point-in-time analysis of a property under a specific investment strategy."""

    __tablename__ = "analysis_scenarios"

    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False, index=True)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id"), nullable=True)
    team_id = Column(UUID(as_uuid=True), nullable=True)
    created_by = Column(UUID(as_uuid=True), nullable=False, index=True)

    # Strategy
    strategy = Column(String, nullable=False)
    # wholesale | brrrr | buy_and_hold | flip | creative_finance

    # Typed input columns (most-queried fields)
    purchase_price = Column(Numeric(12, 2), nullable=True)
    after_repair_value = Column(Numeric(12, 2), nullable=True)
    repair_cost = Column(Numeric(12, 2), nullable=True)
    monthly_rent = Column(Numeric(10, 2), nullable=True)
    down_payment_pct = Column(Numeric(5, 2), nullable=True)
    interest_rate = Column(Numeric(5, 3), nullable=True)
    loan_term_years = Column(Integer, nullable=True)

    # Extended inputs (strategy-specific, less frequently queried)
    inputs_extended = Column(JSONB, nullable=True)

    # Outputs — computed results
    outputs = Column(JSONB, nullable=False, default=dict)

    # Risk assessment
    risk_score = Column(Numeric(4, 2), nullable=True)
    risk_flags = Column(JSONB, nullable=True)  # [{flag, severity, explanation}]

    # AI narrative
    ai_narrative = Column(Text, nullable=True)
    ai_narrative_generated_at = Column(DateTime, nullable=True)

    # Data confidence — {field: {source, confidence, fetched_at}}
    source_confidence = Column(JSONB, nullable=True)

    # Immutability — scenarios are snapshots, create new ones to revise
    is_snapshot = Column(Boolean, default=True, nullable=False)
    parent_scenario_id = Column(
        UUID(as_uuid=True), ForeignKey("analysis_scenarios.id"), nullable=True,
    )

    # Sample data flag (onboarding demo deals)
    is_sample = Column(Boolean, default=False, nullable=False)

    # Soft delete
    is_deleted = Column(Boolean, default=False, nullable=False)

    # Relationships
    property = relationship("Property", back_populates="analysis_scenarios")
