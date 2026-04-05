"""Add delivery tracking fields to communications table.

Revision ID: n4o5p6q7r8s9
Revises: m3n4o5p6q7r8
Create Date: 2026-04-05
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "n4o5p6q7r8s9"
down_revision = "m3n4o5p6q7r8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("communications", sa.Column("external_id", sa.String, nullable=True))
    op.add_column("communications", sa.Column("status", sa.String, nullable=False, server_default="logged"))
    op.add_column("communications", sa.Column("status_updated_at", sa.DateTime, nullable=True))
    op.add_column("communications", sa.Column("error_message", sa.String, nullable=True))
    op.add_column("communications", sa.Column("cost_cents", sa.Integer, nullable=True))
    op.add_column("communications", sa.Column("metadata", JSONB, nullable=True))
    op.create_index("ix_communications_external_id", "communications", ["external_id"])


def downgrade() -> None:
    op.drop_index("ix_communications_external_id")
    op.drop_column("communications", "metadata")
    op.drop_column("communications", "cost_cents")
    op.drop_column("communications", "error_message")
    op.drop_column("communications", "status_updated_at")
    op.drop_column("communications", "status")
    op.drop_column("communications", "external_id")
