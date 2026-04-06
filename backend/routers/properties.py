"""Properties router — CRUD, list with filters, activity timeline, scenarios."""

import importlib
import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from core.security.jwt import get_current_user
from database import get_db
from limiter import limiter
from models.analysis_scenarios import AnalysisScenario
from models.deals import Deal
from models.properties import Property
from models.users import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/properties", tags=["properties"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class PropertyDetailResponse(BaseModel):
    id: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    zip_code: str
    county: Optional[str] = None
    property_type: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    sqft: Optional[int] = None
    lot_sqft: Optional[int] = None
    year_built: Optional[int] = None
    status: str
    data_sources: Optional[dict] = None
    is_sample: bool = False
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}

    @classmethod
    def from_property(cls, p: Property) -> "PropertyDetailResponse":
        return cls(
            id=str(p.id),
            address_line1=p.address_line1,
            address_line2=p.address_line2,
            city=p.city,
            state=p.state,
            zip_code=p.zip_code,
            county=p.county,
            property_type=p.property_type,
            bedrooms=p.bedrooms,
            bathrooms=(
                float(p.bathrooms) if p.bathrooms is not None else None
            ),
            sqft=p.sqft,
            lot_sqft=p.lot_sqft,
            year_built=p.year_built,
            status=p.status,
            data_sources=p.data_sources,
            is_sample=p.is_sample,
            created_at=(
                p.created_at.isoformat() if p.created_at else ""
            ),
            updated_at=(
                p.updated_at.isoformat() if p.updated_at else ""
            ),
        )


class ScenarioDetailResponse(BaseModel):
    id: str
    property_id: str
    strategy: str
    purchase_price: Optional[float] = None
    after_repair_value: Optional[float] = None
    repair_cost: Optional[float] = None
    monthly_rent: Optional[float] = None
    down_payment_pct: Optional[float] = None
    interest_rate: Optional[float] = None
    loan_term_years: Optional[int] = None
    inputs_extended: Optional[dict] = None
    outputs: dict = {}
    risk_score: Optional[float] = None
    risk_flags: Optional[list] = None
    ai_narrative: Optional[str] = None
    ai_narrative_generated_at: Optional[str] = None
    source_confidence: Optional[dict] = None
    is_sample: bool = False
    is_snapshot: bool = True
    created_at: str

    model_config = {"from_attributes": True}

    @classmethod
    def from_scenario(cls, s: AnalysisScenario) -> "ScenarioDetailResponse":
        return cls(
            id=str(s.id),
            property_id=str(s.property_id),
            strategy=s.strategy,
            purchase_price=float(s.purchase_price) if s.purchase_price is not None else None,
            after_repair_value=float(s.after_repair_value) if s.after_repair_value is not None else None,
            repair_cost=float(s.repair_cost) if s.repair_cost is not None else None,
            monthly_rent=float(s.monthly_rent) if s.monthly_rent is not None else None,
            down_payment_pct=float(s.down_payment_pct) if s.down_payment_pct is not None else None,
            interest_rate=float(s.interest_rate) if s.interest_rate is not None else None,
            loan_term_years=s.loan_term_years,
            inputs_extended=s.inputs_extended,
            outputs=s.outputs or {},
            risk_score=float(s.risk_score) if s.risk_score is not None else None,
            risk_flags=s.risk_flags,
            ai_narrative=s.ai_narrative,
            ai_narrative_generated_at=s.ai_narrative_generated_at.isoformat() if s.ai_narrative_generated_at else None,
            source_confidence=s.source_confidence,
            is_sample=s.is_sample,
            is_snapshot=s.is_snapshot,
            created_at=s.created_at.isoformat() if s.created_at else "",
        )


class CreateScenarioRequest(BaseModel):
    strategy: str = Field(
        ...,
        description="wholesale | buy_and_hold | flip | brrrr | creative_finance",
    )


class ScenarioSummary(BaseModel):
    id: str
    strategy: str
    purchase_price: Optional[float] = None
    risk_score: Optional[float] = None
    outputs: dict = {}
    created_at: str


class PropertyListItem(BaseModel):
    id: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    zip_code: str
    property_type: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    sqft: Optional[int] = None
    year_built: Optional[int] = None
    status: str
    is_sample: bool = False
    created_at: str
    updated_at: str
    primary_scenario: Optional[ScenarioSummary] = None
    deal_count: int = 0


class PropertyListResponse(BaseModel):
    properties: list[PropertyListItem]
    total: int
    page: int
    per_page: int


class PropertyUpdateRequest(BaseModel):
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    county: Optional[str] = None
    property_type: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    sqft: Optional[int] = None
    lot_sqft: Optional[int] = None
    year_built: Optional[int] = None
    status: Optional[str] = None


class PropertyActivityItem(BaseModel):
    type: str
    description: str
    timestamp: str
    entity_id: Optional[str] = None
    entity_type: Optional[str] = None


# ---------------------------------------------------------------------------
# List / CRUD endpoints
# ---------------------------------------------------------------------------

@router.get("/", response_model=PropertyListResponse)
async def list_properties(
    request: Request,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None, alias="q"),
    strategy: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PropertyListResponse:
    """List properties with optional filters and pagination."""
    q = db.query(Property).filter(
        Property.created_by == current_user.id,
        Property.is_deleted == False,  # noqa: E712
    )

    if status_filter:
        q = q.filter(Property.status == status_filter)

    if search:
        q = q.filter(
            Property.address_line1.ilike(f"%{search}%")
        )

    if strategy:
        q = q.filter(
            db.query(AnalysisScenario).filter(
                AnalysisScenario.property_id == Property.id,
                AnalysisScenario.strategy == strategy,
                AnalysisScenario.is_deleted == False,  # noqa: E712
            ).exists()
        )

    total = q.count()
    props = (
        q.order_by(Property.updated_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    # Batch-load primary scenarios and deal counts to avoid N+1
    prop_ids = [p.id for p in props]

    # Latest scenario per property via a correlated subquery
    scenario_map: dict = {}
    if prop_ids:
        from sqlalchemy import desc
        latest_scenario_subq = (
            db.query(
                AnalysisScenario.property_id,
                func.max(AnalysisScenario.created_at).label("max_created"),
            )
            .filter(
                AnalysisScenario.property_id.in_(prop_ids),
                AnalysisScenario.is_deleted == False,  # noqa: E712
            )
            .group_by(AnalysisScenario.property_id)
            .subquery()
        )
        scenarios = (
            db.query(AnalysisScenario)
            .join(
                latest_scenario_subq,
                (AnalysisScenario.property_id == latest_scenario_subq.c.property_id)
                & (AnalysisScenario.created_at == latest_scenario_subq.c.max_created),
            )
            .filter(AnalysisScenario.is_deleted == False)  # noqa: E712
            .all()
        )
        for s in scenarios:
            scenario_map[s.property_id] = s

    # Deal counts per property in one query
    deal_count_map: dict = {}
    if prop_ids:
        deal_counts = (
            db.query(Deal.property_id, func.count(Deal.id))
            .filter(
                Deal.property_id.in_(prop_ids),
                Deal.deleted_at.is_(None),
            )
            .group_by(Deal.property_id)
            .all()
        )
        deal_count_map = {pid: cnt for pid, cnt in deal_counts}

    items: list[PropertyListItem] = []
    for p in props:
        scenario = scenario_map.get(p.id)
        scenario_summary = None
        if scenario:
            scenario_summary = ScenarioSummary(
                id=str(scenario.id),
                strategy=scenario.strategy,
                purchase_price=(
                    float(scenario.purchase_price)
                    if scenario.purchase_price is not None
                    else None
                ),
                risk_score=(
                    float(scenario.risk_score)
                    if scenario.risk_score is not None
                    else None
                ),
                outputs=scenario.outputs or {},
                created_at=(
                    scenario.created_at.isoformat()
                    if scenario.created_at else ""
                ),
            )

        items.append(PropertyListItem(
            id=str(p.id),
            address_line1=p.address_line1,
            address_line2=p.address_line2,
            city=p.city,
            state=p.state,
            zip_code=p.zip_code,
            property_type=p.property_type,
            bedrooms=p.bedrooms,
            bathrooms=(
                float(p.bathrooms) if p.bathrooms is not None
                else None
            ),
            sqft=p.sqft,
            year_built=p.year_built,
            status=p.status,
            is_sample=p.is_sample,
            created_at=(
                p.created_at.isoformat() if p.created_at else ""
            ),
            updated_at=(
                p.updated_at.isoformat() if p.updated_at else ""
            ),
            primary_scenario=scenario_summary,
            deal_count=deal_count_map.get(p.id, 0),
        ))

    return PropertyListResponse(
        properties=items,
        total=total,
        page=page,
        per_page=per_page,
    )


@router.patch(
    "/{property_id}",
    response_model=PropertyDetailResponse,
)
async def update_property(
    property_id: UUID,
    body: PropertyUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PropertyDetailResponse:
    """Update property fields."""
    prop = db.query(Property).filter(
        Property.id == property_id,
        Property.created_by == current_user.id,
        Property.is_deleted == False,  # noqa: E712
    ).first()

    if not prop:
        raise HTTPException(
            status_code=404,
            detail={"error": "Property not found", "code": "NOT_FOUND"},
        )

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(prop, field, value)

    db.commit()
    db.refresh(prop)
    return PropertyDetailResponse.from_property(prop)


@router.delete("/{property_id}", status_code=204)
async def delete_property(
    property_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Soft-delete a property and its linked scenarios."""
    prop = db.query(Property).filter(
        Property.id == property_id,
        Property.created_by == current_user.id,
        Property.is_deleted == False,  # noqa: E712
    ).first()

    if not prop:
        raise HTTPException(
            status_code=404,
            detail={"error": "Property not found", "code": "NOT_FOUND"},
        )

    prop.is_deleted = True

    # Cascade soft-delete to linked scenarios
    db.query(AnalysisScenario).filter(
        AnalysisScenario.property_id == property_id,
        AnalysisScenario.is_deleted == False,  # noqa: E712
    ).update({"is_deleted": True})

    db.commit()
    return None


@router.get(
    "/{property_id}/activity",
    response_model=list[PropertyActivityItem],
)
async def get_property_activity(
    property_id: UUID,
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[PropertyActivityItem]:
    """Activity timeline for a property from multiple sources."""
    # Verify ownership
    prop = db.query(Property).filter(
        Property.id == property_id,
        Property.created_by == current_user.id,
        Property.is_deleted == False,  # noqa: E712
    ).first()
    if not prop:
        raise HTTPException(
            status_code=404,
            detail={"error": "Property not found", "code": "NOT_FOUND"},
        )

    events: list[dict] = []

    # Scenarios
    scenarios = db.query(AnalysisScenario).filter(
        AnalysisScenario.property_id == property_id,
        AnalysisScenario.is_deleted == False,  # noqa: E712
    ).all()
    for s in scenarios:
        label = (s.strategy or "unknown").replace("_", " ").title()
        events.append({
            "type": "scenario_created",
            "description": f"{label} analysis created",
            "timestamp": (
                s.created_at.isoformat() if s.created_at else ""
            ),
            "entity_id": str(s.id),
            "entity_type": "scenario",
        })

    # Deals
    deals = db.query(Deal).filter(
        Deal.property_id == property_id,
        Deal.user_id == current_user.id,
        Deal.deleted_at.is_(None),
    ).all()
    for d in deals:
        events.append({
            "type": "deal_created",
            "description": f"Deal created ({d.strategy})",
            "timestamp": (
                d.created_at.isoformat() if d.created_at else ""
            ),
            "entity_id": str(d.id),
            "entity_type": "deal",
        })

    # DataSourceEvents
    try:
        from models.data_source_events import DataSourceEvent
        dse_rows = db.query(DataSourceEvent).filter(
            DataSourceEvent.property_id == property_id,
        ).all()
        for dse in dse_rows:
            events.append({
                "type": "data_fetched",
                "description": (
                    f"{dse.provider} data fetched "
                    f"({dse.response_status})"
                ),
                "timestamp": (
                    dse.fetched_at.isoformat()
                    if dse.fetched_at else ""
                ),
                "entity_id": str(dse.id),
                "entity_type": "data_source_event",
            })
    except Exception:
        logger.debug("DataSourceEvent query skipped")

    # Transactions
    try:
        from models.transactions import Transaction
        txns = db.query(Transaction).filter(
            Transaction.property_id == property_id,
            Transaction.is_deleted == False,  # noqa: E712
        ).all()
        for txn in txns:
            amt = float(txn.amount) if txn.amount else 0
            sign = "+" if amt >= 0 else ""
            events.append({
                "type": "transaction_recorded",
                "description": (
                    f"{txn.transaction_type}: "
                    f"{sign}${abs(amt):,.0f}"
                ),
                "timestamp": (
                    txn.occurred_at.isoformat()
                    if txn.occurred_at else ""
                ),
                "entity_id": str(txn.id),
                "entity_type": "transaction",
            })
    except Exception:
        logger.debug("Transaction query skipped")

    # Sort by timestamp desc, limit
    events.sort(
        key=lambda e: e["timestamp"],
        reverse=True,
    )
    events = events[:limit]

    return [PropertyActivityItem(**e) for e in events]


# ---------------------------------------------------------------------------
# Property detail + scenario endpoints
# ---------------------------------------------------------------------------

@router.get("/{property_id}", response_model=PropertyDetailResponse)
async def get_property(
    property_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PropertyDetailResponse:
    """Get a property by ID."""
    prop = db.query(Property).filter(
        Property.id == property_id,
        Property.created_by == current_user.id,
        Property.is_deleted == False,
    ).first()

    if not prop:
        raise HTTPException(status_code=404, detail={"error": "Property not found", "code": "NOT_FOUND"})

    return PropertyDetailResponse.from_property(prop)


@router.get("/{property_id}/scenarios", response_model=list[ScenarioDetailResponse])
async def list_scenarios(
    property_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ScenarioDetailResponse]:
    """List all scenarios for a property."""
    # Verify property ownership
    prop = db.query(Property).filter(
        Property.id == property_id,
        Property.created_by == current_user.id,
        Property.is_deleted == False,
    ).first()
    if not prop:
        raise HTTPException(status_code=404, detail={"error": "Property not found", "code": "NOT_FOUND"})

    scenarios = db.query(AnalysisScenario).filter(
        AnalysisScenario.property_id == property_id,
        AnalysisScenario.created_by == current_user.id,
        AnalysisScenario.is_deleted == False,
    ).order_by(AnalysisScenario.strategy).all()

    return [ScenarioDetailResponse.from_scenario(s) for s in scenarios]


@router.post("/{property_id}/scenarios", response_model=ScenarioDetailResponse, status_code=201)
@limiter.limit("10/minute")
async def create_scenario(
    request: Request,
    property_id: UUID,
    body: CreateScenarioRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ScenarioDetailResponse:
    """Create a new AnalysisScenario for a different strategy on the same property.

    Auto-fills inputs from Property data, calculates outputs, generates AI narrative async.
    """
    VALID = {"wholesale", "buy_and_hold", "flip", "brrrr", "creative_finance"}
    if body.strategy not in VALID:
        raise HTTPException(status_code=400, detail={"error": "Invalid strategy", "code": "INVALID_STRATEGY"})

    prop = db.query(Property).filter(
        Property.id == property_id,
        Property.created_by == current_user.id,
        Property.is_deleted == False,
    ).first()
    if not prop:
        raise HTTPException(status_code=404, detail={"error": "Property not found", "code": "NOT_FOUND"})

    # Check if scenario already exists
    existing = db.query(AnalysisScenario).filter(
        AnalysisScenario.property_id == property_id,
        AnalysisScenario.created_by == current_user.id,
        AnalysisScenario.strategy == body.strategy,
        AnalysisScenario.is_deleted == False,
    ).first()
    if existing:
        return ScenarioDetailResponse.from_scenario(existing)

    # Build inputs from property data
    inputs = _build_inputs_from_property(prop, body.strategy)

    # Calculate outputs
    outputs = {}
    risk_score = None
    try:
        calc_mod = importlib.import_module(f"core.calculators.{body.strategy}")
        calc_fn = getattr(calc_mod, f"calculate_{body.strategy}")
        risk_mod = importlib.import_module("core.calculators.risk_score")
        outputs = calc_fn(inputs)
        risk_score = risk_mod.calculate_risk_score(body.strategy, inputs, outputs)
    except Exception as e:
        logger.warning("Calculator error for new scenario: %s", e)

    # Create scenario
    scenario = AnalysisScenario(
        property_id=prop.id,
        created_by=current_user.id,
        strategy=body.strategy,
        outputs=outputs,
        risk_score=risk_score,
        is_sample=prop.is_sample,
    )

    # Set typed columns from inputs
    typed_mapping = {
        "purchase_price": "purchase_price",
        "after_repair_value": "after_repair_value",
        "repair_cost": "repair_cost",
        "monthly_rent": "monthly_rent",
        "down_payment_pct": "down_payment_pct",
        "interest_rate": "interest_rate",
        "loan_term_years": "loan_term_years",
    }
    for scenario_col, input_key in typed_mapping.items():
        val = inputs.get(input_key)
        if val is not None:
            setattr(scenario, scenario_col, val)

    # Store remaining inputs in extended
    typed_keys = set(typed_mapping.values())
    extended = {k: v for k, v in inputs.items() if k not in typed_keys}
    if extended:
        scenario.inputs_extended = extended

    db.add(scenario)
    db.commit()
    db.refresh(scenario)

    # Generate narrative (non-blocking on failure)
    try:
        from core.ai.deal_narrator import narrate
        result = await narrate(scenario, prop)
        if result.narrative:
            scenario.ai_narrative = result.narrative
            scenario.ai_narrative_generated_at = datetime.utcnow()
            db.commit()
    except Exception:
        logger.debug("Narrative generation skipped for new scenario")

    return ScenarioDetailResponse.from_scenario(scenario)


def _build_inputs_from_property(prop: Property, strategy: str) -> dict:
    """Build calculator inputs from property data for a given strategy."""
    # Estimate purchase price from property data or use a placeholder
    purchase = 150000  # default
    rent = 1200  # default
    if prop.sqft and prop.sqft > 0:
        # rough $/sqft estimate for Midwest
        purchase = prop.sqft * 100

    base = {"purchase_price": purchase}

    if strategy == "buy_and_hold":
        return {
            **base,
            "down_payment_pct": 20,
            "interest_rate": 7.25,
            "loan_term_years": 30,
            "monthly_rent": rent,
            "monthly_taxes": round(purchase * 0.015 / 12),
            "monthly_insurance": round(purchase * 0.005 / 12),
            "vacancy_rate_pct": 8,
            "maintenance_pct": 5,
            "mgmt_fee_pct": 8,
        }
    elif strategy == "wholesale":
        return {
            "arv": round(purchase * 1.4),
            "repair_costs": round(purchase * 0.25),
            "desired_profit": 10000,
            "closing_costs_pct": 3,
            "asking_price": purchase,
        }
    elif strategy == "flip":
        return {
            **base,
            "arv": round(purchase * 1.5),
            "rehab_budget": round(purchase * 0.3),
            "holding_months": 5,
            "selling_costs_pct": 8,
            "financing_costs": round(purchase * 0.05),
        }
    elif strategy == "brrrr":
        return {
            **base,
            "rehab_costs": round(purchase * 0.3),
            "arv_post_rehab": round(purchase * 1.5),
            "refinance_ltv_pct": 75,
            "new_loan_rate": 7.25,
            "new_loan_term_years": 30,
            "monthly_rent": rent,
            "monthly_expenses": 400,
        }
    elif strategy == "creative_finance":
        return {
            "existing_loan_balance": round(purchase * 0.8),
            "existing_interest_rate": 4.0,
            "monthly_piti": round(purchase * 0.006),
            "monthly_rent_estimate": rent,
            "monthly_expenses": 300,
            "finance_type": "subject_to",
            "new_rate": 4.0,
            "new_term_years": 25,
            "arv": round(purchase * 1.2),
        }
    return base
