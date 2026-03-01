"""rebuild_documents_for_s3

Revision ID: a3d8f1b24c07
Revises: f6c95c03e2a5
Create Date: 2026-03-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "a3d8f1b24c07"
down_revision: Union[str, Sequence[str], None] = "f6c95c03e2a5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Drop the old stub documents table and recreate with S3 storage columns."""
    # Drop the old stub documents table and its Postgres ENUMs
    op.drop_index("ix_documents_user_id", table_name="documents")
    op.drop_table("documents")
    sa.Enum(name="doctype").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="processingstatus").drop(op.get_bind(), checkfirst=True)

    # Create the new documents table with S3 storage and AI analysis columns
    op.create_table(
        "documents",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("original_filename", sa.String(255), nullable=False),
        sa.Column("file_type", sa.String(10), nullable=False),
        sa.Column("file_size_bytes", sa.Integer(), nullable=False),
        sa.Column("s3_key", sa.String(500), nullable=False),
        sa.Column("s3_bucket", sa.String(100), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("document_type", sa.String(50), nullable=True),
        sa.Column("parties", postgresql.JSONB(), nullable=True),
        sa.Column("ai_summary", sa.Text(), nullable=True),
        sa.Column("risk_flags", postgresql.JSONB(), nullable=True),
        sa.Column("extracted_numbers", postgresql.JSONB(), nullable=True),
        sa.Column("key_terms", postgresql.JSONB(), nullable=True),
        sa.Column("processing_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_documents_user_id", "documents", ["user_id"], unique=False)


def downgrade() -> None:
    """Restore the original stub documents table with ENUMs."""
    op.drop_index("ix_documents_user_id", table_name="documents")
    op.drop_table("documents")

    # Recreate old Postgres ENUMs
    doctype = sa.Enum(
        "purchase_agreement", "lease", "assignment", "subject_to",
        "seller_finance", "other", name="doctype",
    )
    processingstatus = sa.Enum(
        "pending", "processing", "ready", "error", name="processingstatus",
    )
    doctype.create(op.get_bind(), checkfirst=True)
    processingstatus.create(op.get_bind(), checkfirst=True)

    # Recreate old stub documents table
    op.create_table(
        "documents",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("team_id", sa.UUID(), nullable=True),
        sa.Column("filename", sa.String(), nullable=False),
        sa.Column("file_url", sa.String(), nullable=False),
        sa.Column("file_type", sa.String(), nullable=False),
        sa.Column("doc_type", doctype, nullable=False),
        sa.Column("ai_summary", sa.Text(), nullable=True),
        sa.Column("ai_risk_flags", postgresql.JSONB(), nullable=True),
        sa.Column("ai_key_terms", postgresql.JSONB(), nullable=True),
        sa.Column("processing_status", processingstatus, nullable=False),
        sa.Column("deal_id", sa.UUID(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["deal_id"], ["deals.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_documents_user_id", "documents", ["user_id"], unique=False)
