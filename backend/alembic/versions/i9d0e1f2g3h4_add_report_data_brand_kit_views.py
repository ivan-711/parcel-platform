"""Add report_data/pdf columns to reports, brand_kit to users, report_views table.

Revision ID: i9d0e1f2g3h4
Revises: h8c9d0e1f2g3
Create Date: 2026-04-04
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "i9d0e1f2g3h4"
down_revision = "h8c9d0e1f2g3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- reports: add report_data, pdf_s3_key, pdf_generated_at ---
    op.add_column("reports", sa.Column("report_data", JSONB, nullable=True))
    op.add_column("reports", sa.Column("pdf_s3_key", sa.String(), nullable=True))
    op.add_column("reports", sa.Column("pdf_generated_at", sa.DateTime(), nullable=True))

    # --- users: add brand_kit ---
    op.add_column("users", sa.Column("brand_kit", JSONB, nullable=True))

    # --- report_views table ---
    op.create_table(
        "report_views",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("report_id", UUID(as_uuid=True), sa.ForeignKey("reports.id"), nullable=False),
        sa.Column("ip_hash", sa.String(), nullable=True),
        sa.Column("user_agent", sa.String(), nullable=True),
        sa.Column("referrer", sa.String(), nullable=True),
        sa.Column("sections_viewed", JSONB, nullable=True),
        sa.Column("time_spent_seconds", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_report_views_report_id", "report_views", ["report_id"])


def downgrade() -> None:
    op.drop_index("ix_report_views_report_id", table_name="report_views")
    op.drop_table("report_views")
    op.drop_column("users", "brand_kit")
    op.drop_column("reports", "pdf_generated_at")
    op.drop_column("reports", "pdf_s3_key")
    op.drop_column("reports", "report_data")
