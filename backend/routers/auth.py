"""Auth router — register, login, logout, and current-user endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from core.security.jwt import create_access_token, get_current_user, hash_password, verify_password
from database import get_db
from models.users import User
from schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])

_COOKIE_NAME = "access_token"
_COOKIE_MAX_AGE = 60 * 15  # 15 minutes in seconds


def _set_auth_cookie(response: Response, token: str) -> None:
    """Set the JWT as an httpOnly cookie on the response."""
    response.set_cookie(
        key=_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=False,   # set to True in production (HTTPS)
        samesite="lax",
        max_age=_COOKIE_MAX_AGE,
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, response: Response, db: Session = Depends(get_db)) -> TokenResponse:
    """Register a new user account.

    Creates the user, issues a JWT access token, and sets it in an httpOnly cookie.
    Returns 400 if the email is already in use.
    """
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

    token = create_access_token({"sub": str(user.id)})
    _set_auth_cookie(response, token)

    return TokenResponse(user=UserResponse.model_validate(user), access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)) -> TokenResponse:
    """Authenticate an existing user.

    Verifies the password and issues a new JWT access token in an httpOnly cookie.
    Returns 401 on invalid credentials.
    """
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Invalid email or password", "code": "INVALID_CREDENTIALS"},
        )

    token = create_access_token({"sub": str(user.id)})
    _set_auth_cookie(response, token)

    return TokenResponse(user=UserResponse.model_validate(user), access_token=token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> None:
    """Clear the access token cookie, effectively logging the user out."""
    response.delete_cookie(key=_COOKIE_NAME)


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """Return the currently authenticated user's profile."""
    return UserResponse.model_validate(current_user)
