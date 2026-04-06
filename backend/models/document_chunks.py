"""DocumentChunk model — stores chunked, contextualized, and embedded document text for RAG."""

from sqlalchemy import Column, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin

try:
    from pgvector.sqlalchemy import Vector
except ImportError:
    Vector = None


class DocumentChunk(TimestampMixin, Base):
    """A single chunk of a document with optional contextual summary and vector embedding."""

    __tablename__ = "document_chunks"

    document_id = Column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    contextualized_content = Column(Text, nullable=True)
    embedding = Column(Vector(1536) if Vector else String, nullable=True)
    token_count = Column(Integer, nullable=True)
    chunk_metadata = Column("metadata", JSONB, nullable=True)

    document = relationship("Document", back_populates="chunks")

    __table_args__ = (
        UniqueConstraint("document_id", "chunk_index", name="uq_document_chunk_index"),
        Index(
            "ix_document_chunks_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
        Index(
            "ix_document_chunks_content_trgm",
            "content",
            postgresql_using="gin",
            postgresql_ops={"content": "gin_trgm_ops"},
        ),
    )
