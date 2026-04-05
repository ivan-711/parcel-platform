"""JWT utilities and the get_current_user FastAPI dependency."""

import os
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, Request, status
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from database import get_db
from models.users import User

_secret = os.getenv("SECRET_KEY", "")
if not _secret and os.getenv("TESTING") != "1":
    raise RuntimeError(
        "SECRET_KEY environment variable must be set. "
        "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
    )
SECRET_KEY: str = _secret or "test-only-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7
JWT_ISSUER = "parcel-platform"


# ---------------------------------------------------------------------------
# Password utilities
# ---------------------------------------------------------------------------

def hash_password(plain: str) -> str:
    """Return a bcrypt hash of the given plaintext password."""
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if the plaintext password matches the stored hash."""
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ---------------------------------------------------------------------------
# JWT utilities
# ---------------------------------------------------------------------------

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT with the given payload and an expiry time.

    Args:
        data: Payload dict. Must include a ``sub`` claim (user id).
        expires_delta: Optional custom TTL; defaults to 15 minutes.

    Returns:
        Encoded JWT string.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode["exp"] = expire
    to_encode["type"] = "access"
    to_encode["iss"] = JWT_ISSUER
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """Create a signed refresh JWT with a 7-day expiry.

    Args:
        data: Payload dict. Must include a ``sub`` claim (user id).

    Returns:
        Encoded JWT string with type=refresh.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode["exp"] = expire
    to_encode["type"] = "refresh"
    to_encode["iss"] = JWT_ISSUER
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> str:
    """Decode a JWT and return the ``sub`` claim (user id).

    Raises:
        HTTPException 401 if the token is invalid or expired.
    """
    try:
        payload = jwt.decode(
            token, SECRET_KEY, algorithms=[ALGORITHM],
            issuer=JWT_ISSUER,
            options={"verify_iss": True},
        )
        # Reject refresh tokens used as access tokens
        if payload.get("type") == "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error": "Invalid token type", "code": "INVALID_TOKEN"},
            )
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error": "Invalid token", "code": "INVALID_TOKEN"},
            )
        return user_id
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Invalid or expired token", "code": "INVALID_TOKEN"},
        )


def verify_refresh_token(token: str) -> str:
    """Decode a refresh JWT and return the ``sub`` claim (user id).

    Raises:
        HTTPException 401 if the token is invalid, expired, or not a refresh token.
    """
    try:
        payload = jwt.decode(
            token, SECRET_KEY, algorithms=[ALGORITHM],
            issuer=JWT_ISSUER,
            options={"verify_iss": True},
        )
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error": "Invalid token type", "code": "INVALID_TOKEN"},
            )
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error": "Invalid token", "code": "INVALID_TOKEN"},
            )
        return user_id
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Invalid or expired refresh token", "code": "INVALID_TOKEN"},
        )


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------

async def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    """FastAPI dependency that resolves the authenticated user from the request.

    Supports dual-mode auth:
    1. Clerk JWT via Authorization: Bearer header (checked first)
    2. Legacy custom JWT via access_token httpOnly cookie (fallback)

    Raises:
        HTTPException 401 if no valid token is present or the user is not found.
    """
    user = None

    # --- Mode 1: Clerk Bearer token ---
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        bearer_token = auth_header[7:]
        from core.security.clerk import verify_clerk_token, is_clerk_configured
        if is_clerk_configured():
            claims = verify_clerk_token(bearer_token)
            if claims and claims.get("sub"):
                user = db.query(User).filter(
                    User.clerk_user_id == claims["sub"]
                ).first()
                # Fall back to email lookup if clerk_user_id not yet linked
                if not user and claims.get("email"):
                    user = db.query(User).filter(
                        User.email == claims["email"]
                    ).first()
                    if user and not user.clerk_user_id:
                        user.clerk_user_id = claims["sub"]
                        db.commit()

    # --- Mode 2: Legacy cookie JWT (fallback) ---
    if user is None:
        token: Optional[str] = request.cookies.get("access_token")
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error": "Not authenticated", "code": "NOT_AUTHENTICATED"},
            )
        user_id = verify_token(token)
        user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "User not found", "code": "USER_NOT_FOUND"},
        )

    # Set RLS context so all subsequent queries in this request are scoped
    from core.security.rls import set_rls_context
    set_rls_context(db, user.id, user.team_id)

    return user
