"""Sequence, SequenceStep, SequenceEnrollment models — automated follow-up sequences."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base
from models.base import TimestampMixin


class Sequence(TimestampMixin, Base):
    """A reusable follow-up template composed of ordered steps."""

    __tablename__ = "sequences"

    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)

    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="active")
    # active | paused | archived

    trigger_type = Column(String, nullable=True, default="manual")
    stop_on_reply = Column(Boolean, default=True, nullable=False)
    stop_on_deal_created = Column(Boolean, default=False, nullable=False)

    total_enrolled = Column(Integer, default=0, nullable=False)
    total_completed = Column(Integer, default=0, nullable=False)
    total_replied = Column(Integer, default=0, nullable=False)

    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    steps = relationship(
        "SequenceStep",
        back_populates="sequence",
        order_by="SequenceStep.step_order",
        cascade="all, delete-orphan",
    )
    enrollments = relationship("SequenceEnrollment", back_populates="sequence")


class SequenceStep(TimestampMixin, Base):
    """A single step within a sequence."""

    __tablename__ = "sequence_steps"

    sequence_id = Column(UUID(as_uuid=True), ForeignKey("sequences.id"), nullable=False, index=True)
    step_order = Column(Integer, nullable=False)
    channel = Column(String, nullable=False)
    # sms | email

    delay_days = Column(Integer, nullable=False, default=0)
    delay_hours = Column(Integer, nullable=False, default=0)

    subject = Column(String, nullable=True)
    body_template = Column(Text, nullable=False)

    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    sequence = relationship("Sequence", back_populates="steps")


class SequenceEnrollment(TimestampMixin, Base):
    """A contact enrolled in a sequence."""

    __tablename__ = "sequence_enrollments"

    sequence_id = Column(UUID(as_uuid=True), ForeignKey("sequences.id"), nullable=False, index=True)
    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id"), nullable=False, index=True)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=True)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id"), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    status = Column(String, nullable=False, default="active")
    # active | completed | replied | stopped | failed

    current_step = Column(Integer, nullable=False, default=0)
    next_send_at = Column(DateTime, nullable=True, index=True)

    enrolled_at = Column(DateTime, server_default=func.now(), nullable=False)
    completed_at = Column(DateTime, nullable=True)
    stopped_at = Column(DateTime, nullable=True)
    stopped_reason = Column(String, nullable=True)

    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    sequence = relationship("Sequence", back_populates="enrollments")
    contact = relationship("Contact")
