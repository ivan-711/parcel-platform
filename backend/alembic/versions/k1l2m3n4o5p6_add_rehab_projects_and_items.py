# backend/alembic/versions/k1l2m3n4o5p6_add_rehab_projects_and_items.py
"""Add rehab_projects and rehab_items tables.

Revision ID: k1l2m3n4o5p6
Revises: j0e1f2g3h4i5
Create Date: 2026-04-04
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "k1l2m3n4o5p6"
down_revision: Union[str, Sequence[str], None] = "j0e1f2g3h4i5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "rehab_projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("property_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("deal_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="planning"),
        sa.Column("estimated_budget", sa.Numeric(14, 2), nullable=True),
        sa.Column("actual_spent", sa.Numeric(14, 2), nullable=True, server_default="0"),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("target_completion", sa.Date(), nullable=True),
        sa.Column("actual_completion", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["property_id"], ["properties.id"]),
        sa.ForeignKeyConstraint(["deal_id"], ["deals.id"]),
    )
    op.create_index("ix_rehab_projects_property_id", "rehab_projects", ["property_id"])
    op.create_index("ix_rehab_projects_created_by", "rehab_projects", ["created_by"])

    op.create_table(
        "rehab_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False),
        sa.Column("estimated_cost", sa.Numeric(10, 2), nullable=True),
        sa.Column("actual_cost", sa.Numeric(10, 2), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="planned"),
        sa.Column("contractor_name", sa.String(), nullable=True),
        sa.Column("contractor_bid", sa.Numeric(10, 2), nullable=True),
        sa.Column("priority", sa.String(), nullable=True, server_default="normal"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["project_id"], ["rehab_projects.id"]),
    )
    op.create_index("ix_rehab_items_project_id", "rehab_items", ["project_id"])


def downgrade() -> None:
    op.drop_table("rehab_items")
    op.drop_table("rehab_projects")
