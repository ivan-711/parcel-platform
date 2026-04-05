"""BuyerPacket and BuyerPacketSend models — deal packets for buyer disposition."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin


class BuyerPacket(TimestampMixin, Base):
    """A frozen deal presentation shared with potential buyers."""

    __tablename__ = "buyer_packets"

    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False, index=True)
    scenario_id = Column(UUID(as_uuid=True), ForeignKey("analysis_scenarios.id"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    team_id = Column(UUID(as_uuid=True), nullable=True)

    title = Column(String, nullable=False)
    share_token = Column(String, nullable=False, unique=True, index=True)

    packet_data = Column(JSONB, nullable=False)

    asking_price = Column(Numeric(14, 2), nullable=True)
    assignment_fee = Column(Numeric(14, 2), nullable=True)

    is_public = Column(Boolean, default=True, nullable=False)
    view_count = Column(Integer, default=0, nullable=False)
    last_viewed_at = Column(DateTime, nullable=True)

    notes_to_buyer = Column(Text, nullable=True)

    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    property = relationship("Property")
    scenario = relationship("AnalysisScenario")
    sends = relationship("BuyerPacketSend", back_populates="packet", cascade="all, delete-orphan")


class BuyerPacketSend(TimestampMixin, Base):
    """Tracks which buyers a packet was sent to."""

    __tablename__ = "buyer_packet_sends"

    packet_id = Column(UUID(as_uuid=True), ForeignKey("buyer_packets.id"), nullable=False, index=True)
    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id"), nullable=False, index=True)
    communication_id = Column(UUID(as_uuid=True), ForeignKey("communications.id"), nullable=True)
    sent_at = Column(DateTime, nullable=False)
    opened_at = Column(DateTime, nullable=True)

    # Relationships
    packet = relationship("BuyerPacket", back_populates="sends")
    contact = relationship("Contact")
