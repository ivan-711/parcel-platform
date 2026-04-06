"""Rename billing tiers: starter→plus, team→business.

Revision ID: f2b1c3d4e5f6
Revises: e1a0b2c3d4e5
Create Date: 2026-04-03

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = "f2b1c3d4e5f6"
down_revision = "e1a0b2c3d4e5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE plantier RENAME VALUE 'starter' TO 'plus'")
    op.execute("ALTER TYPE plantier RENAME VALUE 'team' TO 'business'")


def downgrade() -> None:
    op.execute("ALTER TYPE plantier RENAME VALUE 'plus' TO 'starter'")
    op.execute("ALTER TYPE plantier RENAME VALUE 'business' TO 'team'")
