#!/usr/bin/env python3
"""Backfill risk_score and risk_factors for deals with missing or zero values.

Usage:
    cd backend && source venv/bin/activate && python scripts/backfill_risk_scores.py
"""

import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Path setup — ensure backend/ is importable regardless of cwd
# ---------------------------------------------------------------------------
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from dotenv import load_dotenv

load_dotenv(_BACKEND_DIR / ".env")

# ---------------------------------------------------------------------------
# Project imports
# ---------------------------------------------------------------------------
try:
    from sqlalchemy import or_

    from database import SessionLocal
    from models.deals import Deal
    from core.calculators.risk_score import calculate_risk_score
    from routers.deals import build_risk_factors
except ImportError as exc:
    print(f"\n  IMPORT ERROR: {exc}")
    print("  Make sure you run from the backend directory with deps installed:")
    print("    cd backend && source venv/bin/activate && python scripts/backfill_risk_scores.py\n")
    sys.exit(1)


def backfill() -> None:
    """Re-compute risk_score and risk_factors for deals with missing values."""
    db = SessionLocal()
    try:
        deals = db.query(Deal).filter(
            or_(
                Deal.risk_score == 0,
                Deal.risk_score.is_(None),
                Deal.risk_factors.is_(None),
            ),
            Deal.deleted_at.is_(None),
        ).all()

        print(f"\n  Found {len(deals)} deals to backfill\n")

        updated = 0
        skipped = 0
        for deal in deals:
            if not deal.inputs or not deal.outputs:
                print(f"  SKIP  {deal.id} — empty inputs/outputs")
                skipped += 1
                continue

            new_score = calculate_risk_score(
                deal.strategy, deal.inputs, deal.outputs,
            )
            new_factors = build_risk_factors(
                deal.strategy, deal.inputs, deal.outputs, new_score,
            )

            deal.risk_score = new_score
            deal.risk_factors = new_factors
            updated += 1
            print(
                f"  OK    {deal.id} | {deal.strategy:18s} | "
                f"{deal.address[:40]:40s} | risk_score={new_score}"
            )

        db.commit()
        print(f"\n  Done. Updated: {updated}, Skipped: {skipped}\n")

    except Exception as exc:
        db.rollback()
        print(f"\n  ERROR: {exc}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    backfill()
