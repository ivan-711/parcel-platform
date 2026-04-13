"""Analysis router — quick property analysis, narrative generation, and SSE streaming."""

import asyncio
import json
import logging
import time
from datetime import datetime
from typing import AsyncGenerator
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from core.billing.tier_gate import require_quota, record_usage
from core.security.jwt import get_current_user
from database import get_db
from limiter import limiter
from models.analysis_scenarios import AnalysisScenario
from models.users import User
from schemas.analysis import (
    CompareRequest,
    CompareResponse,
    EnrichmentDetails,
    NarrativeResponse,
    PropertyResponse,
    ProviderStatusResponse,
    QuickAnalysisRequest,
    QuickAnalysisResponse,
    RegenerateNarrativeRequest,
    ScenarioResponse,
    StrategyResult,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["analysis"])


def _run_calculator_on_scenario(scenario: AnalysisScenario, db: Session) -> None:
    """Run the appropriate calculator on a scenario and persist outputs.

    Builds calculator-compatible inputs from the scenario's typed columns + extended inputs,
    translating field names where needed. Fails silently if required inputs are missing.
    """
    import importlib

    strategy = scenario.strategy
    if not strategy:
        return

    # Build inputs dict from scenario fields, translating to calculator key names
    inputs: dict = {}

    # Typed columns → calculator keys (some calculators use different names)
    if scenario.purchase_price is not None:
        inputs["purchase_price"] = float(scenario.purchase_price)
    if scenario.monthly_rent is not None:
        # buy_and_hold uses "monthly_rent", creative_finance uses "monthly_rent_estimate"
        if strategy == "creative_finance":
            inputs["monthly_rent_estimate"] = float(scenario.monthly_rent)
        else:
            inputs["monthly_rent"] = float(scenario.monthly_rent)
    if scenario.after_repair_value is not None:
        if strategy == "brrrr":
            inputs["arv_post_rehab"] = float(scenario.after_repair_value)
        else:
            inputs["arv"] = float(scenario.after_repair_value)
    if scenario.repair_cost is not None:
        if strategy == "flip":
            inputs["rehab_budget"] = float(scenario.repair_cost)
        elif strategy == "brrrr":
            inputs["rehab_costs"] = float(scenario.repair_cost)
        else:
            inputs["repair_costs"] = float(scenario.repair_cost)
    if scenario.down_payment_pct is not None:
        inputs["down_payment_pct"] = float(scenario.down_payment_pct)
    if scenario.interest_rate is not None:
        if strategy == "creative_finance":
            inputs["new_rate"] = float(scenario.interest_rate)
            inputs["existing_interest_rate"] = float(scenario.interest_rate)
        elif strategy == "brrrr":
            inputs["new_loan_rate"] = float(scenario.interest_rate)
        else:
            inputs["interest_rate"] = float(scenario.interest_rate)
    if scenario.loan_term_years is not None:
        if strategy == "brrrr":
            inputs["new_loan_term_years"] = scenario.loan_term_years
        elif strategy == "creative_finance":
            inputs["new_term_years"] = scenario.loan_term_years
        else:
            inputs["loan_term_years"] = scenario.loan_term_years

    # Merge extended inputs (these already use calculator key names)
    if scenario.inputs_extended:
        inputs.update(scenario.inputs_extended)

    # Apply sensible defaults for required fields that are still missing
    _apply_strategy_defaults(strategy, inputs)

    try:
        calc_mod = importlib.import_module(f"core.calculators.{strategy}")
        calc_fn = getattr(calc_mod, f"calculate_{strategy}")
        risk_mod = importlib.import_module("core.calculators.risk_score")

        outputs = calc_fn(inputs)
        risk_score = risk_mod.calculate_risk_score(strategy, inputs, outputs)

        scenario.outputs = outputs
        scenario.risk_score = risk_score
        db.flush()
        logger.info("Calculated outputs for scenario %s (strategy=%s)", scenario.id, strategy)
    except Exception as e:
        logger.warning("Calculator failed for scenario %s: %s", scenario.id, e)


def _apply_strategy_defaults(strategy: str, inputs: dict) -> None:
    """Fill in sensible defaults for missing required calculator fields."""
    if strategy == "buy_and_hold":
        inputs.setdefault("down_payment_pct", 20)
        inputs.setdefault("interest_rate", 7.25)
        inputs.setdefault("loan_term_years", 30)
        inputs.setdefault("vacancy_rate_pct", 8)
        inputs.setdefault("maintenance_pct", 5)
        inputs.setdefault("mgmt_fee_pct", 8)
        inputs.setdefault("monthly_taxes", 0)
        inputs.setdefault("monthly_insurance", 0)
    elif strategy == "wholesale":
        inputs.setdefault("desired_profit", 10000)
        inputs.setdefault("closing_costs_pct", 3)
        inputs.setdefault("asking_price", inputs.get("purchase_price", 0))
        inputs.setdefault("arv", inputs.get("purchase_price", 0))
        inputs.setdefault("repair_costs", 0)
    elif strategy == "flip":
        inputs.setdefault("holding_months", 5)
        inputs.setdefault("selling_costs_pct", 8)
        inputs.setdefault("financing_costs", 0)
        # Fallback ARV to purchase price when Bricked doesn't return data
        inputs.setdefault("arv", inputs.get("purchase_price", 0))
        inputs.setdefault("rehab_budget", 0)
    elif strategy == "brrrr":
        inputs.setdefault("refinance_ltv_pct", 75)
        inputs.setdefault("new_loan_rate", 7.25)
        inputs.setdefault("new_loan_term_years", 30)
        inputs.setdefault("monthly_expenses", 400)
        # Fallback ARV to purchase price when Bricked doesn't return data
        inputs.setdefault("arv_post_rehab", inputs.get("purchase_price", 0))
        inputs.setdefault("rehab_costs", 0)
    elif strategy == "creative_finance":
        inputs.setdefault("existing_loan_balance", inputs.get("purchase_price", 0) * 0.8)
        inputs.setdefault("monthly_piti", 0)
        inputs.setdefault("monthly_expenses", 300)
        inputs.setdefault("finance_type", "subject_to")
        inputs.setdefault("new_term_years", 25)


def _build_enrichment_details(enrichment, latency_ms: int) -> EnrichmentDetails:
    """Build EnrichmentDetails from an EnrichmentResult."""
    provider_statuses = {}
    for name, ps in enrichment.provider_statuses.items():
        provider_statuses[name] = ProviderStatusResponse(
            provider=ps.provider,
            status=ps.status,
            latency_ms=ps.latency_ms,
            error=ps.error,
            fields_populated=ps.fields_populated,
        )
    return EnrichmentDetails(
        status=enrichment.status,
        is_existing=enrichment.is_existing,
        fields_populated=enrichment.fields_populated,
        fields_missing=enrichment.fields_missing,
        confidence=enrichment.confidence,
        provider_statuses=provider_statuses,
        latency_ms=latency_ms,
    )


async def _generate_narrative(scenario, prop, experience_level: str = "intermediate") -> NarrativeResponse:
    """Generate AI narrative, store on scenario. Returns NarrativeResponse (never raises)."""
    try:
        from core.ai.deal_narrator import narrate, get_inputs_hash

        result = await narrate(scenario, prop, experience_level)

        if result.narrative:
            scenario.ai_narrative = result.narrative
            scenario.ai_narrative_generated_at = datetime.utcnow()

        return NarrativeResponse(
            narrative=result.narrative or None,
            confidence=result.confidence,
            assumptions_stated=result.assumptions_stated,
            risks_flagged=result.risks_flagged,
            missing_data=result.missing_data,
            tokens_used=result.tokens_used,
            latency_ms=result.latency_ms,
        )
    except Exception:
        logger.exception("Narrative generation failed")
        return NarrativeResponse(confidence="low")


# ---------------------------------------------------------------------------
# POST /api/analysis/quick — synchronous analysis with narrative
# ---------------------------------------------------------------------------

@router.post("/quick", response_model=QuickAnalysisResponse, status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def quick_analysis(
    request: Request,
    body: QuickAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _quota: None = Depends(require_quota("analyses_per_month")),
) -> QuickAnalysisResponse:
    """Analyze a property by address with AI narrative.

    Flow: parse address → enrich via RentCast → create Property + Scenario → generate AI narrative.
    AI failure never blocks — returns analysis without narrative.
    """
    start = time.time()

    from core.telemetry import track_event
    track_event(current_user.id, "analysis_started", {"address_provided": True})

    # Validate address
    from core.property_data.address_parser import parse_address
    parsed = parse_address(body.address)
    if not parsed.address_line1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "Could not parse address. Please check the format and try again.",
                "code": "ADDRESS_PARSE_FAILED",
            },
        )

    # Validate strategy is from allowed set
    VALID_STRATEGIES = {"wholesale", "buy_and_hold", "flip", "brrrr", "creative_finance"}
    strategy = body.strategy or "buy_and_hold"
    if strategy not in VALID_STRATEGIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": f"Invalid strategy. Must be one of: {', '.join(sorted(VALID_STRATEGIES))}", "code": "INVALID_STRATEGY"},
        )

    # Determine which providers to use based on tier
    from core.billing.tier_gate import get_tier_limits, _get_usage_count
    limits = get_tier_limits(current_user)
    bricked_limit = limits.bricked_lookups_per_month
    include_bricked = (
        bricked_limit is None
        or _get_usage_count(current_user.id, "bricked_lookups_per_month", db) < bricked_limit
    )
    providers = ["rentcast", "bricked"] if include_bricked else ["rentcast"]

    # Run enrichment
    from core.property_data.service import enrich_property
    enrichment = enrich_property(
        address=body.address,
        user_id=current_user.id,
        db=db,
        default_strategy=strategy,
        providers=providers,
    )

    # Persist client-side geocoding data if provided
    if enrichment.property and (body.lat is not None and body.lng is not None):
        enrichment.property.latitude = body.lat
        enrichment.property.longitude = body.lng
    if enrichment.property and body.place_id:
        enrichment.property.place_id = body.place_id

    if not enrichment.is_existing:
        record_usage(current_user.id, "analyses_per_month", db)
        # Track Bricked usage if it was called and succeeded
        bricked_ps = enrichment.provider_statuses.get("bricked")
        if bricked_ps and bricked_ps.status == "success":
            record_usage(current_user.id, "bricked_lookups_per_month", db)

    # Run calculator on scenario to populate outputs (including re-analysis)
    if enrichment.scenario:
        _run_calculator_on_scenario(enrichment.scenario, db)

    db.commit()

    # Auto-archive sample data if user has enough real properties
    if not enrichment.is_existing:
        try:
            from core.onboarding.auto_archive import check_and_archive_sample_data
            check_and_archive_sample_data(db, current_user.id)
            db.commit()
        except Exception:
            pass  # non-critical

    # Determine experience level from user's onboarding persona
    from core.onboarding.sample_deals import PERSONA_EXPERIENCE_LEVEL
    experience_level = PERSONA_EXPERIENCE_LEVEL.get(
        current_user.onboarding_persona or "", "intermediate"
    )

    # Generate AI narrative (non-blocking on failure)
    narrative_response = None
    if enrichment.scenario:
        narrative_response = await _generate_narrative(
            enrichment.scenario, enrichment.property, experience_level,
        )
        db.commit()  # persist ai_narrative on scenario

        track_event(current_user.id, "ai_narrative_generated", {
            "confidence": narrative_response.confidence,
            "experience_level": experience_level,
            "latency_ms": narrative_response.latency_ms,
            "tokens_used": narrative_response.tokens_used,
        })

    latency_ms = int((time.time() - start) * 1000)

    prop_response = PropertyResponse.model_validate(enrichment.property)
    scenario_response = None
    if enrichment.scenario:
        scenario_response = ScenarioResponse.model_validate(enrichment.scenario)

    enrichment_details = _build_enrichment_details(enrichment, latency_ms)

    # Auto-create draft deal
    deal_id = None
    if enrichment.property:
        deal_id = _auto_create_deal(db, current_user.id, enrichment.property, strategy)
        db.commit()

    track_event(current_user.id, "analysis_completed", {
        "enrichment_status": enrichment.status,
        "providers_used": list(enrichment.provider_statuses.keys()),
        "latency_ms": latency_ms,
        "has_narrative": narrative_response is not None and bool(narrative_response.narrative),
    })

    return QuickAnalysisResponse(
        property=prop_response,
        scenario=scenario_response,
        enrichment=enrichment_details,
        narrative=narrative_response,
        deal_id=deal_id,
    )


# ---------------------------------------------------------------------------
# POST /api/analysis/scenarios/{id}/regenerate-narrative
# ---------------------------------------------------------------------------

@router.post("/scenarios/{scenario_id}/regenerate-narrative", response_model=ScenarioResponse)
@limiter.limit("5/minute")
async def regenerate_narrative(
    request: Request,
    scenario_id: UUID,
    body: RegenerateNarrativeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ScenarioResponse:
    """Regenerate the AI narrative for a scenario.

    Called when the user edits inputs and wants fresh analysis.
    """
    scenario = (
        db.query(AnalysisScenario)
        .filter(
            AnalysisScenario.id == scenario_id,
            AnalysisScenario.created_by == current_user.id,
            AnalysisScenario.is_deleted == False,
        )
        .first()
    )

    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Scenario not found", "code": "SCENARIO_NOT_FOUND"},
        )

    # Load property for context
    from models.properties import Property
    prop = db.query(Property).filter(Property.id == scenario.property_id).first()

    experience_level = body.experience_level or "intermediate"
    narrative_resp = await _generate_narrative(scenario, prop, experience_level)
    db.commit()

    from core.telemetry import track_event
    track_event(current_user.id, "ai_narrative_regenerated", {
        "scenario_id": str(scenario_id),
        "trigger": "manual_refresh",
    })

    return ScenarioResponse.model_validate(scenario)


# ---------------------------------------------------------------------------
# GET /api/analysis/quick/stream — SSE streaming endpoint
# ---------------------------------------------------------------------------

@router.get("/quick/stream")
@limiter.limit("10/minute")
async def quick_analysis_stream(
    request: Request,
    address: str,
    strategy: str = "buy_and_hold",
    lat: float | None = None,
    lng: float | None = None,
    place_id: str | None = None,
    force_refresh: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _quota: None = Depends(require_quota("analyses_per_month")),
):
    """Stream analysis results via Server-Sent Events.

    Events:
    - status: {stage} — progress updates
    - enrichment: property + enrichment details
    - scenario: calculated scenario
    - narrative: AI narrative
    - complete: full response
    - error: error details
    """
    async def event_stream() -> AsyncGenerator[str, None]:
        start = time.time()

        try:
            # Stage 1: Parse address
            yield _sse("status", {"stage": "parsing_address"})

            from core.property_data.address_parser import parse_address
            parsed = await asyncio.to_thread(parse_address, address)
            if not parsed.address_line1:
                yield _sse("error", {"error": "Could not parse address", "code": "ADDRESS_PARSE_FAILED"})
                return

            # Stage 2: Fetch property data (RentCast — fast, 2-5s)
            yield _sse("status", {"stage": "fetching_property_data"})

            from core.property_data.service import enrich_property, enrich_with_bricked
            from database import SessionLocal

            _use_thread = "sqlite" not in str(db.bind.url)

            def _enrich_sync():
                if _use_thread:
                    thread_db = SessionLocal()
                    try:
                        result = enrich_property(
                            address=address, user_id=current_user.id,
                            db=thread_db, default_strategy=strategy,
                            providers=["rentcast"],
                            force_refresh=force_refresh,
                        )
                        thread_db.commit()
                        # Don't pass ORM objects across threads — just IDs.
                        # property_id and scenario_id are set by enrich_property().
                        result.property = None
                        result.scenario = None
                        return result
                    finally:
                        thread_db.close()
                else:
                    return enrich_property(
                        address=address, user_id=current_user.id,
                        db=db, default_strategy=strategy,
                        providers=["rentcast"],
                        force_refresh=force_refresh,
                    )

            enrichment = await asyncio.to_thread(_enrich_sync) if _use_thread else _enrich_sync()

            # After the thread completes, the main db session may have a
            # stale connection (Railway PgBouncer drops idle connections).
            # expire_all() forces fresh queries on next access.
            if _use_thread:
                db.expire_all()

            # Load fresh ORM objects in the main session using plain IDs
            # that were safely passed across the thread boundary.
            from models.properties import Property as _Prop
            from models.analysis_scenarios import AnalysisScenario as _AS

            if _use_thread:
                if enrichment.property_id:
                    enrichment.property = db.get(_Prop, enrichment.property_id)
                if enrichment.scenario_id:
                    enrichment.scenario = db.get(_AS, enrichment.scenario_id)

            # Persist client-side geocoding data if provided
            if enrichment.property and (lat is not None and lng is not None):
                enrichment.property.latitude = lat
                enrichment.property.longitude = lng
            if enrichment.property and place_id:
                enrichment.property.place_id = place_id

            if not enrichment.is_existing:
                record_usage(current_user.id, "analyses_per_month", db)

            db.commit()

            enrichment_latency = int((time.time() - start) * 1000)

            # Send RentCast enrichment result immediately
            prop_data = PropertyResponse.model_validate(enrichment.property).model_dump(mode="json")
            enrichment_data = _build_enrichment_details(enrichment, enrichment_latency).model_dump(mode="json")
            yield _sse("enrichment", {"property": prop_data, "enrichment": enrichment_data})

            # Stage 2b: Bricked enrichment (progressive — 15-30s)
            # Gated by tier: Free users skip Bricked entirely
            if enrichment.scenario and not enrichment.is_existing:
                from core.billing.tier_gate import (
                    get_tier_limits, _get_usage_count,
                )
                limits = get_tier_limits(current_user)
                bricked_limit = limits.bricked_lookups_per_month
                should_call_bricked = (
                    bricked_limit is None
                    or _get_usage_count(
                        current_user.id,
                        "bricked_lookups_per_month", db,
                    ) < bricked_limit
                )

                if should_call_bricked:
                    yield _sse("status", {"stage": "fetching_advanced_data"})
                    try:
                        if _use_thread:
                            prop_id = enrichment.property_id
                            scenario_id = enrichment.scenario_id

                            def _bricked_sync():
                                bdb = SessionLocal()
                                try:
                                    bprop = bdb.get(_Prop, prop_id)
                                    bscen = bdb.get(_AS, scenario_id)
                                    result = enrich_with_bricked(bprop, bscen, address, bdb)
                                    bdb.commit()
                                    return result
                                finally:
                                    bdb.close()

                            bricked_status = await asyncio.to_thread(_bricked_sync)
                            db.expire_all()
                            # Re-query scenario in main session to pick up bricked data
                            enrichment.scenario = db.get(_AS, scenario_id)
                        else:
                            bricked_status = enrich_with_bricked(
                                enrichment.property, enrichment.scenario, address, db,
                            )
                        if bricked_status.status == "success":
                            record_usage(
                                current_user.id,
                                "bricked_lookups_per_month", db,
                            )
                        db.commit()

                        yield _sse("enrichment_update", {
                            "bricked_status": bricked_status.status,
                            "bricked_latency_ms": bricked_status.latency_ms,
                            "has_arv": enrichment.scenario.after_repair_value is not None if enrichment.scenario else False,
                            "has_repair": enrichment.scenario.repair_cost is not None if enrichment.scenario else False,
                        })
                    except Exception:
                        logger.warning(
                            "Bricked enrichment failed in SSE stream",
                            exc_info=True,
                        )
                        yield _sse("enrichment_update", {
                            "bricked_status": "failed",
                        })

            # Stage 3: Scenario — run calculator BEFORE emitting
            if enrichment.scenario:
                yield _sse("status", {"stage": "generating_analysis"})
                if not enrichment.is_existing:
                    _run_calculator_on_scenario(enrichment.scenario, db)
                    db.commit()
                scenario_data = ScenarioResponse.model_validate(enrichment.scenario).model_dump(mode="json")
                yield _sse("scenario", scenario_data)

            # Stage 4: AI Narrative — generate for new properties OR existing
            # ones that never got a narrative (e.g. first attempt crashed)
            needs_narrative = (
                enrichment.scenario
                and (not enrichment.is_existing or not enrichment.scenario.ai_narrative)
            )
            if needs_narrative:
                yield _sse("status", {"stage": "generating_narrative"})

                narrative_resp = await _generate_narrative(
                    enrichment.scenario, enrichment.property,
                )
                db.commit()

                yield _sse("narrative", NarrativeResponse(
                    narrative=narrative_resp.narrative,
                    confidence=narrative_resp.confidence,
                    assumptions_stated=narrative_resp.assumptions_stated,
                    risks_flagged=narrative_resp.risks_flagged,
                    missing_data=narrative_resp.missing_data,
                    tokens_used=narrative_resp.tokens_used,
                    latency_ms=narrative_resp.latency_ms,
                ).model_dump(mode="json"))

            # Auto-create draft deal
            deal_id = None
            if enrichment.property:
                deal_id = _auto_create_deal(db, current_user.id, enrichment.property, strategy)
                db.commit()

            # Complete
            total_latency = int((time.time() - start) * 1000)
            yield _sse("complete", {
                "latency_ms": total_latency,
                "deal_id": str(deal_id) if deal_id else None,
            })

        except Exception as e:
            logger.exception("SSE stream error")
            yield _sse("error", _sanitize_sse_error(e))

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ---------------------------------------------------------------------------
# GET /api/analysis/scenarios/{id}/comps — cached comp data
# ---------------------------------------------------------------------------

@router.get("/scenarios/{scenario_id}/comps")
async def get_scenario_comps(
    scenario_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return cached comparable sales, repairs, and renovation data for a scenario."""
    scenario = (
        db.query(AnalysisScenario)
        .filter(
            AnalysisScenario.id == scenario_id,
            AnalysisScenario.created_by == current_user.id,
            AnalysisScenario.is_deleted == False,
        )
        .first()
    )

    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Scenario not found", "code": "SCENARIO_NOT_FOUND"},
        )

    ext = scenario.inputs_extended or {}
    return {
        "comps": ext.get("bricked_comps", []),
        "repairs": ext.get("bricked_repairs", []),
        "renovation_score": ext.get("renovation_score"),
        "share_link": ext.get("bricked_share_link"),
        "after_repair_value": (
            float(scenario.after_repair_value)
            if scenario.after_repair_value is not None else None
        ),
        "repair_cost": (
            float(scenario.repair_cost)
            if scenario.repair_cost is not None else None
        ),
    }


def _sse(event: str, data: dict) -> str:
    """Format a Server-Sent Event."""
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


def _sanitize_sse_error(e: Exception) -> dict:
    """Map internal exceptions to user-safe SSE error events.

    Never expose raw tracebacks, Pydantic validation errors, or DB errors.
    """
    msg = str(e).lower()
    if "parse" in msg or "address" in msg:
        return {"error": "Could not parse the address. Please check the format.", "code": "ADDRESS_PARSE_FAILED"}
    if "rate limit" in msg or "429" in msg:
        return {"error": "Too many requests. Please wait a moment.", "code": "RATE_LIMITED"}
    if "timeout" in msg or "timed out" in msg:
        return {"error": "The request timed out. Please try again.", "code": "TIMEOUT"}
    return {"error": "Something went wrong during analysis. Please try again.", "code": "ANALYSIS_ERROR"}


def _auto_create_deal(
    db: Session,
    user_id: UUID,
    prop,
    strategy: str,
) -> "UUID | None":
    """Auto-create a draft Deal for a property if one doesn't already exist.

    Returns the deal_id (existing or newly created), or None on failure.
    """
    from models.deals import Deal

    try:
        existing = (
            db.query(Deal)
            .filter(
                Deal.property_id == prop.id,
                Deal.user_id == user_id,
                Deal.deleted_at.is_(None),
            )
            .first()
        )
        if existing:
            return existing.id

        deal = Deal(
            property_id=prop.id,
            user_id=user_id,
            address=prop.address_line1 or "",
            zip_code=prop.zip_code or "",
            property_type=prop.property_type or "single_family",
            strategy=strategy,
            status="draft",
            deal_type="acquisition",
        )
        db.add(deal)
        db.flush()
        logger.info("Auto-created draft deal %s for property %s", deal.id, prop.id)
        return deal.id
    except Exception:
        logger.warning("Failed to auto-create deal for property %s", prop.id, exc_info=True)
        return None


# ---------------------------------------------------------------------------
# POST /api/analysis/compare — run all 5 strategies and recommend
# ---------------------------------------------------------------------------

def _map_canonical_inputs(strategy: str, inputs: dict) -> dict:
    """Map canonical input names to strategy-specific calculator names."""
    mapped = {}

    for key in ["purchase_price", "down_payment_pct"]:
        if key in inputs:
            mapped[key] = inputs[key]

    rent = inputs.get("monthly_rent", 0)
    if strategy == "creative_finance":
        mapped["monthly_rent_estimate"] = rent
    else:
        mapped["monthly_rent"] = rent

    arv = inputs.get("arv") or inputs.get("after_repair_value", 0)
    if strategy == "brrrr":
        mapped["arv_post_rehab"] = arv
    else:
        mapped["arv"] = arv

    repair = inputs.get("repair_cost", 0)
    if strategy == "flip":
        mapped["rehab_budget"] = repair
    elif strategy == "brrrr":
        mapped["rehab_costs"] = repair
    else:
        mapped["repair_costs"] = repair

    rate = inputs.get("interest_rate", 0)
    if strategy == "creative_finance":
        mapped["new_rate"] = rate
    elif strategy == "brrrr":
        mapped["new_loan_rate"] = rate
    else:
        mapped["interest_rate"] = rate

    term = inputs.get("loan_term_years", 30)
    if strategy == "brrrr":
        mapped["new_loan_term_years"] = term
    elif strategy == "creative_finance":
        mapped["new_term_years"] = term
    else:
        mapped["loan_term_years"] = term

    for key, val in inputs.items():
        if key not in mapped and key not in ("monthly_rent", "arv", "after_repair_value", "repair_cost", "interest_rate", "loan_term_years"):
            mapped[key] = val

    return mapped


def _generate_verdict(strategy: str, outputs: dict) -> str:
    """Generate a short template-based verdict for a strategy."""
    cf = outputs.get("monthly_cash_flow", 0)
    if strategy == "wholesale":
        profit = outputs.get("profit_at_ask", 0)
        rec = outputs.get("recommendation", "pass")
        if rec == "strong":
            return f"Strong deal — ${abs(int(profit)):,} below MAO"
        elif rec == "marginal":
            return "Marginal — thin spread at asking price"
        return "Pass — asking price exceeds MAO"
    elif strategy == "buy_and_hold":
        if cf and cf > 0:
            return f"Positive cash flow at ${int(cf):,}/mo"
        return "Negative cash flow — needs better terms or price"
    elif strategy == "brrrr":
        mli = outputs.get("money_left_in", 0)
        if mli <= 0:
            return "Infinite return — all capital recycled"
        return f"${int(mli):,} left in deal after refi"
    elif strategy == "flip":
        profit = outputs.get("gross_profit", 0)
        if profit and profit > 0:
            return f"${int(profit):,} profit projected"
        return "Negative profit — deal doesn't pencil"
    elif strategy == "creative_finance":
        if cf and cf > 0:
            return f"Creative terms yield ${int(cf):,}/mo"
        return "Negative cash flow on creative terms"
    return "Analysis complete"


def _pick_recommendation(results: list) -> tuple:
    """Pick the best strategy based on weighted scoring."""
    best = None
    best_score = -999

    for r in results:
        if r.key_metric is None:
            continue

        score = 0.0
        cf = r.monthly_cash_flow or 0
        score += min(cf / 500, 1.0) * 30
        score += max(0, (100 - r.risk_score) / 100) * 25
        roi = r.roi or 0
        score += min(roi / 20, 1.0) * 20
        horizon_scores = {"immediate": 8, "short": 10, "medium": 15, "long": 12}
        score += horizon_scores.get(r.time_horizon, 10)
        simplicity = {"wholesale": 10, "buy_and_hold": 8, "flip": 6, "brrrr": 5, "creative_finance": 4}
        score += simplicity.get(r.strategy, 5)

        if score > best_score:
            best_score = score
            best = r

    if not best:
        return ("buy_and_hold", "Insufficient data to recommend — defaulting to buy & hold")

    reasons = {
        "wholesale": "Quick liquidity with minimal capital risk",
        "buy_and_hold": "Strongest risk-adjusted long-term return for this property",
        "brrrr": "Best capital recycling — maximize portfolio growth",
        "flip": "Highest short-term profit potential",
        "creative_finance": "Creative terms unlock cash flow without traditional financing",
    }

    return (best.strategy, reasons.get(best.strategy, "Best overall score across risk, return, and feasibility"))


@router.post("/compare")
async def compare_strategies(
    body: CompareRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run all 5 strategies with the same inputs and return comparison + recommendation."""
    import importlib

    strategies = ["wholesale", "brrrr", "buy_and_hold", "flip", "creative_finance"]

    KEY_METRICS = {
        "wholesale": ("mao", "Max Allowable Offer"),
        "buy_and_hold": ("monthly_cash_flow", "Monthly Cash Flow"),
        "brrrr": ("money_left_in", "Cash Left in Deal"),
        "flip": ("gross_profit", "Gross Profit"),
        "creative_finance": ("monthly_cash_flow", "Monthly Cash Flow"),
    }

    TIME_HORIZONS = {
        "wholesale": "immediate",
        "flip": "short",
        "brrrr": "medium",
        "buy_and_hold": "long",
        "creative_finance": "long",
    }

    results = []

    for strategy in strategies:
        try:
            inputs = _map_canonical_inputs(strategy, body.inputs)
            _apply_strategy_defaults(strategy, inputs)

            calc_mod = importlib.import_module(f"core.calculators.{strategy}")
            calc_fn = getattr(calc_mod, f"calculate_{strategy}")
            risk_mod = importlib.import_module("core.calculators.risk_score")

            outputs = calc_fn(inputs)
            risk_score = risk_mod.calculate_risk_score(strategy, inputs, outputs)

            key_field, key_label = KEY_METRICS[strategy]
            key_metric = outputs.get(key_field)
            if isinstance(key_metric, (int, float)):
                key_metric = round(key_metric, 2)

            verdict = _generate_verdict(strategy, outputs)

            results.append(StrategyResult(
                strategy=strategy,
                key_metric=key_metric if isinstance(key_metric, (int, float)) else None,
                key_metric_label=key_label,
                roi=outputs.get("roi") or outputs.get("coc_return"),
                risk_score=risk_score,
                time_horizon=TIME_HORIZONS[strategy],
                break_even_months=outputs.get("break_even_months"),
                five_year_total_return=outputs.get("five_year_total_return"),
                monthly_cash_flow=outputs.get("monthly_cash_flow"),
                verdict=verdict,
                outputs=outputs,
            ))
        except Exception as e:
            logger.warning("Compare: %s failed: %s", strategy, e)
            results.append(StrategyResult(
                strategy=strategy,
                key_metric=None,
                key_metric_label=KEY_METRICS[strategy][1],
                risk_score=50,
                time_horizon=TIME_HORIZONS[strategy],
                verdict=f"Could not calculate: {str(e)[:60]}",
            ))

    recommendation, reason = _pick_recommendation(results)

    try:
        from core.telemetry import track_event
        track_event(current_user.id, "strategy_compared", {
            "recommendation": recommendation,
            "strategy_count": len([r for r in results if r.key_metric is not None]),
        })
    except Exception:
        pass

    return CompareResponse(
        strategies=results,
        recommendation=recommendation,
        recommendation_reason=reason,
    )


# ---------------------------------------------------------------------------
# POST /api/analysis/admin/cleanup-poisoned — one-time DB cleanup
# ---------------------------------------------------------------------------

@router.post("/admin/cleanup-poisoned")
async def cleanup_poisoned_properties(
    request: Request,
    db: Session = Depends(get_db),
):
    """Delete properties created during the RENTCAST_API_KEY outage.

    Requires X-Internal-Key header. These properties have no enrichment data
    and their dedup records prevent re-analysis of those addresses.
    """
    import hmac
    import os
    from sqlalchemy import text

    internal_key = os.getenv("INTERNAL_API_KEY", "")
    provided_key = request.headers.get("X-Internal-Key", "")
    if not internal_key or not hmac.compare_digest(provided_key, internal_key):
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Find poisoned properties
    poisoned = db.execute(text("""
        SELECT id, address_line1, city, state, zip_code
        FROM properties
        WHERE bedrooms IS NULL
          AND sqft IS NULL
          AND property_type IS NULL
          AND is_sample = false
          AND is_deleted = false
    """)).fetchall()

    if not poisoned:
        return {"deleted": 0, "message": "No poisoned properties found"}

    ids = [row.id for row in poisoned]

    # Delete FK-dependent rows
    deleted_counts = {}
    for table in [
        "data_source_events", "analysis_scenarios", "transactions",
        "payments", "obligations", "financing_instruments", "rehab_projects",
        "buyer_packets", "documents", "tasks", "communications",
        "skip_traces", "mail_campaigns", "reports",
    ]:
        result = db.execute(
            text(f"DELETE FROM {table} WHERE property_id = ANY(:ids)"),
            {"ids": ids},
        )
        if result.rowcount > 0:
            deleted_counts[table] = result.rowcount

    # Unlink deals (nullable FK)
    result = db.execute(
        text("UPDATE deals SET property_id = NULL WHERE property_id = ANY(:ids)"),
        {"ids": ids},
    )
    if result.rowcount > 0:
        deleted_counts["deals_unlinked"] = result.rowcount

    # Delete the properties
    result = db.execute(
        text("DELETE FROM properties WHERE id = ANY(:ids)"),
        {"ids": ids},
    )
    deleted_counts["properties"] = result.rowcount

    db.commit()

    addresses = [f"{r.address_line1}, {r.city} {r.state} {r.zip_code}" for r in poisoned]
    logger.info("Cleaned up %d poisoned properties: %s", len(ids), addresses)

    return {
        "deleted": len(ids),
        "addresses": addresses,
        "details": deleted_counts,
    }
