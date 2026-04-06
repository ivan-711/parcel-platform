"""Add properties, analysis_scenarios tables + deal property_id/deal_type columns.

Revision ID: a1b2c3d4e5f6
Revises: f2b1c3d4e5f6
Create Date: 2026-04-03

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "a1b2c3d4e5f6"
down_revision = "f2b1c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- properties ---
    op.create_table(
        "properties",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("address_line1", sa.String(), nullable=False),
        sa.Column("address_line2", sa.String(), nullable=True),
        sa.Column("city", sa.String(), nullable=False),
        sa.Column("state", sa.String(2), nullable=False),
        sa.Column("zip_code", sa.String(10), nullable=False),
        sa.Column("county", sa.String(), nullable=True),
        sa.Column("property_type", sa.String(), nullable=True),
        sa.Column("bedrooms", sa.Integer(), nullable=True),
        sa.Column("bathrooms", sa.Numeric(3, 1), nullable=True),
        sa.Column("sqft", sa.Integer(), nullable=True),
        sa.Column("lot_sqft", sa.Integer(), nullable=True),
        sa.Column("year_built", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="prospect"),
        sa.Column("data_sources", postgresql.JSONB(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    # PostGIS geometry column — skip if PostGIS is not available (e.g. Railway)
    conn = op.get_bind()
    conn.execute(sa.text("SAVEPOINT sp_postgis_col"))
    try:
        op.execute(
            "ALTER TABLE properties ADD COLUMN location geometry(POINT, 4326)"
        )
        conn.execute(sa.text("RELEASE SAVEPOINT sp_postgis_col"))
        has_postgis = True
    except Exception:
        conn.execute(sa.text("ROLLBACK TO SAVEPOINT sp_postgis_col"))
        conn.execute(sa.text("RELEASE SAVEPOINT sp_postgis_col"))
        has_postgis = False
    op.create_index("ix_properties_created_by", "properties", ["created_by"])
    op.create_index("ix_properties_status", "properties", ["status"])
    op.create_index("ix_properties_data_sources", "properties", ["data_sources"], postgresql_using="gin")
    if has_postgis:
        op.create_index("ix_properties_location", "properties", ["location"], postgresql_using="gist")

    # --- analysis_scenarios ---
    op.create_table(
        "analysis_scenarios",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("property_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("deal_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("strategy", sa.String(), nullable=False),
        sa.Column("purchase_price", sa.Numeric(12, 2), nullable=True),
        sa.Column("after_repair_value", sa.Numeric(12, 2), nullable=True),
        sa.Column("repair_cost", sa.Numeric(12, 2), nullable=True),
        sa.Column("monthly_rent", sa.Numeric(10, 2), nullable=True),
        sa.Column("down_payment_pct", sa.Numeric(5, 2), nullable=True),
        sa.Column("interest_rate", sa.Numeric(5, 3), nullable=True),
        sa.Column("loan_term_years", sa.Integer(), nullable=True),
        sa.Column("inputs_extended", postgresql.JSONB(), nullable=True),
        sa.Column("outputs", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("risk_score", sa.Numeric(4, 2), nullable=True),
        sa.Column("risk_flags", postgresql.JSONB(), nullable=True),
        sa.Column("ai_narrative", sa.Text(), nullable=True),
        sa.Column("ai_narrative_generated_at", sa.DateTime(), nullable=True),
        sa.Column("source_confidence", postgresql.JSONB(), nullable=True),
        sa.Column("is_snapshot", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("parent_scenario_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["property_id"], ["properties.id"]),
        sa.ForeignKeyConstraint(["deal_id"], ["deals.id"]),
        sa.ForeignKeyConstraint(["parent_scenario_id"], ["analysis_scenarios.id"]),
    )
    op.create_index("ix_scenarios_property_id", "analysis_scenarios", ["property_id"])
    op.create_index("ix_scenarios_created_by", "analysis_scenarios", ["created_by"])
    op.create_index("ix_scenarios_strategy", "analysis_scenarios", ["strategy"])
    op.create_index("ix_scenarios_outputs", "analysis_scenarios", ["outputs"], postgresql_using="gin")
    op.create_index("ix_scenarios_risk_flags", "analysis_scenarios", ["risk_flags"], postgresql_using="gin")

    # --- deals: add property_id + deal_type ---
    op.add_column("deals", sa.Column("property_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("deals", sa.Column("deal_type", sa.String(), nullable=True))
    op.create_foreign_key("fk_deals_property_id", "deals", "properties", ["property_id"], ["id"])
    op.create_index("ix_deals_property_id", "deals", ["property_id"])


def downgrade() -> None:
    op.drop_index("ix_deals_property_id", table_name="deals")
    op.drop_constraint("fk_deals_property_id", "deals", type_="foreignkey")
    op.drop_column("deals", "deal_type")
    op.drop_column("deals", "property_id")
    op.drop_table("analysis_scenarios")
    op.drop_table("properties")
