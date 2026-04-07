"""Auth router — current-user profile endpoints.

All legacy registration, login, logout, token refresh, and password reset
endpoints have been removed. Authentication is handled entirely by Clerk.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.demo import is_reserved_email
from core.security.jwt import get_current_user
from database import get_db
from models.users import User
from schemas.auth import (
    UpdateProfileRequest,
    UserProfileResponse,
    UserResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """Return the currently authenticated user's profile."""
    return UserResponse.model_validate(current_user)


@router.get("/me/", response_model=UserProfileResponse)
async def get_profile(current_user: User = Depends(get_current_user)) -> UserProfileResponse:
    """Return the current user's profile for the settings page."""
    return UserProfileResponse.model_validate(current_user)


@router.put("/me/", response_model=UserProfileResponse)
async def update_profile(
    body: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserProfileResponse:
    """Update the current user's profile.

    Supports partial updates — only provided fields are changed.
    Password changes are not supported (handled by Clerk).
    """
    if body.name is not None:
        current_user.name = body.name

    if body.email is not None and body.email != current_user.email:
        if is_reserved_email(body.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "This email is reserved", "code": "EMAIL_RESERVED"},
            )
        existing = db.query(User).filter(User.email == body.email, User.id != current_user.id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "Email already in use", "code": "EMAIL_ALREADY_EXISTS"},
            )
        current_user.email = body.email

    db.commit()
    db.refresh(current_user)
    return UserProfileResponse.model_validate(current_user)
