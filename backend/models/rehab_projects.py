# backend/models/rehab_projects.py
"""Rehab project and item models — renovation cost tracking tied to properties."""

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin


class RehabProject(TimestampMixin, Base):
    """A rehabilitation project linked to a property."""

    __tablename__ = "rehab_projects"

    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False, index=True)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id"), nullable=True)
    created_by = Column(UUID(as_uuid=True), nullable=False, index=True)
    team_id = Column(UUID(as_uuid=True), nullable=True)

    name = Column(String, nullable=False)
    status = Column(String, nullable=False, default="planning")
    # planning | in_progress | completed | on_hold

    estimated_budget = Column(Numeric(14, 2), nullable=True)
    actual_spent = Column(Numeric(14, 2), nullable=True, default=0)

    start_date = Column(Date, nullable=True)
    target_completion = Column(Date, nullable=True)
    actual_completion = Column(Date, nullable=True)

    notes = Column(Text, nullable=True)
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    property = relationship("Property", back_populates="rehab_projects")
    items = relationship("RehabItem", back_populates="project", cascade="all, delete-orphan")


class RehabItem(TimestampMixin, Base):
    """A single line item within a rehab project."""

    __tablename__ = "rehab_items"

    project_id = Column(UUID(as_uuid=True), ForeignKey("rehab_projects.id"), nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), nullable=False)

    category = Column(String, nullable=False)
    # kitchen | bathroom | flooring | roof | hvac | plumbing | electrical |
    # exterior | foundation | windows_doors | painting | landscaping |
    # general | permits | other

    description = Column(String, nullable=False)

    estimated_cost = Column(Numeric(10, 2), nullable=True)
    actual_cost = Column(Numeric(10, 2), nullable=True)

    status = Column(String, nullable=False, default="planned")
    # planned | in_progress | completed | skipped

    contractor_name = Column(String, nullable=True)
    contractor_bid = Column(Numeric(10, 2), nullable=True)

    priority = Column(String, nullable=True, default="normal")
    # critical | high | normal | low

    notes = Column(Text, nullable=True)
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    project = relationship("RehabProject", back_populates="items")
