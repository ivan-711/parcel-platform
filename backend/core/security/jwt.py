"""Clerk-only authentication dependency for FastAPI.

All legacy JWT/cookie/password code has been removed. Authentication is
handled exclusively by Clerk Bearer tokens verified via the clerk module.
"""

import logging
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from database import get_db
from models.users import User

logger = logging.getLogger(__name__)


async def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    """Resolve the authenticated user from a Clerk Bearer token.

    Supports:
    1. Lookup by clerk_user_id (primary)
    2. Fallback to email lookup + link clerk_user_id
    3. JIT provisioning for first-time Clerk sign-ins

    Raises:
        HTTPException 401 if no valid Bearer token or user cannot be resolved.
        HTTPException 503 if Clerk is not configured.
    """
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Not authenticated", "code": "NOT_AUTHENTICATED"},
        )

    bearer_token = auth_header[7:]

    from core.security.clerk import verify_clerk_token, is_clerk_configured

    if not is_clerk_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "Authentication service not configured",
                "code": "AUTH_NOT_CONFIGURED",
            },
        )

    claims = verify_clerk_token(bearer_token)
    if not claims or not claims.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Invalid or expired token", "code": "INVALID_TOKEN"},
        )

    user: Optional[User] = None

    # --- Primary lookup: clerk_user_id ---
    user = (
        db.query(User).filter(User.clerk_user_id == claims["sub"]).first()
    )

    # --- Fallback: email lookup + link ---
    if not user and claims.get("email"):
        user = db.query(User).filter(User.email == claims["email"]).first()
        if user and not user.clerk_user_id:
            user.clerk_user_id = claims["sub"]
            db.commit()

    # --- JIT provisioning: create user on first Clerk sign-in ---
    if not user:
        from core.security.clerk import fetch_clerk_user

        clerk_user = fetch_clerk_user(claims["sub"])
        if clerk_user:
            # One more email check with the Clerk API email
            if clerk_user.get("email"):
                user = (
                    db.query(User)
                    .filter(User.email == clerk_user["email"])
                    .first()
                )
                if user and not user.clerk_user_id:
                    user.clerk_user_id = claims["sub"]
                    db.commit()

            # Create if still not found
            if not user:
                user = User(
                    email=clerk_user.get(
                        "email", f'{claims["sub"]}@clerk.local'
                    ),
                    name=(
                        clerk_user.get("name")
                        or clerk_user.get("email", "").split("@")[0]
                        or "User"
                    ),
                    role="investor",
                    clerk_user_id=claims["sub"],
                    plan_tier="free",
                )
                db.add(user)
                db.commit()
                db.refresh(user)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "User not found", "code": "USER_NOT_FOUND"},
        )

    # Set RLS context so all subsequent queries in this request are scoped
    from core.security.rls import set_rls_context

    set_rls_context(db, user.id, user.team_id)

    return user
