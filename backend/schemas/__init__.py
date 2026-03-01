"""Re-export all Pydantic schemas for convenient importing."""

from schemas.auth import RegisterRequest, LoginRequest, UserResponse, TokenResponse
from schemas.deals import (
    DealCreateRequest,
    DealUpdateRequest,
    DealResponse,
    DealListItem,
)
from schemas.pipeline import (
    PipelineCreateRequest,
    PipelineStageUpdateRequest,
    PipelineCardResponse,
    PipelineBoardResponse,
)
from schemas.documents import DocumentListItem, DocumentResponse
from schemas.chat import ChatHistoryMessage, ChatRequest, ChatMessageResponse, ChatHistoryResponse
from schemas.portfolio import (
    PortfolioCreateRequest,
    PortfolioEntryResponse,
    PortfolioSummary,
    PortfolioResponse,
)
from schemas.teams import (
    TeamCreateRequest,
    TeamResponse,
    TeamMemberResponse,
    TeamDetailResponse,
    InviteRequest,
    RoleUpdateRequest,
)

__all__ = [
    "RegisterRequest", "LoginRequest", "UserResponse", "TokenResponse",
    "DealCreateRequest", "DealUpdateRequest", "DealResponse", "DealListItem",
    "PipelineCreateRequest", "PipelineStageUpdateRequest", "PipelineCardResponse", "PipelineBoardResponse",
    "DocumentListItem", "DocumentResponse",
    "ChatHistoryMessage", "ChatRequest", "ChatMessageResponse", "ChatHistoryResponse",
    "PortfolioCreateRequest", "PortfolioEntryResponse", "PortfolioSummary", "PortfolioResponse",
    "TeamCreateRequest", "TeamResponse", "TeamMemberResponse", "TeamDetailResponse", "InviteRequest", "RoleUpdateRequest",
]
