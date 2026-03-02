"""Settings router — user notification preferences."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.security.jwt import get_current_user
from database import get_db
from models.users import User
from schemas.settings import (
    NotificationPreferencesResponse,
    UpdateNotificationPreferencesRequest,
)

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/notifications/", response_model=NotificationPreferencesResponse)
async def get_notification_preferences(
    current_user: User = Depends(get_current_user),
) -> NotificationPreferencesResponse:
    """Return the current user's notification preferences."""
    return NotificationPreferencesResponse(
        email_notifications=current_user.email_notifications,
    )


@router.patch("/notifications/", response_model=NotificationPreferencesResponse)
async def update_notification_preferences(
    body: UpdateNotificationPreferencesRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NotificationPreferencesResponse:
    """Toggle email notifications on or off for the current user."""
    current_user.email_notifications = body.email_notifications
    db.commit()
    db.refresh(current_user)
    return NotificationPreferencesResponse(
        email_notifications=current_user.email_notifications,
    )
