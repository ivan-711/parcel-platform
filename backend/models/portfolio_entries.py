"""PortfolioEntry model — records a closed deal's performance metrics."""

from sqlalchemy import Column, Date, ForeignKey, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin


class PortfolioEntry(TimestampMixin, Base):
    """Tracks the actual performance of a closed deal in the user's portfolio."""

    __tablename__ = "portfolio_entries"

    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)
    closed_date = Column(Date, nullable=False)
    closed_price = Column(Numeric(12, 2), nullable=False)
    profit = Column(Numeric(12, 2), nullable=False)
    monthly_cash_flow = Column(Numeric(12, 2), nullable=True)
    notes = Column(Text, nullable=True)

    # Relationships
    deal = relationship("Deal", back_populates="portfolio_entries")
    user = relationship("User", back_populates="portfolio_entries", foreign_keys=[user_id])
