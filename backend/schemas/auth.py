"""Pydantic schemas for authentication — register, login, and user responses."""

import re
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator, model_validator

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class RegisterRequest(BaseModel):
    """Request body for POST /auth/register."""

    name: str
    email: str
    password: str
    role: str = "investor"

    @field_validator("email")
    @classmethod
    def email_format(cls, v: str) -> str:
        if not _EMAIL_RE.match(v):
            raise ValueError("Invalid email address")
        return v.lower()

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("role")
    @classmethod
    def role_valid(cls, v: str) -> str:
        allowed = {"wholesaler", "investor", "agent"}
        if v not in allowed:
            raise ValueError(f"Role must be one of: {', '.join(allowed)}")
        return v


class LoginRequest(BaseModel):
    """Request body for POST /auth/login."""

    email: str
    password: str


class UserResponse(BaseModel):
    """Public representation of a user (no password hash)."""

    id: uuid.UUID
    name: str
    email: str
    role: str
    team_id: Optional[uuid.UUID]
    created_at: datetime
    plan_tier: str = "free"
    trial_ends_at: Optional[datetime] = None
    effective_tier: str = "free"
    trial_active: bool = False

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def _compute_billing_fields(self) -> "UserResponse":
        tier_str = self.plan_tier or "free"
        is_demo = self.email == "demo@parcel.app"

        trial_active = (
            self.trial_ends_at is not None
            and self.trial_ends_at > datetime.utcnow()
            and tier_str == "free"
            and not is_demo
        )

        if is_demo or trial_active:
            self.effective_tier = "pro"
        else:
            self.effective_tier = tier_str

        self.trial_active = trial_active
        return self


class UserProfileResponse(BaseModel):
    """User profile for the settings page (no sensitive fields)."""

    id: uuid.UUID
    email: str
    name: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UpdateProfileRequest(BaseModel):
    """Request body for PUT /auth/me/ — all fields optional for partial updates."""

    name: Optional[str] = None
    email: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None

    @field_validator("email")
    @classmethod
    def email_format(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not _EMAIL_RE.match(v):
            raise ValueError("Invalid email address")
        return v.lower() if v else v

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class AuthSuccessResponse(BaseModel):
    """Response body for register and login — user data only. JWT is delivered via httpOnly cookie."""

    user: UserResponse


class ForgotPasswordRequest(BaseModel):
    """Request body for POST /auth/forgot-password."""

    email: str

    @field_validator("email")
    @classmethod
    def email_format(cls, v: str) -> str:
        if not _EMAIL_RE.match(v):
            raise ValueError("Invalid email address")
        return v.lower()


class ResetPasswordRequest(BaseModel):
    """Request body for POST /auth/reset-password."""

    token: str
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v
