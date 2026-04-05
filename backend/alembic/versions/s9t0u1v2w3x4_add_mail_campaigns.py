"""Add mail_campaigns and mail_recipients tables.

Revision ID: s9t0u1v2w3x4
Revises: r8s9t0u1v2w3
Create Date: 2026-04-05
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "s9t0u1v2w3x4"
down_revision = "r8s9t0u1v2w3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "mail_campaigns",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),

        # Ownership
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("team_id", UUID(as_uuid=True), nullable=True),

        # Identity
        sa.Column("name", sa.String, nullable=False),
        sa.Column("description", sa.Text, nullable=True),

        # Status / type
        sa.Column("status", sa.String, nullable=False, server_default="draft"),
        sa.Column("mail_type", sa.String, nullable=False),

        # Templates
        sa.Column("template_front_html", sa.Text, nullable=True),
        sa.Column("template_back_html", sa.Text, nullable=True),

        # Return address
        sa.Column("from_address", JSONB, nullable=True),

        # Scheduling
        sa.Column("scheduled_date", sa.Date, nullable=True),
        sa.Column("sent_at", sa.DateTime, nullable=True),

        # Counters
        sa.Column("total_recipients", sa.Integer, nullable=False, server_default="0"),
        sa.Column("total_sent", sa.Integer, nullable=False, server_default="0"),
        sa.Column("total_delivered", sa.Integer, nullable=False, server_default="0"),
        sa.Column("total_returned", sa.Integer, nullable=False, server_default="0"),
        sa.Column("total_cost_cents", sa.Integer, nullable=False, server_default="0"),

        # Soft delete
        sa.Column("deleted_at", sa.DateTime, nullable=True),
    )

    op.create_index("ix_mail_campaigns_created_by", "mail_campaigns", ["created_by"])

    op.create_table(
        "mail_recipients",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),

        # Campaign FK
        sa.Column("campaign_id", UUID(as_uuid=True), sa.ForeignKey("mail_campaigns.id"), nullable=False),

        # Optional CRM links
        sa.Column("contact_id", UUID(as_uuid=True), sa.ForeignKey("contacts.id"), nullable=True),
        sa.Column("property_id", UUID(as_uuid=True), sa.ForeignKey("properties.id"), nullable=True),

        # Destination
        sa.Column("to_name", sa.String, nullable=True),
        sa.Column("to_address", JSONB, nullable=False),

        # Address verification
        sa.Column("address_verified", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("deliverability", sa.String, nullable=True),

        # Lob integration
        sa.Column("lob_mail_id", sa.String, nullable=True),

        # Status / cost
        sa.Column("status", sa.String, nullable=False, server_default="pending"),
        sa.Column("cost_cents", sa.Integer, nullable=True),

        # Rendered HTML
        sa.Column("rendered_front", sa.Text, nullable=True),
        sa.Column("rendered_back", sa.Text, nullable=True),

        # Soft delete
        sa.Column("deleted_at", sa.DateTime, nullable=True),
    )

    op.create_index("ix_mail_recipients_campaign_id", "mail_recipients", ["campaign_id"])
    op.create_index("ix_mail_recipients_contact_id", "mail_recipients", ["contact_id"])
    op.create_index("ix_mail_recipients_property_id", "mail_recipients", ["property_id"])


def downgrade() -> None:
    op.drop_index("ix_mail_recipients_property_id", table_name="mail_recipients")
    op.drop_index("ix_mail_recipients_contact_id", table_name="mail_recipients")
    op.drop_index("ix_mail_recipients_campaign_id", table_name="mail_recipients")
    op.drop_table("mail_recipients")

    op.drop_index("ix_mail_campaigns_created_by", table_name="mail_campaigns")
    op.drop_table("mail_campaigns")
