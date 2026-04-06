"""Dual-write sync between Deal and Property/AnalysisScenario.

All functions are wrapped in try/except — sync failures never block deal CRUD.
Errors are logged to Sentry with full context (deal_id, property_id, error).

WARNING: This dual-write pattern can drift if one write succeeds and the other
fails. Errors are logged to Sentry for manual investigation. A future repair
job should scan for deals where property_id is null or scenario data is stale.
"""

import logging

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def _extract_typed_columns(strategy: str, inputs: dict) -> dict:
    """Extract typed columns from deal inputs for AnalysisScenario."""
    return {
        "purchase_price": inputs.get("purchase_price"),
        "after_repair_value": inputs.get("arv") or inputs.get("arv_post_rehab"),
        "repair_cost": inputs.get("repair_costs") or inputs.get("rehab_costs") or inputs.get("rehab_budget"),
        "monthly_rent": inputs.get("monthly_rent") or inputs.get("monthly_rent_estimate"),
        "down_payment_pct": inputs.get("down_payment_pct"),
        "interest_rate": inputs.get("interest_rate") or inputs.get("existing_interest_rate"),
        "loan_term_years": inputs.get("loan_term_years") or inputs.get("new_term_years"),
    }


def auto_create_property(deal, db: Session) -> None:
    """Create a Property from a deal's address if one doesn't exist.

    Safe to call multiple times — skips if deal already has a property_id.
    """
    try:
        if deal.property_id is not None:
            return

        from models.properties import Property

        # Parse address — deals store as "street, city state zip"
        address = deal.address or ""
        parts = address.rsplit(",", 1)
        line1 = parts[0].strip()
        rest = parts[1].strip() if len(parts) > 1 else ""
        tokens = rest.rsplit(" ", 2)
        city = tokens[0] if len(tokens) >= 3 else rest
        state = tokens[1] if len(tokens) >= 3 else "XX"

        prop = Property(
            created_by=deal.user_id,
            address_line1=line1,
            city=city,
            state=state[:2],
            zip_code=deal.zip_code or "",
            property_type=deal.property_type,
            status="under_analysis",
        )
        db.add(prop)
        db.flush()

        deal.property_id = prop.id
        deal.deal_type = deal.deal_type or "acquisition"
        logger.info("Auto-created property %s for deal %s", prop.id, deal.id)
    except Exception:
        logger.exception("SYNC DRIFT: Failed to auto-create property for deal %s (user=%s)", deal.id, deal.user_id)


def sync_deal_to_scenario(deal, db: Session) -> None:
    """Create or update the primary AnalysisScenario from a deal's data.

    Safe to call on every deal create/update. Idempotent.
    """
    try:
        if deal.property_id is None:
            return  # can't create scenario without a property

        from models.analysis_scenarios import AnalysisScenario

        # Find existing scenario linked to this deal
        scenario = (
            db.query(AnalysisScenario)
            .filter(AnalysisScenario.deal_id == deal.id)
            .first()
        )

        typed = _extract_typed_columns(deal.strategy, deal.inputs or {})
        typed_clean = {k: v for k, v in typed.items() if v is not None}

        if scenario:
            # Update existing
            scenario.strategy = deal.strategy
            scenario.outputs = deal.outputs or {}
            scenario.risk_score = deal.risk_score
            for key, value in typed_clean.items():
                setattr(scenario, key, value)
            logger.debug("Updated scenario %s for deal %s", scenario.id, deal.id)
        else:
            # Create new
            scenario = AnalysisScenario(
                property_id=deal.property_id,
                deal_id=deal.id,
                created_by=deal.user_id,
                strategy=deal.strategy,
                outputs=deal.outputs or {},
                risk_score=deal.risk_score,
                **typed_clean,
            )
            db.add(scenario)
            logger.info("Created scenario for deal %s", deal.id)

        db.flush()
    except Exception:
        logger.exception("SYNC DRIFT: Failed to sync deal %s to scenario (property=%s)", deal.id, deal.property_id)


def soft_delete_linked_scenario(deal, db: Session) -> None:
    """Soft-delete the AnalysisScenario linked to a deal."""
    try:
        from models.analysis_scenarios import AnalysisScenario

        db.query(AnalysisScenario).filter(
            AnalysisScenario.deal_id == deal.id,
        ).update({"is_deleted": True})
        db.flush()
    except Exception:
        logger.exception("Failed to soft-delete scenario for deal %s", deal.id)
