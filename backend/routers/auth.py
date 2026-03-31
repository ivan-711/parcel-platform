"""Auth router — register, login, logout, current-user, and password reset endpoints."""

import hashlib
import logging
import os
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from core.demo import is_reserved_email
from core.email import send_password_reset_email
from core.security.jwt import create_access_token, create_refresh_token, get_current_user, hash_password, verify_password, verify_refresh_token
from database import get_db
from limiter import limiter
from models.password_reset_tokens import PasswordResetToken
from models.users import User
from schemas.auth import (
    AuthSuccessResponse,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    UpdateProfileRequest,
    UserProfileResponse,
    UserResponse,
)

logger = logging.getLogger(__name__)

RESET_TOKEN_EXPIRY_HOURS = 1

router = APIRouter(prefix="/auth", tags=["auth"])

_COOKIE_NAME = "access_token"
_REFRESH_COOKIE_NAME = "refresh_token"
_COOKIE_MAX_AGE = 60 * 15  # 15 minutes in seconds
_REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7  # 7 days in seconds
_IS_PRODUCTION = os.getenv("ENVIRONMENT", "development") == "production"


def _set_auth_cookie(response: Response, token: str) -> None:
    """Set the JWT as an httpOnly cookie on the response.

    Production: SameSite=None + Secure for cookies sent between
    parceldesk.io (Vercel) and api.parceldesk.io (Railway).
    Development: SameSite=Lax + no Secure for localhost.
    """
    response.set_cookie(
        key=_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=_IS_PRODUCTION,
        samesite="none" if _IS_PRODUCTION else "lax",
        max_age=_COOKIE_MAX_AGE,
        path="/",
    )


def _set_refresh_cookie(response: Response, token: str) -> None:
    """Set the refresh JWT as an httpOnly cookie with 7-day expiry."""
    response.set_cookie(
        key=_REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=_IS_PRODUCTION,
        samesite="none" if _IS_PRODUCTION else "lax",
        max_age=_REFRESH_COOKIE_MAX_AGE,
        path="/",
    )


def _set_auth_cookies(response: Response, user_id: str) -> None:
    """Set both access and refresh token cookies."""
    access = create_access_token({"sub": user_id})
    refresh = create_refresh_token({"sub": user_id})
    _set_auth_cookie(response, access)
    _set_refresh_cookie(response, refresh)


@router.post("/register", response_model=AuthSuccessResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")
async def register(request: Request, body: RegisterRequest, response: Response, db: Session = Depends(get_db)) -> AuthSuccessResponse:
    """Register a new user account.

    Creates the user, issues a JWT access token, and sets it in an httpOnly cookie.
    The token is NOT returned in the response body — only via the cookie.
    Returns 400 if the email is already in use.
    """
    if is_reserved_email(body.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "This email is reserved", "code": "EMAIL_RESERVED"},
        )

    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Email already in use", "code": "EMAIL_ALREADY_EXISTS"},
        )

    user = User(
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
        role=body.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Set 7-day Pro trial for new users (skip for demo account)
    if user.email != "demo@parcel.app":
        from core.billing.config import get_stripe_settings

        settings = get_stripe_settings()
        user.trial_ends_at = datetime.utcnow() + timedelta(days=settings.TRIAL_PERIOD_DAYS)
        db.commit()
        db.refresh(user)

    _set_auth_cookies(response, str(user.id))

    return AuthSuccessResponse(user=UserResponse.model_validate(user))


@router.post("/login", response_model=AuthSuccessResponse)
@limiter.limit("5/minute")
async def login(request: Request, body: LoginRequest, response: Response, db: Session = Depends(get_db)) -> AuthSuccessResponse:
    """Authenticate an existing user.

    Verifies the password and issues a new JWT access token in an httpOnly cookie.
    The token is NOT returned in the response body — only via the cookie.
    Returns 401 on invalid credentials.
    """
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Invalid email or password", "code": "INVALID_CREDENTIALS"},
        )

    _set_auth_cookies(response, str(user.id))

    return AuthSuccessResponse(user=UserResponse.model_validate(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> None:
    """Clear both access and refresh token cookies, effectively logging the user out."""
    for cookie_name in (_COOKIE_NAME, _REFRESH_COOKIE_NAME):
        response.delete_cookie(
            key=cookie_name,
            httponly=True,
            secure=_IS_PRODUCTION,
            samesite="none" if _IS_PRODUCTION else "lax",
            path="/",
        )


@router.post("/refresh", response_model=AuthSuccessResponse)
@limiter.limit("20/minute")
async def refresh(request: Request, response: Response, db: Session = Depends(get_db)) -> AuthSuccessResponse:
    """Refresh the access token using the refresh token cookie.

    Validates the refresh token, checks the user still exists, and issues a
    new access token cookie. The refresh token itself is rotated for security.
    Returns the user profile so the frontend can sync auth state.
    """
    token: str | None = request.cookies.get(_REFRESH_COOKIE_NAME)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "No refresh token", "code": "NO_REFRESH_TOKEN"},
        )

    user_id = verify_refresh_token(token)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "User not found", "code": "USER_NOT_FOUND"},
        )

    _set_auth_cookies(response, str(user.id))
    return AuthSuccessResponse(user=UserResponse.model_validate(user))


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
    Password changes require the current password for verification.
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

    if body.new_password is not None:
        if not body.current_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "Current password is required to set a new password", "code": "CURRENT_PASSWORD_REQUIRED"},
            )
        if not verify_password(body.current_password, current_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "Current password is incorrect", "code": "INVALID_PASSWORD"},
            )
        current_user.password_hash = hash_password(body.new_password)

    db.commit()
    db.refresh(current_user)
    return UserProfileResponse.model_validate(current_user)


def _hash_token(token: str) -> str:
    """Return a SHA-256 hex digest of the raw token for safe DB storage."""
    return hashlib.sha256(token.encode()).hexdigest()


@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(request: Request, body: ForgotPasswordRequest, db: Session = Depends(get_db)) -> dict:
    """Initiate the password reset flow.

    Generates a secure reset token, stores its hash in the database, and sends
    a reset email via Resend.  Always returns 200 — never reveals whether the
    email exists (prevents user enumeration).
    """
    user = db.query(User).filter(User.email == body.email).first()

    if user:
        # Invalidate any existing unused tokens for this user
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
        ).update({"used_at": datetime.utcnow()})

        # Generate a cryptographically secure token
        raw_token = secrets.token_urlsafe(32)
        token_hash = _hash_token(raw_token)

        reset_entry = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.utcnow() + timedelta(hours=RESET_TOKEN_EXPIRY_HOURS),
        )
        db.add(reset_entry)
        db.commit()

        # Build the reset URL and send the email (fire-and-forget)
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        reset_url = f"{frontend_url}/reset-password?token={raw_token}"
        send_password_reset_email(user.email, reset_url)

    # Always return the same response regardless of whether the email exists
    return {"message": "If an account exists with that email, a password reset link has been sent."}


@router.post("/reset-password")
@limiter.limit("3/minute")
async def reset_password(request: Request, body: ResetPasswordRequest, db: Session = Depends(get_db)) -> dict:
    """Reset a user's password using a valid reset token.

    Validates the token hash and expiry, updates the password, and marks the
    token as used so it cannot be reused.
    """
    token_hash = _hash_token(body.token)

    reset_entry = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
    ).first()

    if not reset_entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Invalid or expired reset token", "code": "INVALID_TOKEN"},
        )

    if reset_entry.used_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "This reset token has already been used", "code": "INVALID_TOKEN"},
        )

    if datetime.utcnow() > reset_entry.expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "This reset token has expired", "code": "INVALID_TOKEN"},
        )

    # Update the user's password
    user = db.query(User).filter(User.id == reset_entry.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Invalid or expired reset token", "code": "INVALID_TOKEN"},
        )

    user.password_hash = hash_password(body.password)

    # Mark token as used
    reset_entry.used_at = datetime.utcnow()

    db.commit()

    return {"message": "Your password has been reset successfully. You can now log in with your new password."}
