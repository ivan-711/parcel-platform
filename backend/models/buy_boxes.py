"""BuyBox model — investment criteria for buyer contacts."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin


class BuyBox(TimestampMixin, Base):
    """Investment criteria defining what a buyer wants to purchase."""

    __tablename__ = "buy_boxes"

    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id"), nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), nullable=False, index=True)
    team_id = Column(UUID(as_uuid=True), nullable=True)

    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Location criteria
    target_markets = Column(JSONB, nullable=True)
    max_distance_miles = Column(Integer, nullable=True)

    # Financial criteria
    min_price = Column(Numeric(14, 2), nullable=True)
    max_price = Column(Numeric(14, 2), nullable=True)
    min_arv = Column(Numeric(14, 2), nullable=True)
    max_arv = Column(Numeric(14, 2), nullable=True)
    min_cash_flow = Column(Numeric(10, 2), nullable=True)
    min_cap_rate = Column(Numeric(6, 4), nullable=True)
    min_coc_return = Column(Numeric(6, 4), nullable=True)
    max_repair_cost = Column(Numeric(14, 2), nullable=True)

    # Property criteria
    property_types = Column(JSONB, nullable=True)
    min_bedrooms = Column(Integer, nullable=True)
    min_bathrooms = Column(Integer, nullable=True)
    min_sqft = Column(Integer, nullable=True)
    max_year_built = Column(Integer, nullable=True)
    min_year_built = Column(Integer, nullable=True)

    # Strategy criteria
    strategies = Column(JSONB, nullable=True)

    # Buyer preferences
    funding_type = Column(String, nullable=True)
    can_close_days = Column(Integer, nullable=True)
    proof_of_funds = Column(Boolean, default=False, nullable=False)

    notes = Column(Text, nullable=True)
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    contact = relationship("Contact", back_populates="buy_boxes")
