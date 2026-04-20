"""Onboarding router — persona selection and sample data management."""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from core.security.jwt import get_current_user
from database import get_db
from limiter import limiter
from models.users import User
from schemas.onboarding import (
    OnboardingPropertyResponse,
    OnboardingScenarioResponse,
    OnboardingStatusResponse,
    PersonaRequest,
    PersonaResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


def _create_sample_data(db: Session, user_id, persona: str):
    """Create sample Property + AnalysisScenario(s) for a persona."""
    from core.onboarding.sample_deals import get_sample_deal
    from models.properties import Property
    from models.analysis_scenarios import AnalysisScenario

    spec = get_sample_deal(persona)

    # Create sample Property
    prop = Property(
        created_by=user_id,
        address_line1=spec.property.address_line1,
        city=spec.property.city,
        state=spec.property.state,
        zip_code=spec.property.zip_code,
        property_type=spec.property.property_type,
        bedrooms=spec.property.bedrooms,
        bathrooms=spec.property.bathrooms,
        sqft=spec.property.sqft,
        year_built=spec.property.year_built,
        county=spec.property.county,
        status="under_analysis",
        is_sample=True,
    )
    db.add(prop)
    db.flush()

    # Create sample AnalysisScenario(s)
    scenarios = []
    for s in spec.scenarios:
        scenario = AnalysisScenario(
            property_id=prop.id,
            created_by=user_id,
            strategy=s.strategy,
            purchase_price=s.purchase_price,
            after_repair_value=s.after_repair_value,
            repair_cost=s.repair_cost,
            monthly_rent=s.monthly_rent,
            down_payment_pct=s.down_payment_pct,
            interest_rate=s.interest_rate,
            loan_term_years=s.loan_term_years,
            inputs_extended=s.inputs_extended,
            outputs=s.outputs,
            ai_narrative=s.ai_narrative,
            ai_narrative_generated_at=datetime.utcnow() if s.ai_narrative else None,
            is_sample=True,
        )
        db.add(scenario)
        db.flush()
        scenarios.append(scenario)

    return prop, scenarios


# ---------------------------------------------------------------------------
# POST /api/onboarding/persona
# ---------------------------------------------------------------------------

@router.post("/persona", response_model=PersonaResponse)
@limiter.limit("5/minute")
async def set_persona(
    request: Request,
    body: PersonaRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PersonaResponse:
    """Set the user's onboarding persona and create strategy-matched sample data."""
    from core.onboarding.sample_deals import VALID_PERSONAS

    if body.persona not in VALID_PERSONAS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": f"Invalid persona. Must be one of: {', '.join(sorted(VALID_PERSONAS))}",
                "code": "INVALID_PERSONA",
            },
        )

    # Clear any existing sample data first (idempotent)
    _clear_sample_data(db, current_user.id)

    # Update user
    current_user.onboarding_persona = body.persona
    current_user.onboarding_completed_at = datetime.utcnow()
    if body.persona == "agent" and body.notify_agent_features:
        current_user.notify_agent_features = True

    # Create sample data
    prop, scenarios = _create_sample_data(db, current_user.id, body.persona)

    db.commit()
    db.refresh(prop)
    for s in scenarios:
        db.refresh(s)

    from core.telemetry import track_event
    track_event(current_user.id, "onboarding_persona_selected", {"persona": body.persona})
    track_event(current_user.id, "onboarding_completed", {"persona": body.persona})
    if body.persona == "agent" and body.notify_agent_features:
        track_event(current_user.id, "agent_notify_opted_in", {"persona": "agent"})

    return PersonaResponse(
        persona=body.persona,
        sample_property=OnboardingPropertyResponse.model_validate(prop),
        sample_scenarios=[OnboardingScenarioResponse.model_validate(s) for s in scenarios],
    )


# ---------------------------------------------------------------------------
# GET /api/onboarding/status
# ---------------------------------------------------------------------------

@router.get("/status", response_model=OnboardingStatusResponse)
async def onboarding_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OnboardingStatusResponse:
    """Check onboarding completion status for the current user."""
    from models.properties import Property

    completed = current_user.onboarding_completed_at is not None

    has_sample = db.query(Property).filter(
        Property.created_by == current_user.id,
        Property.is_sample == True,
        Property.is_deleted == False,
    ).count() > 0

    real_count = db.query(Property).filter(
        Property.created_by == current_user.id,
        Property.is_sample == False,
        Property.is_deleted == False,
    ).count()

    return OnboardingStatusResponse(
        completed=completed,
        persona=current_user.onboarding_persona,
        has_sample_data=has_sample,
        has_real_data=real_count > 0,
        real_property_count=real_count,
        banner_dismissed=current_user.onboarding_banner_dismissed_at is not None,
    )


# ---------------------------------------------------------------------------
# POST /api/onboarding/dismiss-banner
# ---------------------------------------------------------------------------

@router.post("/dismiss-banner", status_code=status.HTTP_200_OK)
async def dismiss_banner(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Dismiss the onboarding sample-data banner for the current user."""
    current_user.onboarding_banner_dismissed_at = datetime.utcnow()
    db.commit()
    return {"dismissed": True}


# ---------------------------------------------------------------------------
# DELETE /api/onboarding/sample-data
# ---------------------------------------------------------------------------

@router.delete("/sample-data", status_code=status.HTTP_200_OK)
async def clear_sample_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Delete all sample data for the current user."""
    count = _clear_sample_data(db, current_user.id)
    db.commit()

    from core.telemetry import track_event
    track_event(current_user.id, "sample_data_cleared", {"trigger": "manual"})

    return {"message": f"Cleared {count} sample records", "count": count}


def _clear_sample_data(db: Session, user_id) -> int:
    """Soft-delete active sample records and hard-delete previously soft-deleted ones.

    This prevents unbounded accumulation of soft-deleted sample rows from
    repeated persona re-selections.

    Child rows (AnalysisScenario) must be deleted before parent rows
    (Property) to satisfy the property_id FK constraint.
    """
    from models.properties import Property
    from models.analysis_scenarios import AnalysisScenario

    # Collect IDs of sample properties about to be hard-deleted
    stale_property_ids = [
        row[0]
        for row in db.query(Property.id).filter(
            Property.created_by == user_id,
            Property.is_sample == True,
            Property.is_deleted == True,
        ).all()
    ]

    if stale_property_ids:
        # Hard-delete ALL scenarios referencing those properties (not just
        # is_sample — covers any orphans created by analysis re-runs)
        db.query(AnalysisScenario).filter(
            AnalysisScenario.property_id.in_(stale_property_ids),
            AnalysisScenario.created_by == user_id,
        ).delete(synchronize_session=False)

        # Now safe to hard-delete the parent properties
        db.query(Property).filter(
            Property.id.in_(stale_property_ids),
        ).delete(synchronize_session=False)

    # Soft-delete current active samples (scenarios first, then properties)
    scenario_count = db.query(AnalysisScenario).filter(
        AnalysisScenario.created_by == user_id,
        AnalysisScenario.is_sample == True,
        AnalysisScenario.is_deleted == False,
    ).update({"is_deleted": True})

    prop_count = db.query(Property).filter(
        Property.created_by == user_id,
        Property.is_sample == True,
        Property.is_deleted == False,
    ).update({"is_deleted": True})

    return scenario_count + prop_count
