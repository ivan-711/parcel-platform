"""Document model — stores uploaded real estate documents and their AI-extracted data."""

from sqlalchemy import Column, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin

DocType = Enum(
    "purchase_agreement", "lease", "assignment", "subject_to",
    "seller_finance", "other",
    name="doctype",
)

ProcessingStatus = Enum(
    "pending", "processing", "ready", "error",
    name="processingstatus",
)


class Document(TimestampMixin, Base):
    """A real estate document uploaded by the user, optionally processed by AI."""

    __tablename__ = "documents"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)
    filename = Column(String, nullable=False)
    file_url = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    doc_type = Column(DocType, nullable=False)
    ai_summary = Column(Text, nullable=True)
    ai_risk_flags = Column(JSONB, nullable=True)
    ai_key_terms = Column(JSONB, nullable=True)
    processing_status = Column(ProcessingStatus, nullable=False, default="pending")
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id"), nullable=True)

    # Relationships
    user = relationship("User", back_populates="documents", foreign_keys=[user_id])
    deal = relationship("Deal", back_populates="documents")
