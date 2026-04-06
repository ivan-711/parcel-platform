"""Add deal_contacts junction table.

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-04-04
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "f6a7b8c9d0e1"
down_revision = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "deal_contacts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("deal_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "contact_id", postgresql.UUID(as_uuid=True), nullable=False
        ),
        sa.Column("role", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["deal_id"], ["deals.id"]),
        sa.ForeignKeyConstraint(["contact_id"], ["contacts.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "deal_id", "contact_id", name="uq_deal_contact"
        ),
    )
    op.create_index(
        "ix_deal_contacts_deal_id",
        "deal_contacts",
        ["deal_id"],
    )
    op.create_index(
        "ix_deal_contacts_contact_id",
        "deal_contacts",
        ["contact_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_deal_contacts_contact_id")
    op.drop_index("ix_deal_contacts_deal_id")
    op.drop_table("deal_contacts")
