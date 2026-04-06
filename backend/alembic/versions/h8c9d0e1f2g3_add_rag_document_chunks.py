"""Add document_chunks table, embedding columns on documents, citations on chat_messages.

Revision ID: h8c9d0e1f2g3
Revises: g7b8c9d0e1f2
Create Date: 2026-04-04
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "h8c9d0e1f2g3"
down_revision = "g7b8c9d0e1f2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- document_chunks table (using raw SQL for the vector column) ---
    op.execute("""
        CREATE TABLE document_chunks (
            id UUID PRIMARY KEY,
            document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            chunk_index INTEGER NOT NULL,
            content TEXT NOT NULL,
            contextualized_content TEXT,
            embedding vector(1536),
            token_count INTEGER,
            metadata JSONB,
            created_at TIMESTAMP NOT NULL DEFAULT now(),
            updated_at TIMESTAMP NOT NULL DEFAULT now()
        )
    """)

    # Indexes
    op.execute("CREATE INDEX ix_document_chunks_document_id ON document_chunks (document_id)")
    op.execute(
        "CREATE INDEX ix_document_chunks_embedding_hnsw "
        "ON document_chunks USING hnsw (embedding vector_cosine_ops) "
        "WITH (m = 16, ef_construction = 64)"
    )
    op.execute(
        "CREATE INDEX ix_document_chunks_content_trgm "
        "ON document_chunks USING gin (content gin_trgm_ops)"
    )

    # --- documents: add property_id, embedding_status, embedding_meta ---
    op.add_column("documents", sa.Column("property_id", UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_documents_property_id",
        "documents",
        "properties",
        ["property_id"],
        ["id"],
    )
    op.create_index("ix_documents_property_id", "documents", ["property_id"])

    op.add_column(
        "documents",
        sa.Column("embedding_status", sa.String(20), nullable=False, server_default="pending"),
    )
    op.add_column("documents", sa.Column("embedding_meta", JSONB, nullable=True))

    # --- chat_messages: add citations ---
    op.add_column("chat_messages", sa.Column("citations", JSONB, nullable=True))


def downgrade() -> None:
    op.drop_column("chat_messages", "citations")
    op.drop_column("documents", "embedding_meta")
    op.drop_column("documents", "embedding_status")
    op.drop_index("ix_documents_property_id", table_name="documents")
    op.drop_constraint("fk_documents_property_id", "documents", type_="foreignkey")
    op.drop_column("documents", "property_id")
    op.execute("DROP INDEX IF EXISTS ix_document_chunks_content_trgm")
    op.execute("DROP INDEX IF EXISTS ix_document_chunks_embedding_hnsw")
    op.execute("DROP INDEX IF EXISTS ix_document_chunks_document_id")
    op.execute("DROP TABLE IF EXISTS document_chunks")
