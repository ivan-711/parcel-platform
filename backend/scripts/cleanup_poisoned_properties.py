"""One-time cleanup: delete properties created during the RENTCAST_API_KEY outage.

These properties have no enrichment data (no bedrooms, no sqft, no data_sources)
and their scenarios have no purchase_price. Their dedup records prevent re-analysis.

Run via: python3 scripts/cleanup_poisoned_properties.py [DATABASE_URL]
  - Inside Railway container: uses DATABASE_URL from env
  - Locally: pass the public Postgres URL as an argument
"""

import os
import sys

# Add parent dir so imports work when run from backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Allow DATABASE_URL override via CLI argument
if len(sys.argv) > 1:
    os.environ["DATABASE_URL"] = sys.argv[1]

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

_url = os.environ.get("DATABASE_URL")
if not _url:
    print("ERROR: DATABASE_URL not set. Pass it as an argument or set the env var.")
    sys.exit(1)

engine = create_engine(_url)
SessionLocal = sessionmaker(bind=engine)

db = SessionLocal()

try:
    # 1. Find poisoned properties: no physical data AND not sample data
    poisoned = db.execute(text("""
        SELECT p.id, p.address_line1, p.city, p.state, p.zip_code, p.created_at
        FROM properties p
        WHERE p.bedrooms IS NULL
          AND p.sqft IS NULL
          AND p.property_type IS NULL
          AND p.is_sample = false
          AND p.is_deleted = false
    """)).fetchall()

    if not poisoned:
        print("No poisoned properties found. Nothing to clean up.")
        sys.exit(0)

    print(f"Found {len(poisoned)} poisoned properties:")
    for row in poisoned:
        print(f"  {row.id} — {row.address_line1}, {row.city} {row.state} {row.zip_code} (created {row.created_at})")

    ids = [row.id for row in poisoned]

    # 2. Delete FK-dependent rows (order matters: children before parents)
    fk_tables = [
        "data_source_events",
        "analysis_scenarios",
        "transactions",
        "payments",
        "obligations",
        "financing_instruments",
        "rehab_projects",
        "buyer_packets",
        "documents",
        "tasks",
        "communications",
        "skip_traces",
        "mail_campaigns",
        "reports",
    ]

    for table in fk_tables:
        result = db.execute(
            text(f"DELETE FROM {table} WHERE property_id = ANY(:ids)"),
            {"ids": ids},
        )
        if result.rowcount > 0:
            print(f"  Deleted {result.rowcount} rows from {table}")

    # Deals have nullable property_id — null it out instead of deleting the deal
    result = db.execute(
        text("UPDATE deals SET property_id = NULL WHERE property_id = ANY(:ids)"),
        {"ids": ids},
    )
    if result.rowcount > 0:
        print(f"  Unlinked {result.rowcount} deals from poisoned properties")

    # 3. Delete the poisoned properties
    result = db.execute(
        text("DELETE FROM properties WHERE id = ANY(:ids)"),
        {"ids": ids},
    )
    print(f"  Deleted {result.rowcount} poisoned properties")

    db.commit()

    # 4. Verify
    remaining = db.execute(text("""
        SELECT count(*) FROM properties
        WHERE bedrooms IS NULL AND sqft IS NULL AND property_type IS NULL
          AND is_sample = false AND is_deleted = false
    """)).scalar()
    print(f"\nVerification: {remaining} poisoned properties remaining (should be 0)")

except Exception as e:
    db.rollback()
    print(f"ERROR: {e}")
    raise
finally:
    db.close()
