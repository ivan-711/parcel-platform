"""Add buyer_packets and buyer_packet_sends tables.

Revision ID: m3n4o5p6q7r8
Revises: l2m3n4o5p6q7
Create Date: 2026-04-05
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "m3n4o5p6q7r8"
down_revision = "l2m3n4o5p6q7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "buyer_packets",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("property_id", UUID(as_uuid=True), sa.ForeignKey("properties.id"), nullable=False),
        sa.Column("scenario_id", UUID(as_uuid=True), sa.ForeignKey("analysis_scenarios.id"), nullable=False),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("team_id", UUID(as_uuid=True), nullable=True),
        sa.Column("title", sa.String, nullable=False),
        sa.Column("share_token", sa.String, nullable=False, unique=True),
        sa.Column("packet_data", JSONB, nullable=False),
        sa.Column("asking_price", sa.Numeric(14, 2), nullable=True),
        sa.Column("assignment_fee", sa.Numeric(14, 2), nullable=True),
        sa.Column("is_public", sa.Boolean, default=True, nullable=False),
        sa.Column("view_count", sa.Integer, default=0, nullable=False),
        sa.Column("last_viewed_at", sa.DateTime, nullable=True),
        sa.Column("notes_to_buyer", sa.Text, nullable=True),
        sa.Column("deleted_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_buyer_packets_property_id", "buyer_packets", ["property_id"])
    op.create_index("ix_buyer_packets_created_by", "buyer_packets", ["created_by"])
    op.create_index("ix_buyer_packets_share_token", "buyer_packets", ["share_token"])

    op.create_table(
        "buyer_packet_sends",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("packet_id", UUID(as_uuid=True), sa.ForeignKey("buyer_packets.id"), nullable=False),
        sa.Column("contact_id", UUID(as_uuid=True), sa.ForeignKey("contacts.id"), nullable=False),
        sa.Column("communication_id", UUID(as_uuid=True), sa.ForeignKey("communications.id"), nullable=True),
        sa.Column("sent_at", sa.DateTime, nullable=False),
        sa.Column("opened_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_buyer_packet_sends_packet_id", "buyer_packet_sends", ["packet_id"])
    op.create_index("ix_buyer_packet_sends_contact_id", "buyer_packet_sends", ["contact_id"])


def downgrade() -> None:
    op.drop_table("buyer_packet_sends")
    op.drop_table("buyer_packets")
