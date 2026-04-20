"""Add notify_agent_features to users table.

Revision ID: v2w3x4y5z6a1
Revises: u1v2w3x4y5z6
Create Date: 2026-04-19

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "v2w3x4y5z6a1"
down_revision = "u1v2w3x4y5z6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    result = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name = 'users' AND column_name = 'notify_agent_features'"
    ))
    if result.fetchone() is None:
        op.add_column(
            "users",
            sa.Column(
                "notify_agent_features",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )


def downgrade() -> None:
    op.drop_column("users", "notify_agent_features")
