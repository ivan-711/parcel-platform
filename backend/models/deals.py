"""Deal model — stores a real estate deal analysis for any strategy."""

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin

PropertyType = Enum(
    "single_family", "duplex", "triplex", "quad", "commercial",
    name="propertytype",
)

DealStrategy = Enum(
    "wholesale", "creative_finance", "brrrr", "buy_and_hold", "flip",
    name="dealstrategy",
)

DealStatus = Enum("draft", "saved", "shared", name="dealstatus")


class Deal(TimestampMixin, Base):
    """A real estate deal analyzed using one of Parcel's five investment strategies."""

    __tablename__ = "deals"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)
    address = Column(String, nullable=False)
    zip_code = Column(String, nullable=False)
    property_type = Column(PropertyType, nullable=False)
    strategy = Column(DealStrategy, nullable=False)
    inputs = Column(JSONB, nullable=False, default=dict)
    outputs = Column(JSONB, nullable=False, default=dict)
    risk_score = Column(Integer, nullable=True)
    status = Column(DealStatus, nullable=False, default="draft")
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="deals", foreign_keys=[user_id])
    team = relationship("Team", back_populates="deals", foreign_keys=[team_id])
    pipeline_entries = relationship("PipelineEntry", back_populates="deal")
    documents = relationship("Document", back_populates="deal")
    portfolio_entries = relationship("PortfolioEntry", back_populates="deal")
