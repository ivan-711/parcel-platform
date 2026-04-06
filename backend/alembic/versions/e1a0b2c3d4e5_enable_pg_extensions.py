"""Enable PostgreSQL extensions: PostGIS, pgvector, pg_trgm.

Revision ID: e1a0b2c3d4e5
Revises: 1642524fa0f6
Create Date: 2026-04-03

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "e1a0b2c3d4e5"
down_revision = "1642524fa0f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # PostGIS may not be available on all providers (e.g. Railway) — use savepoint
    conn = op.get_bind()
    conn.execute(sa.text("SAVEPOINT sp_postgis"))
    try:
        op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    except Exception:
        conn.execute(sa.text("ROLLBACK TO SAVEPOINT sp_postgis"))
    conn.execute(sa.text("RELEASE SAVEPOINT sp_postgis"))
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")


def downgrade() -> None:
    op.execute("DROP EXTENSION IF EXISTS pg_trgm")
    op.execute("DROP EXTENSION IF EXISTS vector")
    op.execute("DROP EXTENSION IF EXISTS postgis")
