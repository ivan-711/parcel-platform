"""Auth router — current-user profile endpoints and account deletion.

All legacy registration, login, logout, token refresh, and password reset
endpoints have been removed. Authentication is handled entirely by Clerk.
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
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


class DeleteAccountRequest(BaseModel):
    confirmation: str  # Must be "DELETE"


@router.post("/delete-account", status_code=status.HTTP_200_OK)
async def delete_account(
    body: DeleteAccountRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Soft-delete the user's account, cancel Stripe subscription, delete Clerk user.

    Requires confirmation="DELETE" to proceed. Errors in Stripe or Clerk
    cancellation are logged but do not block the local soft-delete.
    """
    if body.confirmation != "DELETE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Type DELETE to confirm account deletion.", "code": "CONFIRMATION_REQUIRED"},
        )

    # 1. Cancel active Stripe subscription (best-effort)
    try:
        from core.billing.stripe_service import cancel_subscription
        cancel_subscription(db, current_user, immediately=True, reason="account_deletion")
    except Exception:
        logger.warning("Failed to cancel Stripe subscription for user %s during deletion", current_user.id, exc_info=True)

    # 2. Delete Clerk user (best-effort)
    if current_user.clerk_user_id:
        try:
            from core.security.clerk import CLERK_SECRET_KEY
            if CLERK_SECRET_KEY:
                import urllib.request
                req = urllib.request.Request(
                    f"https://api.clerk.com/v1/users/{current_user.clerk_user_id}",
                    method="DELETE",
                    headers={
                        "Authorization": f"Bearer {CLERK_SECRET_KEY}",
                        "User-Agent": "parcel-platform/1.0",
                    },
                )
                urllib.request.urlopen(req, timeout=10)
                logger.info("Deleted Clerk user %s", current_user.clerk_user_id)
        except Exception:
            logger.warning("Failed to delete Clerk user %s during account deletion", current_user.clerk_user_id, exc_info=True)

    # 3. Soft-delete the local user — deactivate by clearing identifiers
    # No deleted_at column on User, so we anonymize the account instead.
    original_email = current_user.email
    current_user.email = f"deleted_{current_user.id}@parcel.deleted"
    current_user.name = "Deleted User"
    current_user.clerk_user_id = None
    current_user.stripe_customer_id = None
    current_user.plan_tier = "free"
    db.commit()

    logger.info("Account deleted for user %s (was %s)", current_user.id, original_email)

    return {"message": "Your account has been deleted."}
