"""Add buy_boxes table.

Revision ID: l2m3n4o5p6q7
Revises: k1l2m3n4o5p6
Create Date: 2026-04-04
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "l2m3n4o5p6q7"
down_revision: Union[str, Sequence[str], None] = "k1l2m3n4o5p6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "buy_boxes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("target_markets", postgresql.JSONB(), nullable=True),
        sa.Column("max_distance_miles", sa.Integer(), nullable=True),
        sa.Column("min_price", sa.Numeric(14, 2), nullable=True),
        sa.Column("max_price", sa.Numeric(14, 2), nullable=True),
        sa.Column("min_arv", sa.Numeric(14, 2), nullable=True),
        sa.Column("max_arv", sa.Numeric(14, 2), nullable=True),
        sa.Column("min_cash_flow", sa.Numeric(10, 2), nullable=True),
        sa.Column("min_cap_rate", sa.Numeric(6, 4), nullable=True),
        sa.Column("min_coc_return", sa.Numeric(6, 4), nullable=True),
        sa.Column("max_repair_cost", sa.Numeric(14, 2), nullable=True),
        sa.Column("property_types", postgresql.JSONB(), nullable=True),
        sa.Column("min_bedrooms", sa.Integer(), nullable=True),
        sa.Column("min_bathrooms", sa.Integer(), nullable=True),
        sa.Column("min_sqft", sa.Integer(), nullable=True),
        sa.Column("max_year_built", sa.Integer(), nullable=True),
        sa.Column("min_year_built", sa.Integer(), nullable=True),
        sa.Column("strategies", postgresql.JSONB(), nullable=True),
        sa.Column("funding_type", sa.String(), nullable=True),
        sa.Column("can_close_days", sa.Integer(), nullable=True),
        sa.Column("proof_of_funds", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["contact_id"], ["contacts.id"]),
    )
    op.create_index("ix_buy_boxes_contact_id", "buy_boxes", ["contact_id"])
    op.create_index("ix_buy_boxes_created_by", "buy_boxes", ["created_by"])


def downgrade() -> None:
    op.drop_table("buy_boxes")
