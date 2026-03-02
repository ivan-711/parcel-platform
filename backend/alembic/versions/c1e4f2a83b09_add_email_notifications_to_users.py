"""add email_notifications to users

Revision ID: c1e4f2a83b09
Revises: b7e2a4f19d03
Create Date: 2026-03-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "c1e4f2a83b09"
down_revision: Union[str, Sequence[str], None] = "b7e2a4f19d03"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add email_notifications boolean column to users table."""
    op.add_column(
        "users",
        sa.Column(
            "email_notifications",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )


def downgrade() -> None:
    """Remove email_notifications column from users table."""
    op.drop_column("users", "email_notifications")
