"""Test-only router for Playwright E2E setup. Gated in main.py by ENVIRONMENT.

Registered ONLY when ENVIRONMENT ∈ {"development", "test"}. In production
the router is never included, so these routes return 404.

Endpoints:
  POST /api/testing/seed-persona   — set onboarding_persona + onboarding_completed_at
  GET  /api/testing/user-state     — read persona/notify flag/completed state

These intentionally bypass Clerk auth because they are used by Playwright's
global setup before a session exists. Do NOT deploy with ENVIRONMENT=development
in production.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.users import User

router = APIRouter(prefix="/testing", tags=["testing"])


class SeedPersonaRequest(BaseModel):
    user_email: str
    persona: Optional[str] = None
    skip_onboarding: bool = False


class SeedPersonaResponse(BaseModel):
    user_id: str
    email: str
    onboarding_persona: Optional[str]
    onboarding_completed_at: Optional[str]
    notify_agent_features: bool


class UserStateResponse(BaseModel):
    user_id: str
    email: str
    onboarding_persona: Optional[str]
    onboarding_completed_at: Optional[str]
    notify_agent_features: bool


def _serialize(user: User) -> dict:
    completed_at = (
        user.onboarding_completed_at.isoformat()
        if user.onboarding_completed_at
        else None
    )
    return {
        "user_id": str(user.id),
        "email": user.email,
        "onboarding_persona": user.onboarding_persona,
        "onboarding_completed_at": completed_at,
        "notify_agent_features": bool(user.notify_agent_features),
    }


@router.post("/seed-persona", response_model=SeedPersonaResponse)
def seed_persona(
    body: SeedPersonaRequest,
    db: Session = Depends(get_db),
) -> SeedPersonaResponse:
    user = db.query(User).filter(User.email == body.user_email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "User not found", "code": "USER_NOT_FOUND"},
        )

    user.onboarding_persona = body.persona
    if body.skip_onboarding:
        if user.onboarding_completed_at is None:
            user.onboarding_completed_at = datetime.utcnow()
    else:
        user.onboarding_completed_at = None
        user.notify_agent_features = False

    db.commit()
    db.refresh(user)
    return SeedPersonaResponse(**_serialize(user))


@router.get("/user-state", response_model=UserStateResponse)
def user_state(
    email: str,
    db: Session = Depends(get_db),
) -> UserStateResponse:
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "User not found", "code": "USER_NOT_FOUND"},
        )
    return UserStateResponse(**_serialize(user))
