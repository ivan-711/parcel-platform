"""add risk_factors to deals

Revision ID: b7e2a4f19d03
Revises: a3d8f1b24c07
Create Date: 2026-03-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "b7e2a4f19d03"
down_revision: Union[str, Sequence[str], None] = "a3d8f1b24c07"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add nullable JSONB risk_factors column to deals table."""
    op.add_column(
        "deals",
        sa.Column("risk_factors", postgresql.JSONB, nullable=True),
    )


def downgrade() -> None:
    """Remove risk_factors column from deals table."""
    op.drop_column("deals", "risk_factors")
