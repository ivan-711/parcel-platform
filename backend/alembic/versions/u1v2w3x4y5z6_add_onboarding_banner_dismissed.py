"""Add onboarding_banner_dismissed_at to users table.

Revision ID: u1v2w3x4y5z6
Revises: t0u1v2w3x4y5
Create Date: 2026-04-16

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "u1v2w3x4y5z6"
down_revision = "t0u1v2w3x4y5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("onboarding_banner_dismissed_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "onboarding_banner_dismissed_at")
