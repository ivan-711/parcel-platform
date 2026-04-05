"""Add skip_traces table.

Revision ID: r8s9t0u1v2w3
Revises: q7r8s9t0u1v2
Create Date: 2026-04-05
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "r8s9t0u1v2w3"
down_revision = "q7r8s9t0u1v2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "skip_traces",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),

        # Foreign keys
        sa.Column("property_id", UUID(as_uuid=True), sa.ForeignKey("properties.id"), nullable=True),
        sa.Column("contact_id", UUID(as_uuid=True), sa.ForeignKey("contacts.id"), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("team_id", UUID(as_uuid=True), nullable=True),

        # Input fields
        sa.Column("input_address", sa.String, nullable=True),
        sa.Column("input_name", sa.String, nullable=True),
        sa.Column("input_city", sa.String, nullable=True),
        sa.Column("input_state", sa.String, nullable=True),
        sa.Column("input_zip", sa.String, nullable=True),

        # Status
        sa.Column("status", sa.String, nullable=False, server_default="pending"),

        # Owner identity
        sa.Column("owner_first_name", sa.String, nullable=True),
        sa.Column("owner_last_name", sa.String, nullable=True),

        # Contact data
        sa.Column("phones", JSONB, nullable=True),
        sa.Column("emails", JSONB, nullable=True),
        sa.Column("mailing_address", JSONB, nullable=True),

        # Classification
        sa.Column("is_absentee_owner", sa.Boolean, nullable=True),

        # Extended data
        sa.Column("demographics", JSONB, nullable=True),
        sa.Column("raw_response", JSONB, nullable=True),

        # Billing
        sa.Column("cost_cents", sa.Integer, nullable=True),

        # Timestamps / grouping
        sa.Column("traced_at", sa.DateTime, nullable=True),
        sa.Column("batch_id", sa.String, nullable=True),
        sa.Column("deleted_at", sa.DateTime, nullable=True),
    )

    op.create_index("ix_skip_traces_property_id", "skip_traces", ["property_id"])
    op.create_index("ix_skip_traces_contact_id", "skip_traces", ["contact_id"])
    op.create_index("ix_skip_traces_created_by", "skip_traces", ["created_by"])
    op.create_index("ix_skip_traces_batch_id", "skip_traces", ["batch_id"])


def downgrade() -> None:
    op.drop_index("ix_skip_traces_batch_id", table_name="skip_traces")
    op.drop_index("ix_skip_traces_created_by", table_name="skip_traces")
    op.drop_index("ix_skip_traces_contact_id", table_name="skip_traces")
    op.drop_index("ix_skip_traces_property_id", table_name="skip_traces")
    op.drop_table("skip_traces")
