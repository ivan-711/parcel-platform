"""Add latitude, longitude, place_id columns to properties table.

Revision ID: t0u1v2w3x4y5
Revises: s9t0u1v2w3x4
Create Date: 2026-04-09

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "t0u1v2w3x4y5"
down_revision = "s9t0u1v2w3x4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("properties", sa.Column("latitude", sa.Numeric(10, 7), nullable=True))
    op.add_column("properties", sa.Column("longitude", sa.Numeric(10, 7), nullable=True))
    op.add_column("properties", sa.Column("place_id", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("properties", "place_id")
    op.drop_column("properties", "longitude")
    op.drop_column("properties", "latitude")
