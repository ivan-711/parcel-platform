"""Pydantic schemas for user notification preferences."""

from pydantic import BaseModel


class NotificationPreferencesResponse(BaseModel):
    """Response shape for GET /settings/notifications/."""

    email_notifications: bool


class UpdateNotificationPreferencesRequest(BaseModel):
    """Request body for PATCH /settings/notifications/."""

    email_notifications: bool
