"""Settings router — user notification preferences and brand kit."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.security.jwt import get_current_user
from database import get_db
from models.users import User
from schemas.reports import BrandKitSchema
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


@router.get("/brand-kit/", response_model=BrandKitSchema)
async def get_brand_kit(
    current_user: User = Depends(get_current_user),
) -> BrandKitSchema:
    """Return the current user's brand kit configuration."""
    kit = current_user.brand_kit or {}
    return BrandKitSchema(**kit)


@router.patch("/brand-kit/", response_model=BrandKitSchema)
async def update_brand_kit(
    body: BrandKitSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BrandKitSchema:
    """Update the user's brand kit for reports."""
    existing = current_user.brand_kit or {}
    update = body.model_dump(exclude_none=True)
    existing.update(update)
    current_user.brand_kit = existing
    db.commit()
    db.refresh(current_user)
    return BrandKitSchema(**(current_user.brand_kit or {}))
