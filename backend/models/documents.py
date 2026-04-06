"""Document model — stores uploaded documents and their AI-extracted analysis."""

from sqlalchemy import Column, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin


class Document(TimestampMixin, Base):
    """A document uploaded by the user, stored in S3, processed by Claude AI."""

    __tablename__ = "documents"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=True, index=True)
    original_filename = Column(String(255), nullable=False)
    file_type = Column(String(10), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    s3_key = Column(String(500), nullable=False)
    s3_bucket = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    embedding_status = Column(String(20), nullable=False, default="pending")
    embedding_meta = Column(JSONB, nullable=True)
    document_type = Column(String(50), nullable=True)
    parties = Column(JSONB, nullable=True)
    ai_summary = Column(Text, nullable=True)
    risk_flags = Column(JSONB, nullable=True)
    extracted_numbers = Column(JSONB, nullable=True)
    key_terms = Column(JSONB, nullable=True)
    processing_error = Column(Text, nullable=True)

    # Relationships
    user = relationship("User", back_populates="documents", foreign_keys=[user_id])
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
