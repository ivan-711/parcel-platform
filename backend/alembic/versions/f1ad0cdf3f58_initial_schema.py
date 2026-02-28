"""initial_schema — creates all Parcel tables and enum types.

Revision ID: f1ad0cdf3f58
Revises:
Create Date: 2026-02-28 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f1ad0cdf3f58"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all enums and tables."""
    # --- Enums ---
    op.execute("CREATE TYPE userrole AS ENUM ('wholesaler', 'investor', 'agent')")
    op.execute("CREATE TYPE teammemberrole AS ENUM ('owner', 'analyst', 'viewer')")
    op.execute("CREATE TYPE propertytype AS ENUM ('single_family', 'duplex', 'triplex', 'quad', 'commercial')")
    op.execute("CREATE TYPE dealstrategy AS ENUM ('wholesale', 'creative_finance', 'brrrr', 'buy_and_hold', 'flip')")
    op.execute("CREATE TYPE dealstatus AS ENUM ('draft', 'saved', 'shared')")
    op.execute("CREATE TYPE pipelinestage AS ENUM ('lead', 'analyzing', 'offer_sent', 'under_contract', 'due_diligence', 'closed', 'dead')")
    op.execute("CREATE TYPE doctype AS ENUM ('purchase_agreement', 'lease', 'assignment', 'subject_to', 'seller_finance', 'other')")
    op.execute("CREATE TYPE processingstatus AS ENUM ('pending', 'processing', 'ready', 'error')")
    op.execute("CREATE TYPE messagerole AS ENUM ('user', 'assistant')")
    op.execute("CREATE TYPE contexttype AS ENUM ('general', 'deal', 'document')")

    # --- teams (created before users to resolve circular ref; FK added after users) ---
    op.create_table(
        "teams",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # --- users (FK → teams) ---
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("role", sa.Enum("wholesaler", "investor", "agent", name="userrole", create_type=False), nullable=False),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # Resolve circular FK: teams.created_by → users
    op.create_foreign_key("fk_teams_created_by_users", "teams", "users", ["created_by"], ["id"])

    # --- team_members ---
    op.create_table(
        "team_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", sa.Enum("owner", "analyst", "viewer", name="teammemberrole", create_type=False), nullable=False),
        sa.Column("joined_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # --- deals ---
    op.create_table(
        "deals",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("address", sa.String(), nullable=False),
        sa.Column("zip_code", sa.String(), nullable=False),
        sa.Column("property_type", sa.Enum("single_family", "duplex", "triplex", "quad", "commercial", name="propertytype", create_type=False), nullable=False),
        sa.Column("strategy", sa.Enum("wholesale", "creative_finance", "brrrr", "buy_and_hold", "flip", name="dealstrategy", create_type=False), nullable=False),
        sa.Column("inputs", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("outputs", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("risk_score", sa.Integer(), nullable=True),
        sa.Column("status", sa.Enum("draft", "saved", "shared", name="dealstatus", create_type=False), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_deals_user_id", "deals", ["user_id"])

    # --- pipeline_entries ---
    op.create_table(
        "pipeline_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("deal_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("stage", sa.Enum("lead", "analyzing", "offer_sent", "under_contract", "due_diligence", "closed", "dead", name="pipelinestage", create_type=False), nullable=False),
        sa.Column("entered_stage_at", sa.DateTime(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["deal_id"], ["deals.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_pipeline_entries_deal_id", "pipeline_entries", ["deal_id"])
    op.create_index("ix_pipeline_entries_user_id", "pipeline_entries", ["user_id"])

    # --- documents ---
    op.create_table(
        "documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("filename", sa.String(), nullable=False),
        sa.Column("file_url", sa.String(), nullable=False),
        sa.Column("file_type", sa.String(), nullable=False),
        sa.Column("doc_type", sa.Enum("purchase_agreement", "lease", "assignment", "subject_to", "seller_finance", "other", name="doctype", create_type=False), nullable=False),
        sa.Column("ai_summary", sa.Text(), nullable=True),
        sa.Column("ai_risk_flags", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("ai_key_terms", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("processing_status", sa.Enum("pending", "processing", "ready", "error", name="processingstatus", create_type=False), nullable=False),
        sa.Column("deal_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["deal_id"], ["deals.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_documents_user_id", "documents", ["user_id"])

    # --- chat_messages ---
    op.create_table(
        "chat_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_id", sa.String(), nullable=False),
        sa.Column("role", sa.Enum("user", "assistant", name="messagerole", create_type=False), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("context_type", sa.Enum("general", "deal", "document", name="contexttype", create_type=False), nullable=True),
        sa.Column("context_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_chat_messages_user_id", "chat_messages", ["user_id"])
    op.create_index("ix_chat_messages_session_id", "chat_messages", ["session_id"])

    # --- portfolio_entries ---
    op.create_table(
        "portfolio_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("deal_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("closed_date", sa.Date(), nullable=False),
        sa.Column("closed_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("profit", sa.Numeric(12, 2), nullable=False),
        sa.Column("monthly_cash_flow", sa.Numeric(12, 2), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["deal_id"], ["deals.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_portfolio_entries_deal_id", "portfolio_entries", ["deal_id"])
    op.create_index("ix_portfolio_entries_user_id", "portfolio_entries", ["user_id"])


def downgrade() -> None:
    """Drop all tables and enums."""
    op.drop_table("portfolio_entries")
    op.drop_table("chat_messages")
    op.drop_table("documents")
    op.drop_table("pipeline_entries")
    op.drop_table("deals")
    op.drop_table("team_members")
    op.drop_constraint("fk_teams_created_by_users", "teams", type_="foreignkey")
    op.drop_table("users")
    op.drop_table("teams")

    op.execute("DROP TYPE IF EXISTS contexttype")
    op.execute("DROP TYPE IF EXISTS messagerole")
    op.execute("DROP TYPE IF EXISTS processingstatus")
    op.execute("DROP TYPE IF EXISTS doctype")
    op.execute("DROP TYPE IF EXISTS pipelinestage")
    op.execute("DROP TYPE IF EXISTS dealstatus")
    op.execute("DROP TYPE IF EXISTS dealstrategy")
    op.execute("DROP TYPE IF EXISTS propertytype")
    op.execute("DROP TYPE IF EXISTS teammemberrole")
    op.execute("DROP TYPE IF EXISTS userrole")
