"""Pydantic schemas for the deal pipeline (Kanban board)."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class PipelineCreateRequest(BaseModel):
    """Request body for POST /pipeline — adds a deal to the pipeline."""

    deal_id: uuid.UUID
    stage: str


class PipelineStageUpdateRequest(BaseModel):
    """Request body for PUT /pipeline/:id/stage — moves a card to a new stage."""

    stage: str
    notes: Optional[str] = None


class PipelineCardResponse(BaseModel):
    """A single pipeline card representing a deal in a specific stage."""

    pipeline_id: uuid.UUID
    deal_id: uuid.UUID
    address: str
    strategy: str
    asking_price: Optional[float]
    stage: str
    days_in_stage: int
    entered_stage_at: datetime

    model_config = {"from_attributes": True}


class PipelineBoardResponse(BaseModel):
    """Full pipeline board response — all 7 stages with their cards."""

    lead: list[PipelineCardResponse]
    analyzing: list[PipelineCardResponse]
    offer_sent: list[PipelineCardResponse]
    under_contract: list[PipelineCardResponse]
    due_diligence: list[PipelineCardResponse]
    closed: list[PipelineCardResponse]
    dead: list[PipelineCardResponse]
