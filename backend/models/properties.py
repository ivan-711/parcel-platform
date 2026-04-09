"""Property model — the durable root record for a physical real estate asset."""

from sqlalchemy import Boolean, Column, Float, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin


class Property(TimestampMixin, Base):
    """A physical real estate property — the root entity in the domain model."""

    __tablename__ = "properties"

    created_by = Column(UUID(as_uuid=True), nullable=False, index=True)
    team_id = Column(UUID(as_uuid=True), nullable=True)

    # Address identity
    address_line1 = Column(String, nullable=False)
    address_line2 = Column(String, nullable=True)
    city = Column(String, nullable=False)
    state = Column(String(2), nullable=False)
    zip_code = Column(String(10), nullable=False)
    county = Column(String, nullable=True)

    # Geocoding
    latitude = Column(Numeric(10, 7), nullable=True)
    longitude = Column(Numeric(10, 7), nullable=True)
    place_id = Column(String, nullable=True)

    # Physical characteristics
    property_type = Column(String, nullable=True)
    # SFH, duplex, triplex, quad, condo, townhouse, commercial
    bedrooms = Column(Integer, nullable=True)
    bathrooms = Column(Numeric(3, 1), nullable=True)
    sqft = Column(Integer, nullable=True)
    lot_sqft = Column(Integer, nullable=True)
    year_built = Column(Integer, nullable=True)

    # Lifecycle state
    status = Column(String, nullable=False, default="prospect")
    # prospect | under_analysis | in_pipeline | owned | sold | archived

    # Data provenance — {field: {source, timestamp, confidence}}
    data_sources = Column(JSONB, nullable=True)

    # Sample data flag (onboarding demo deals)
    is_sample = Column(Boolean, default=False, nullable=False)

    # Soft delete
    is_deleted = Column(Boolean, default=False, nullable=False)

    # Relationships
    analysis_scenarios = relationship("AnalysisScenario", back_populates="property")
    deals = relationship("Deal", back_populates="property")
    financing_instruments = relationship("FinancingInstrument", back_populates="property")
    rehab_projects = relationship("RehabProject", back_populates="property")
