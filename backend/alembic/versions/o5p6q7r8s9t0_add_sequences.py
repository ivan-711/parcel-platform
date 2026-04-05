"""Add sequences, sequence_steps, and sequence_enrollments tables.

Revision ID: o5p6q7r8s9t0
Revises: n4o5p6q7r8s9
Create Date: 2026-04-05
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "o5p6q7r8s9t0"
down_revision = "n4o5p6q7r8s9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sequences",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("team_id", UUID(as_uuid=True), sa.ForeignKey("teams.id"), nullable=True),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("status", sa.String, nullable=False, server_default="active"),
        sa.Column("trigger_type", sa.String, nullable=True, server_default="manual"),
        sa.Column("stop_on_reply", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("stop_on_deal_created", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("total_enrolled", sa.Integer, nullable=False, server_default="0"),
        sa.Column("total_completed", sa.Integer, nullable=False, server_default="0"),
        sa.Column("total_replied", sa.Integer, nullable=False, server_default="0"),
        sa.Column("deleted_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_sequences_created_by", "sequences", ["created_by"])

    op.create_table(
        "sequence_steps",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("sequence_id", UUID(as_uuid=True), sa.ForeignKey("sequences.id"), nullable=False),
        sa.Column("step_order", sa.Integer, nullable=False),
        sa.Column("channel", sa.String, nullable=False),
        sa.Column("delay_days", sa.Integer, nullable=False, server_default="0"),
        sa.Column("delay_hours", sa.Integer, nullable=False, server_default="0"),
        sa.Column("subject", sa.String, nullable=True),
        sa.Column("body_template", sa.Text, nullable=False),
        sa.Column("deleted_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_sequence_steps_sequence_id", "sequence_steps", ["sequence_id"])

    op.create_table(
        "sequence_enrollments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("sequence_id", UUID(as_uuid=True), sa.ForeignKey("sequences.id"), nullable=False),
        sa.Column("contact_id", UUID(as_uuid=True), sa.ForeignKey("contacts.id"), nullable=False),
        sa.Column("property_id", UUID(as_uuid=True), sa.ForeignKey("properties.id"), nullable=True),
        sa.Column("deal_id", UUID(as_uuid=True), sa.ForeignKey("deals.id"), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String, nullable=False, server_default="active"),
        sa.Column("current_step", sa.Integer, nullable=False, server_default="0"),
        sa.Column("next_send_at", sa.DateTime, nullable=True),
        sa.Column("enrolled_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime, nullable=True),
        sa.Column("stopped_at", sa.DateTime, nullable=True),
        sa.Column("stopped_reason", sa.String, nullable=True),
        sa.Column("deleted_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_sequence_enrollments_sequence_id", "sequence_enrollments", ["sequence_id"])
    op.create_index("ix_sequence_enrollments_contact_id", "sequence_enrollments", ["contact_id"])
    op.create_index("ix_sequence_enrollments_next_send_at", "sequence_enrollments", ["next_send_at"])


def downgrade() -> None:
    op.drop_table("sequence_enrollments")
    op.drop_table("sequence_steps")
    op.drop_table("sequences")
