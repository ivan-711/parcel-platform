"""Add deleted_at soft-delete column to financing_instruments, obligations, payments.

Revision ID: l2g3h4i5j6k7
Revises: k1f2g3h4i5j6
Create Date: 2026-04-04
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "l2g3h4i5j6k7"
down_revision: Union[str, Sequence[str], None] = "k1f2g3h4i5j6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("financing_instruments", sa.Column("deleted_at", sa.DateTime(), nullable=True))
    op.add_column("obligations", sa.Column("deleted_at", sa.DateTime(), nullable=True))
    op.add_column("payments", sa.Column("deleted_at", sa.DateTime(), nullable=True))

    op.create_index(
        "ix_financing_instruments_active",
        "financing_instruments",
        ["created_by"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_index(
        "ix_obligations_active",
        "obligations",
        ["created_by"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_index(
        "ix_payments_active",
        "payments",
        ["created_by"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_payments_active", "payments")
    op.drop_index("ix_obligations_active", "obligations")
    op.drop_index("ix_financing_instruments_active", "financing_instruments")

    op.drop_column("payments", "deleted_at")
    op.drop_column("obligations", "deleted_at")
    op.drop_column("financing_instruments", "deleted_at")
