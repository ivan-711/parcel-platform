"""Pydantic schemas for team management — creation, invites, and member roles."""

import uuid
from datetime import datetime

from pydantic import BaseModel


class TeamCreateRequest(BaseModel):
    """Request body for POST /teams — creates a new team."""

    name: str


class TeamResponse(BaseModel):
    """Basic team info response."""

    id: uuid.UUID
    name: str
    created_by: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class TeamMemberResponse(BaseModel):
    """A team member with their user details and role."""

    user_id: uuid.UUID
    name: str
    email: str
    role: str
    joined_at: datetime

    model_config = {"from_attributes": True}


class TeamDetailResponse(BaseModel):
    """Full team detail including all current members."""

    id: uuid.UUID
    name: str
    members: list[TeamMemberResponse]


class InviteRequest(BaseModel):
    """Request body for inviting a user to a team."""

    email: str
    role: str = "viewer"


class RoleUpdateRequest(BaseModel):
    """Request body for updating a team member's role."""

    role: str
