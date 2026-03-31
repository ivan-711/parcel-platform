"""add billing infrastructure

Revision ID: 1642524fa0f6
Revises: d4a7e3b58f12
Create Date: 2026-03-30 09:44:33.967203

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '1642524fa0f6'
down_revision: Union[str, Sequence[str], None] = 'd4a7e3b58f12'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Enum types
plantier = sa.Enum("free", "starter", "pro", "team", name="plantier")
subscriptionstatus = sa.Enum(
    "trialing", "active", "past_due", "canceled",
    "unpaid", "incomplete", "paused",
    name="subscriptionstatus",
)


def upgrade() -> None:
    """Add billing tables, enums, and columns to support Stripe subscriptions."""

    # 1. Create enum types
    plantier.create(op.get_bind(), checkfirst=True)
    subscriptionstatus.create(op.get_bind(), checkfirst=True)

    # 2. Add billing columns to users
    op.add_column("users", sa.Column("stripe_customer_id", sa.String(), nullable=True))
    op.add_column("users", sa.Column("plan_tier", plantier, nullable=False, server_default="free"))
    op.add_column("users", sa.Column("trial_ends_at", sa.DateTime(), nullable=True))
    op.create_index("ix_users_stripe_customer_id", "users", ["stripe_customer_id"], unique=True)

    # 3. Create subscriptions table
    op.create_table(
        "subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("stripe_subscription_id", sa.String(), nullable=True),
        sa.Column("stripe_customer_id", sa.String(), nullable=True),
        sa.Column("status", subscriptionstatus, nullable=False, server_default="active"),
        sa.Column("plan_tier", sa.String(20), nullable=False, server_default="free"),
        sa.Column("current_period_start", sa.DateTime(), nullable=True),
        sa.Column("current_period_end", sa.DateTime(), nullable=True),
        sa.Column("trial_start", sa.DateTime(), nullable=True),
        sa.Column("trial_end", sa.DateTime(), nullable=True),
        sa.Column("cancel_at_period_end", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("canceled_at", sa.DateTime(), nullable=True),
        sa.Column("cancel_reason", sa.String(), nullable=True),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_subscriptions_user_id", "subscriptions", ["user_id"])
    op.create_index("ix_subscriptions_stripe_subscription_id", "subscriptions", ["stripe_subscription_id"], unique=True)
    op.create_index("ix_subscriptions_stripe_customer_id", "subscriptions", ["stripe_customer_id"])

    # Partial unique index: only one active/trialing/past_due subscription per user
    op.execute(
        "CREATE UNIQUE INDEX ix_subscriptions_one_active "
        "ON subscriptions (user_id) "
        "WHERE status IN ('active', 'trialing', 'past_due')"
    )

    # 4. Create usage_records table
    op.create_table(
        "usage_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("metric", sa.String(50), nullable=False),
        sa.Column("period_start", sa.DateTime(), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False, server_default="1"),
    )
    op.create_index("ix_usage_records_user_id", "usage_records", ["user_id"])
    op.create_index(
        "ix_usage_records_user_metric_period",
        "usage_records",
        ["user_id", "metric", "period_start"],
    )

    # 5. Create webhook_events table
    op.create_table(
        "webhook_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("stripe_event_id", sa.String(), nullable=False),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column("processed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("processed_at", sa.DateTime(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_webhook_events_stripe_event_id", "webhook_events", ["stripe_event_id"], unique=True)
    op.create_index("ix_webhook_events_event_type", "webhook_events", ["event_type"])

    # 6. Seed existing users with free tier
    op.execute("UPDATE users SET plan_tier = 'free' WHERE plan_tier IS NULL")


def downgrade() -> None:
    """Remove billing tables, columns, and enum types."""

    # Drop tables in reverse order
    op.drop_index("ix_webhook_events_event_type", table_name="webhook_events")
    op.drop_index("ix_webhook_events_stripe_event_id", table_name="webhook_events")
    op.drop_table("webhook_events")

    op.drop_index("ix_usage_records_user_metric_period", table_name="usage_records")
    op.drop_index("ix_usage_records_user_id", table_name="usage_records")
    op.drop_table("usage_records")

    op.drop_index("ix_subscriptions_one_active", table_name="subscriptions")
    op.drop_index("ix_subscriptions_stripe_customer_id", table_name="subscriptions")
    op.drop_index("ix_subscriptions_stripe_subscription_id", table_name="subscriptions")
    op.drop_index("ix_subscriptions_user_id", table_name="subscriptions")
    op.drop_table("subscriptions")

    # Remove billing columns from users
    op.drop_index("ix_users_stripe_customer_id", table_name="users")
    op.drop_column("users", "trial_ends_at")
    op.drop_column("users", "plan_tier")
    op.drop_column("users", "stripe_customer_id")

    # Drop enum types
    subscriptionstatus.drop(op.get_bind(), checkfirst=True)
    plantier.drop(op.get_bind(), checkfirst=True)
