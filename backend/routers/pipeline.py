"""Pipeline router — Kanban board endpoints for moving deals through stages."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from core.billing.tier_gate import require_feature
from core.security.jwt import get_current_user
from database import get_db
from limiter import limiter
from models.deals import Deal
from models.pipeline_entries import PipelineEntry
from models.properties import Property
from models.users import User
from schemas.pipeline import (
    PipelineBoardResponse,
    PipelineCardResponse,
    PipelineCreateRequest,
    PipelineStageUpdateRequest,
    PipelineStatsResponse,
)

router = APIRouter(prefix="/pipeline", tags=["pipeline"])

_ALL_STAGES = ["lead", "analyzing", "offer_sent", "under_contract", "due_diligence", "closed", "dead"]


def _asking_price(inputs: dict) -> float | None:
    """Extract the asking/purchase price from deal inputs regardless of strategy key."""
    for key in ("asking_price", "purchase_price"):
        if key in inputs:
            try:
                return float(inputs[key])
            except (TypeError, ValueError):
                pass
    return None


def _build_card(
    entry: PipelineEntry,
    deal: Deal,
    prop: Property | None = None,
) -> PipelineCardResponse:
    """Build a PipelineCardResponse from a pipeline entry and its deal."""
    now = datetime.utcnow()
    days = (
        (now - entry.entered_stage_at).days
        if entry.entered_stage_at else 0
    )
    return PipelineCardResponse(
        pipeline_id=entry.id,
        deal_id=deal.id,
        address=deal.address,
        strategy=deal.strategy,
        asking_price=_asking_price(deal.inputs or {}),
        stage=entry.stage,
        days_in_stage=days,
        entered_stage_at=entry.entered_stage_at,
        city=prop.city if prop else None,
        state=prop.state if prop else None,
        property_type=prop.property_type if prop else None,
        is_sample=prop.is_sample if prop else False,
    )


@router.get("/", response_model=PipelineBoardResponse)
@limiter.limit("60/minute")
async def get_pipeline_board(
    request: Request,
    strategy: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _gate: None = Depends(require_feature("pipeline_enabled")),
) -> PipelineBoardResponse:
    """Return pipeline entries grouped by stage.

    Optional strategy filter. All 7 stage keys always present.
    """
    q = (
        db.query(PipelineEntry, Deal)
        .join(Deal, PipelineEntry.deal_id == Deal.id)
        .outerjoin(Property, Deal.property_id == Property.id)
        .filter(
            PipelineEntry.user_id == current_user.id,
            Deal.deleted_at.is_(None),
        )
    )

    if strategy:
        q = q.filter(Deal.strategy == strategy)

    # Also fetch Property in the result set
    rows = (
        db.query(PipelineEntry, Deal, Property)
        .join(Deal, PipelineEntry.deal_id == Deal.id)
        .outerjoin(Property, Deal.property_id == Property.id)
        .filter(
            PipelineEntry.user_id == current_user.id,
            Deal.deleted_at.is_(None),
            *([Deal.strategy == strategy] if strategy else []),
        )
        .all()
    )

    board: dict[str, list[PipelineCardResponse]] = {
        stage: [] for stage in _ALL_STAGES
    }
    for entry, deal, prop in rows:
        if entry.stage in board:
            board[entry.stage].append(
                _build_card(entry, deal, prop)
            )

    return PipelineBoardResponse(**board)


@router.post("/", response_model=PipelineCardResponse, status_code=status.HTTP_201_CREATED)
async def add_to_pipeline(
    body: PipelineCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _gate: None = Depends(require_feature("pipeline_enabled")),
) -> PipelineCardResponse:
    """Add a deal to the pipeline at the specified stage.

    Validates that the deal exists and belongs to the current user.
    """
    if body.stage not in _ALL_STAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": f"Invalid stage '{body.stage}'", "code": "INVALID_STAGE"},
        )

    deal = db.query(Deal).filter(
        Deal.id == body.deal_id,
        Deal.user_id == current_user.id,
        Deal.deleted_at.is_(None),
    ).first()
    if not deal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Deal not found", "code": "DEAL_NOT_FOUND"},
        )

    # Prevent duplicate pipeline entries for the same deal
    existing = db.query(PipelineEntry).filter(
        PipelineEntry.deal_id == deal.id,
        PipelineEntry.user_id == current_user.id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": "Deal is already in the pipeline", "code": "DUPLICATE_ENTRY"},
        )

    entry = PipelineEntry(
        deal_id=deal.id,
        user_id=current_user.id,
        team_id=current_user.team_id,
        stage=body.stage,
        entered_stage_at=datetime.utcnow(),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _build_card(entry, deal)


@router.put("/{entry_id}/stage/", response_model=PipelineCardResponse)
async def move_stage(
    entry_id: UUID,
    body: PipelineStageUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _gate: None = Depends(require_feature("pipeline_enabled")),
) -> PipelineCardResponse:
    """Move a pipeline card to a new stage and reset its entered_stage_at timestamp."""
    if body.stage not in _ALL_STAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": f"Invalid stage '{body.stage}'", "code": "INVALID_STAGE"},
        )

    entry = db.query(PipelineEntry).filter(
        PipelineEntry.id == entry_id,
        PipelineEntry.user_id == current_user.id,
    ).first()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Pipeline entry not found", "code": "ENTRY_NOT_FOUND"},
        )

    entry.stage = body.stage
    entry.entered_stage_at = datetime.utcnow()
    entry.updated_at = datetime.utcnow()
    if body.notes is not None:
        entry.notes = body.notes

    db.commit()
    db.refresh(entry)

    deal = db.query(Deal).filter(Deal.id == entry.deal_id).first()
    return _build_card(entry, deal)


@router.delete("/{entry_id}/")
async def remove_from_pipeline(
    entry_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _gate: None = Depends(require_feature("pipeline_enabled")),
) -> dict[str, str]:
    """Remove a deal from the pipeline (hard delete — pipeline entries are ephemeral)."""
    entry = db.query(PipelineEntry).filter(
        PipelineEntry.id == entry_id,
        PipelineEntry.user_id == current_user.id,
    ).first()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Pipeline entry not found", "code": "ENTRY_NOT_FOUND"},
        )
    db.delete(entry)
    db.commit()
    return {"message": "Removed from pipeline"}


@router.get("/stats", response_model=PipelineStatsResponse)
async def get_pipeline_stats(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PipelineStatsResponse:
    """Pipeline analytics: counts by stage/strategy, total value."""
    rows = (
        db.query(PipelineEntry.stage, Deal.strategy)
        .join(Deal, PipelineEntry.deal_id == Deal.id)
        .filter(
            PipelineEntry.user_id == current_user.id,
            Deal.deleted_at.is_(None),
        )
        .all()
    )

    by_stage: dict[str, int] = {}
    by_strategy: dict[str, int] = {}
    active_stages = {
        "lead", "analyzing", "offer_sent",
        "under_contract", "due_diligence",
    }
    total_active = 0

    for stage, strategy in rows:
        by_stage[stage] = by_stage.get(stage, 0) + 1
        by_strategy[strategy] = (
            by_strategy.get(strategy, 0) + 1
        )
        if stage in active_stages:
            total_active += 1

    return PipelineStatsResponse(
        by_stage=by_stage,
        by_strategy=by_strategy,
        total_value=0,
        total_active=total_active,
    )
