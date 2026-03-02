"""Pipeline router — Kanban board endpoints for moving deals through stages."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.security.jwt import get_current_user
from database import get_db
from models.deals import Deal
from models.pipeline_entries import PipelineEntry
from models.users import User
from schemas.pipeline import (
    PipelineBoardResponse,
    PipelineCardResponse,
    PipelineCreateRequest,
    PipelineStageUpdateRequest,
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


def _build_card(entry: PipelineEntry, deal: Deal) -> PipelineCardResponse:
    """Build a PipelineCardResponse from a pipeline entry and its associated deal."""
    now = datetime.utcnow()
    days = (now - entry.entered_stage_at).days if entry.entered_stage_at else 0
    return PipelineCardResponse(
        pipeline_id=entry.id,
        deal_id=deal.id,
        address=deal.address,
        strategy=deal.strategy,
        asking_price=_asking_price(deal.inputs or {}),
        stage=entry.stage,
        days_in_stage=days,
        entered_stage_at=entry.entered_stage_at,
    )


@router.get("/", response_model=PipelineBoardResponse)
async def get_pipeline_board(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PipelineBoardResponse:
    """Return all pipeline entries for the current user grouped by stage.

    All 7 stage keys are always present in the response (empty list if no cards).
    """
    entries = (
        db.query(PipelineEntry, Deal)
        .join(Deal, PipelineEntry.deal_id == Deal.id)
        .filter(
            PipelineEntry.user_id == current_user.id,
            Deal.deleted_at.is_(None),
        )
        .all()
    )

    board: dict[str, list[PipelineCardResponse]] = {stage: [] for stage in _ALL_STAGES}
    for entry, deal in entries:
        if entry.stage in board:
            board[entry.stage].append(_build_card(entry, deal))

    return PipelineBoardResponse(**board)


@router.post("/", response_model=PipelineCardResponse, status_code=status.HTTP_201_CREATED)
async def add_to_pipeline(
    body: PipelineCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
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
