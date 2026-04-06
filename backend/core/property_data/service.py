"""PropertyDataService — vendor-agnostic orchestrator for property enrichment.

RentCast is provider #1 (property details, rent, value).
Bricked is provider #2 (AI comps, ARV, repair estimates).
Every provider call is logged in DataSourceEvent (success AND failure).
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


@dataclass
class ProviderStatus:
    """Status of a single provider's enrichment attempt."""
    provider: str
    status: str  # success | partial | failed | timeout | not_found | rate_limited | auth_error | skipped
    latency_ms: int = 0
    error: Optional[str] = None
    fields_populated: list[str] = field(default_factory=list)


@dataclass
class EnrichmentResult:
    """Result of enriching a property from external data sources."""
    property: Any = None  # Property model instance
    scenario: Any = None  # AnalysisScenario model instance
    fields_populated: dict[str, Any] = field(default_factory=dict)
    fields_missing: list[str] = field(default_factory=list)
    confidence: dict[str, str] = field(default_factory=dict)
    provider_statuses: dict[str, ProviderStatus] = field(default_factory=dict)
    status: str = "complete"  # complete | partial | failed | existing
    is_existing: bool = False


def _build_confidence(
    fields_populated: dict, provider_statuses: dict[str, ProviderStatus],
) -> dict[str, str]:
    """Build confidence labels for each populated field.

    Rules:
    - 2+ providers populated same field → "multi_source"
    - 1 provider populated → "single_source"
    - No provider populated → "missing"
    """
    # Track which providers contributed each field
    provider_fields_map: dict[str, list[str]] = {}
    for pname, ps in provider_statuses.items():
        for f in ps.fields_populated:
            provider_fields_map.setdefault(f, []).append(pname)

    confidence = {}
    for field_name in fields_populated:
        if fields_populated[field_name] is None:
            confidence[field_name] = "missing"
        elif len(provider_fields_map.get(field_name, [])) >= 2:
            confidence[field_name] = "multi_source"
        else:
            confidence[field_name] = "single_source"
    return confidence


def _build_data_sources(
    fields_populated: dict,
    provider_statuses: dict[str, ProviderStatus],
) -> dict:
    """Build the Property.data_sources JSONB value with per-field source tracking."""
    now = datetime.utcnow().isoformat()

    # Map each field to the provider that populated it (last-writer wins)
    field_to_provider: dict[str, str] = {}
    for pname, ps in provider_statuses.items():
        for f in ps.fields_populated:
            field_to_provider[f] = pname

    sources = {}
    for field_name, value in fields_populated.items():
        if value is not None and not field_name.startswith("_"):
            sources[field_name] = {
                "source": field_to_provider.get(field_name, "unknown"),
                "timestamp": now,
                "confidence": "single_source",
            }
    return sources


def _log_data_source_event(
    db: Session,
    property_id: UUID,
    provider: str,
    request_type: str,
    result_status: str,
    response_data: Optional[dict],
    latency_ms: int,
    fields_populated: Optional[dict] = None,
    confidence_scores: Optional[dict] = None,
    cost_cents: Optional[int] = None,
) -> None:
    """Log a provider call to the DataSourceEvent table."""
    from models.data_source_events import DataSourceEvent

    event = DataSourceEvent(
        property_id=property_id,
        provider=provider,
        request_type=request_type,
        response_status=result_status,
        response_data=response_data,
        fields_populated=fields_populated,
        confidence_scores=confidence_scores,
        latency_ms=latency_ms,
        cost_cents=cost_cents if cost_cents is not None else (
            2 if result_status == "success" else 0
        ),
    )
    db.add(event)


def _find_existing_property(
    db: Session, user_id: UUID, address_line1: str, zip_code: str,
) -> Optional[Any]:
    """Find an existing property by normalized address for dedup."""
    from models.properties import Property

    if not address_line1:
        return None

    return (
        db.query(Property)
        .filter(
            Property.created_by == user_id,
            Property.address_line1 == address_line1,
            Property.zip_code == zip_code,
            Property.is_deleted == False,
        )
        .first()
    )


def enrich_property(
    address: str,
    user_id: UUID,
    db: Session,
    providers: list[str] | None = None,
    default_strategy: str = "buy_and_hold",
) -> EnrichmentResult:
    """Enrich a property from address string using configured providers.

    Flow:
    1. Parse address
    2. Check for existing Property (dedup by user + normalized address)
    3. Fetch from each provider
    4. Merge results
    5. Create/update Property + create DataSourceEvents
    6. Create default AnalysisScenario with auto-filled inputs
    7. Return EnrichmentResult

    Args:
        address: Freeform address string
        user_id: Current user's UUID
        db: Database session
        providers: List of provider names (default: ["rentcast"])
        default_strategy: Strategy for auto-created AnalysisScenario
    """
    from core.property_data.address_parser import parse_and_geocode
    from models.properties import Property
    from models.analysis_scenarios import AnalysisScenario

    if providers is None:
        providers = ["rentcast", "bricked"]

    result = EnrichmentResult()

    # 1. Parse address
    parsed = parse_and_geocode(address)
    if not parsed.address_line1:
        result.status = "failed"
        return result

    # 2. Check for existing property (dedup)
    existing = _find_existing_property(db, user_id, parsed.address_line1, parsed.zip_code)
    if existing:
        result.property = existing
        result.is_existing = True
        result.status = "existing"

        # Always create a NEW scenario with the requested strategy.
        # Old scenarios are point-in-time snapshots and should not be reused.
        scenario = AnalysisScenario(
            property_id=existing.id,
            created_by=user_id,
            strategy=default_strategy,
            outputs={},
        )
        # Pre-fill from existing property data where available
        if existing.data_sources:
            for field_name, src in existing.data_sources.items():
                if isinstance(src, dict) and "value" in src:
                    val = src["value"]
                    if field_name == "estimated_value" and val:
                        scenario.purchase_price = val
                    elif field_name == "monthly_rent" and val:
                        scenario.monthly_rent = val
                    elif field_name == "after_repair_value" and val:
                        scenario.after_repair_value = val
                    elif field_name == "repair_cost" and val:
                        scenario.repair_cost = val
        db.add(scenario)
        db.flush()
        result.scenario = scenario
        return result

    # 3. Create Property record immediately (always created, even if providers fail)
    prop = Property(
        created_by=user_id,
        address_line1=parsed.address_line1,
        address_line2=parsed.address_line2,
        city=parsed.city,
        state=parsed.state,
        zip_code=parsed.zip_code,
        county=parsed.county,
        status="under_analysis",
    )

    db.add(prop)
    db.flush()  # get prop.id for DataSourceEvent FK
    result.property = prop

    # 4. Fetch from each provider
    all_populated: dict[str, Any] = {}
    any_success = False

    for provider_name in providers:
        if provider_name == "rentcast":
            pstatus = _fetch_rentcast(db, prop, address, all_populated)
            result.provider_statuses[provider_name] = pstatus
            if pstatus.status in ("success", "partial"):
                any_success = True
        elif provider_name == "bricked":
            # Pass RentCast-derived hints to help Bricked avoid 412
            property_hints = {
                k: v for k, v in all_populated.items()
                if k in ("sqft", "bedrooms", "bathrooms", "year_built")
                and v is not None
            }
            pstatus = _fetch_bricked(
                db, prop, address, all_populated, property_hints,
            )
            result.provider_statuses[provider_name] = pstatus
            if pstatus.status in ("success", "partial"):
                any_success = True
        else:
            result.provider_statuses[provider_name] = ProviderStatus(
                provider=provider_name, status="skipped",
                error="Provider not implemented",
            )

    # 5. Update Property with merged data
    property_fields = ["property_type", "bedrooms", "bathrooms", "sqft", "lot_sqft", "year_built", "county"]
    for f in property_fields:
        if f in all_populated and all_populated[f] is not None:
            setattr(prop, f, all_populated[f])

    # Build data_sources and confidence
    prop.data_sources = _build_data_sources(all_populated, result.provider_statuses)
    result.fields_populated = {
        k: v for k, v in all_populated.items()
        if v is not None and not k.startswith("_")
    }
    result.confidence = _build_confidence(all_populated, result.provider_statuses)

    # Fields that should be populated but aren't
    expected_fields = [
        "property_type", "bedrooms", "bathrooms", "sqft", "year_built",
        "monthly_rent", "estimated_value",
        "after_repair_value", "repair_cost",
    ]
    result.fields_missing = [f for f in expected_fields if all_populated.get(f) is None]

    # 6. Determine overall status
    if not any_success:
        result.status = "failed"
    elif result.fields_missing:
        result.status = "partial"
    else:
        result.status = "complete"

    # 7. Create default AnalysisScenario
    scenario = AnalysisScenario(
        property_id=prop.id,
        created_by=user_id,
        strategy=default_strategy,
        outputs={},
    )

    # Auto-fill scenario inputs from enriched data
    if all_populated.get("estimated_value"):
        scenario.purchase_price = all_populated["estimated_value"]
    if all_populated.get("monthly_rent"):
        scenario.monthly_rent = all_populated["monthly_rent"]
    if all_populated.get("after_repair_value"):
        scenario.after_repair_value = all_populated["after_repair_value"]
    if all_populated.get("repair_cost"):
        scenario.repair_cost = all_populated["repair_cost"]

    # Store Bricked comp/repair summaries in inputs_extended
    extended: dict = {}
    if all_populated.get("_bricked_comps"):
        extended["bricked_comps"] = all_populated["_bricked_comps"]
    if all_populated.get("_bricked_repairs"):
        extended["bricked_repairs"] = all_populated["_bricked_repairs"]
    if all_populated.get("_bricked_share_link"):
        extended["bricked_share_link"] = all_populated["_bricked_share_link"]
    if all_populated.get("_bricked_renovation_score"):
        extended["renovation_score"] = all_populated["_bricked_renovation_score"]
    if extended:
        scenario.inputs_extended = extended

    # Per-field source tracking for source_confidence
    provider_fields: dict[str, str] = {}
    for pname, ps in result.provider_statuses.items():
        for f in ps.fields_populated:
            provider_fields[f] = pname

    scenario.source_confidence = {
        field: {
            "source": provider_fields.get(field, "unknown"),
            "confidence": conf,
            "fetched_at": datetime.utcnow().isoformat(),
        }
        for field, conf in result.confidence.items()
    }

    db.add(scenario)
    db.flush()
    result.scenario = scenario

    return result


def _fetch_rentcast(
    db: Session, prop: Any, address: str, all_populated: dict,
) -> ProviderStatus:
    """Fetch data from all RentCast endpoints and merge into all_populated."""
    from core.property_data.providers.rentcast import (
        fetch_property_details,
        fetch_rent_estimate,
        fetch_value_estimate,
        extract_property_fields,
        extract_rent_fields,
        extract_value_fields,
    )

    pstatus = ProviderStatus(provider="rentcast", status="success")
    total_latency = 0
    populated_fields: list[str] = []
    any_success = False
    any_failure = False

    # --- Property details ---
    details_result = fetch_property_details(address)
    total_latency += details_result.latency_ms
    _log_data_source_event(
        db, prop.id, "rentcast", "property_details",
        details_result.status, details_result.data, details_result.latency_ms,
    )

    if details_result.status == "success" and details_result.data:
        fields = extract_property_fields(details_result.data)
        all_populated.update(fields)
        populated_fields.extend(k for k, v in fields.items() if v is not None)
        any_success = True
    else:
        any_failure = True

    # --- Rent estimate ---
    rent_result = fetch_rent_estimate(address)
    total_latency += rent_result.latency_ms
    _log_data_source_event(
        db, prop.id, "rentcast", "rent_estimate",
        rent_result.status, rent_result.data, rent_result.latency_ms,
    )

    if rent_result.status == "success" and rent_result.data:
        fields = extract_rent_fields(rent_result.data)
        all_populated.update(fields)
        populated_fields.extend(k for k, v in fields.items() if v is not None)
        any_success = True
    else:
        any_failure = True

    # --- Value estimate ---
    value_result = fetch_value_estimate(address)
    total_latency += value_result.latency_ms
    _log_data_source_event(
        db, prop.id, "rentcast", "value_estimate",
        value_result.status, value_result.data, value_result.latency_ms,
    )

    if value_result.status == "success" and value_result.data:
        fields = extract_value_fields(value_result.data)
        all_populated.update(fields)
        populated_fields.extend(k for k, v in fields.items() if v is not None)
        any_success = True
    else:
        any_failure = True

    # --- Aggregate status ---
    pstatus.latency_ms = total_latency
    pstatus.fields_populated = populated_fields

    if not any_success:
        pstatus.status = "failed"
        # Use the most informative error from the three calls
        for r in [details_result, rent_result, value_result]:
            if r.error:
                pstatus.error = r.error
                pstatus.status = r.status
                break
    elif any_failure:
        pstatus.status = "partial"

    return pstatus


def _fetch_bricked(
    db: Session,
    prop: Any,
    address: str,
    all_populated: dict,
    property_hints: dict | None = None,
) -> ProviderStatus:
    """Fetch data from Bricked.ai and merge into all_populated.

    Bricked is a single-call API returning comps, ARV, repairs, and property details.
    For valuation fields (ARV, repair cost), Bricked is authoritative.
    For physical details (beds/baths/sqft), Bricked only backfills nulls.
    """
    from core.property_data.providers.bricked import (
        fetch_property_analysis,
        extract_valuation_fields,
        extract_property_fields,
        extract_comps_summary,
        extract_repairs_summary,
        extract_renovation_score,
        COST_CENTS_PER_CALL,
    )

    pstatus = ProviderStatus(provider="bricked", status="success")

    result = fetch_property_analysis(address, property_hints)
    pstatus.latency_ms = result.latency_ms

    # Truncate response_data for storage (strip deep nested comp details)
    stored_data = result.data
    if stored_data and isinstance(stored_data.get("comps"), list):
        stored_data = {
            **stored_data,
            "comps": [
                {
                    "selected": c.get("selected"),
                    "compType": c.get("compType"),
                    "adjusted_value": c.get("adjusted_value"),
                    "property": {
                        "address": c.get("property", {}).get("address"),
                        "details": {
                            k: c.get("property", {}).get("details", {}).get(k)
                            for k in (
                                "bedrooms", "bathrooms", "squareFeet",
                                "lastSaleAmount", "lastSaleDate",
                            )
                        },
                    },
                }
                for c in stored_data["comps"]
            ],
        }

    _log_data_source_event(
        db, prop.id, "bricked", "property_analysis",
        result.status, stored_data, result.latency_ms,
        cost_cents=COST_CENTS_PER_CALL if result.status == "success" else 0,
    )

    if result.status != "success" or not result.data:
        pstatus.status = result.status
        pstatus.error = result.error
        return pstatus

    # --- Valuations (ARV, CMV, repair cost) — Bricked is authoritative ---
    val_fields = extract_valuation_fields(result.data)
    for k, v in val_fields.items():
        if v is not None:
            all_populated[k] = v
    pstatus.fields_populated.extend(
        k for k, v in val_fields.items() if v is not None
    )

    # --- Property details — backfill only (don't overwrite RentCast) ---
    prop_fields = extract_property_fields(result.data)
    for k, v in prop_fields.items():
        if v is not None and all_populated.get(k) is None:
            all_populated[k] = v
            pstatus.fields_populated.append(k)

    # --- Comps + repairs for scenario context (stored in inputs_extended) ---
    all_populated["_bricked_comps"] = extract_comps_summary(result.data)
    all_populated["_bricked_repairs"] = extract_repairs_summary(result.data)
    all_populated["_bricked_share_link"] = result.data.get("shareLink")

    renovation_score = extract_renovation_score(result.data)
    if renovation_score:
        all_populated["_bricked_renovation_score"] = renovation_score

    return pstatus


def enrich_with_bricked(
    prop: Any,
    scenario: Any,
    address: str,
    db: Session,
) -> ProviderStatus:
    """Enrich an already-created Property/Scenario with Bricked data.

    Called in SSE phase 2, after RentCast data is already committed.
    Returns ProviderStatus. Never raises.
    """
    all_populated: dict = {}

    # Build hints from existing property data
    property_hints = {}
    if prop.sqft:
        property_hints["sqft"] = prop.sqft
    if prop.bedrooms:
        property_hints["bedrooms"] = prop.bedrooms
    if prop.bathrooms:
        property_hints["bathrooms"] = float(prop.bathrooms)
    if prop.year_built:
        property_hints["year_built"] = prop.year_built

    try:
        pstatus = _fetch_bricked(
            db, prop, address, all_populated, property_hints,
        )
    except Exception:
        logger.exception("Bricked enrichment failed unexpectedly")
        return ProviderStatus(
            provider="bricked", status="failed",
            error="Unexpected error",
        )

    if pstatus.status not in ("success", "partial"):
        return pstatus

    # Update scenario with Bricked data
    if all_populated.get("after_repair_value") and scenario.after_repair_value is None:
        scenario.after_repair_value = all_populated["after_repair_value"]
    if all_populated.get("repair_cost") and scenario.repair_cost is None:
        scenario.repair_cost = all_populated["repair_cost"]

    # Store extended data
    extended = scenario.inputs_extended or {}
    if all_populated.get("_bricked_comps"):
        extended["bricked_comps"] = all_populated["_bricked_comps"]
    if all_populated.get("_bricked_repairs"):
        extended["bricked_repairs"] = all_populated["_bricked_repairs"]
    if all_populated.get("_bricked_share_link"):
        extended["bricked_share_link"] = all_populated["_bricked_share_link"]
    if all_populated.get("_bricked_renovation_score"):
        extended["renovation_score"] = all_populated["_bricked_renovation_score"]
    scenario.inputs_extended = extended

    # Backfill missing property fields
    for f in ("bedrooms", "bathrooms", "sqft", "lot_sqft", "year_built"):
        val = all_populated.get(f)
        if val is not None and getattr(prop, f) is None:
            setattr(prop, f, val)

    # Update source confidence
    existing_conf = scenario.source_confidence or {}
    for f in pstatus.fields_populated:
        existing_conf[f] = {
            "source": "bricked",
            "confidence": "single_source",
            "fetched_at": datetime.utcnow().isoformat(),
        }
    scenario.source_confidence = existing_conf

    return pstatus
