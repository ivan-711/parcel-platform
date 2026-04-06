"""Add onboarding columns to users + is_sample to properties/scenarios.

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-04-03

"""
import sqlalchemy as sa
from alembic import op

revision = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Users: onboarding columns
    op.add_column("users", sa.Column("onboarding_persona", sa.String(), nullable=True))
    op.add_column("users", sa.Column("onboarding_completed_at", sa.DateTime(), nullable=True))

    # Properties: sample data flag
    op.add_column("properties", sa.Column("is_sample", sa.Boolean(), nullable=False, server_default="false"))

    # AnalysisScenarios: sample data flag
    op.add_column("analysis_scenarios", sa.Column("is_sample", sa.Boolean(), nullable=False, server_default="false"))


def downgrade() -> None:
    op.drop_column("analysis_scenarios", "is_sample")
    op.drop_column("properties", "is_sample")
    op.drop_column("users", "onboarding_completed_at")
    op.drop_column("users", "onboarding_persona")
