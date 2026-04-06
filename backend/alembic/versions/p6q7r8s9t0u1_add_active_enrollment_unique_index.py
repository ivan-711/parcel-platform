"""Add partial unique index for active sequence enrollments.

Revision ID: p6q7r8s9t0u1
Revises: o5p6q7r8s9t0
Create Date: 2026-04-05
"""
from alembic import op

revision = "p6q7r8s9t0u1"
down_revision = "o5p6q7r8s9t0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Deduplicate any existing active enrollments before adding constraint
    op.execute(
        "DELETE FROM sequence_enrollments a USING sequence_enrollments b "
        "WHERE a.id > b.id AND a.sequence_id = b.sequence_id "
        "AND a.contact_id = b.contact_id "
        "AND a.status = 'active' AND a.deleted_at IS NULL "
        "AND b.status = 'active' AND b.deleted_at IS NULL"
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_active_enrollment "
        "ON sequence_enrollments (sequence_id, contact_id) "
        "WHERE status = 'active' AND deleted_at IS NULL"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_active_enrollment")
