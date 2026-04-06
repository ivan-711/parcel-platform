"""Add financing_instruments, obligations, and payments tables.

Revision ID: j0e1f2g3h4i5
Revises: i9d0e1f2g3h4
Create Date: 2026-04-04
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "j0e1f2g3h4i5"
down_revision: Union[str, Sequence[str], None] = "i9d0e1f2g3h4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -- financing_instruments --
    op.create_table(
        "financing_instruments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        # Ownership
        sa.Column("property_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("deal_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=True),
        # Identity
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("instrument_type", sa.String(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        # Core terms
        sa.Column("original_balance", sa.Numeric(14, 2), nullable=True),
        sa.Column("current_balance", sa.Numeric(14, 2), nullable=True),
        sa.Column("interest_rate", sa.Numeric(6, 4), nullable=True),
        sa.Column("rate_type", sa.String(), nullable=True),
        sa.Column("term_months", sa.Integer(), nullable=True),
        sa.Column("amortization_months", sa.Integer(), nullable=True),
        sa.Column("monthly_payment", sa.Numeric(10, 2), nullable=True),
        # Dates
        sa.Column("origination_date", sa.Date(), nullable=True),
        sa.Column("maturity_date", sa.Date(), nullable=True),
        sa.Column("first_payment_date", sa.Date(), nullable=True),
        # Balloon
        sa.Column("has_balloon", sa.Boolean(), nullable=True, server_default="false"),
        sa.Column("balloon_date", sa.Date(), nullable=True),
        sa.Column("balloon_amount", sa.Numeric(14, 2), nullable=True),
        # Sub-to
        sa.Column("is_sub_to", sa.Boolean(), nullable=True, server_default="false"),
        sa.Column("original_borrower", sa.String(), nullable=True),
        sa.Column("servicer", sa.String(), nullable=True),
        sa.Column("loan_number_last4", sa.String(4), nullable=True),
        sa.Column("due_on_sale_risk", sa.String(), nullable=True),
        # Wrap
        sa.Column("is_wrap", sa.Boolean(), nullable=True, server_default="false"),
        sa.Column("underlying_instrument_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("wrap_rate", sa.Numeric(6, 4), nullable=True),
        sa.Column("wrap_payment", sa.Numeric(10, 2), nullable=True),
        # Lease option
        sa.Column("option_consideration", sa.Numeric(10, 2), nullable=True),
        sa.Column("option_expiration", sa.Date(), nullable=True),
        sa.Column("monthly_credit", sa.Numeric(10, 2), nullable=True),
        sa.Column("strike_price", sa.Numeric(14, 2), nullable=True),
        # Seller finance
        sa.Column("down_payment", sa.Numeric(14, 2), nullable=True),
        sa.Column("late_fee_pct", sa.Numeric(5, 2), nullable=True),
        sa.Column("late_fee_grace_days", sa.Integer(), nullable=True),
        sa.Column("prepayment_penalty", sa.Boolean(), nullable=True, server_default="false"),
        # Insurance/escrow
        sa.Column("requires_insurance", sa.Boolean(), nullable=True, server_default="true"),
        sa.Column("insurance_verified_date", sa.Date(), nullable=True),
        sa.Column("escrow_amount", sa.Numeric(10, 2), nullable=True),
        # Extended
        sa.Column("terms_extended", postgresql.JSONB(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        # Constraints
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["property_id"], ["properties.id"]),
        sa.ForeignKeyConstraint(["deal_id"], ["deals.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["underlying_instrument_id"], ["financing_instruments.id"]),
    )
    op.create_index("ix_financing_instruments_property_id", "financing_instruments", ["property_id"])
    op.create_index("ix_financing_instruments_deal_id", "financing_instruments", ["deal_id"])
    op.create_index("ix_financing_instruments_property_status", "financing_instruments", ["property_id", "status"])

    # -- obligations --
    op.create_table(
        "obligations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        # Ownership
        sa.Column("instrument_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("property_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=True),
        # Details
        sa.Column("obligation_type", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        # Amount
        sa.Column("amount", sa.Numeric(14, 2), nullable=True),
        sa.Column("amount_type", sa.String(), nullable=True),
        # Schedule
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("recurrence", sa.String(), nullable=True),
        sa.Column("recurrence_day", sa.Integer(), nullable=True),
        sa.Column("next_due", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        # Status
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        # Alert settings
        sa.Column("alert_days_before", postgresql.JSONB(), nullable=True),
        sa.Column("severity", sa.String(), nullable=False, server_default="normal"),
        # Constraints
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["instrument_id"], ["financing_instruments.id"]),
        sa.ForeignKeyConstraint(["property_id"], ["properties.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
    )
    op.create_index("ix_obligations_instrument_id", "obligations", ["instrument_id"])
    op.create_index("ix_obligations_property_id", "obligations", ["property_id"])

    # -- payments --
    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        # Ownership
        sa.Column("instrument_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("obligation_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("property_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=True),
        # Details
        sa.Column("payment_type", sa.String(), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("principal_portion", sa.Numeric(14, 2), nullable=True),
        sa.Column("interest_portion", sa.Numeric(14, 2), nullable=True),
        sa.Column("escrow_portion", sa.Numeric(14, 2), nullable=True),
        # Tracking
        sa.Column("payment_date", sa.Date(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("is_late", sa.Boolean(), nullable=True, server_default="false"),
        sa.Column("late_fee_amount", sa.Numeric(10, 2), nullable=True),
        # Source
        sa.Column("payment_method", sa.String(), nullable=True),
        sa.Column("confirmation_number", sa.String(), nullable=True),
        # Direction
        sa.Column("direction", sa.String(), nullable=False, server_default="outgoing"),
        sa.Column("notes", sa.Text(), nullable=True),
        # Constraints
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["instrument_id"], ["financing_instruments.id"]),
        sa.ForeignKeyConstraint(["obligation_id"], ["obligations.id"]),
        sa.ForeignKeyConstraint(["property_id"], ["properties.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
    )
    op.create_index("ix_payments_instrument_id", "payments", ["instrument_id"])
    op.create_index("ix_payments_obligation_id", "payments", ["obligation_id"])
    op.create_index("ix_payments_property_id", "payments", ["property_id"])


def downgrade() -> None:
    op.drop_table("payments")
    op.drop_table("obligations")
    op.drop_table("financing_instruments")
