from __future__ import annotations

from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import (
    SESSION_COOKIE,
    _make_session_id,
    _now,
    _session_store,
    authenticate_user,
    create_session,
    invalidate_session,
    set_session_cookie,)
from app.core.database import get_session
from app.core.security import hash_password
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])

from app.api.v1.dependencies import current_user, role_required


def normalize_email(email: str) -> str:
    return email.strip().lower()


# ---------- request schemas ----------

class RegisterRequest(BaseModel):
    email: EmailStr = Field(..., min_length=1, max_length=320)
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., min_length=1, max_length=320)
    password: str = Field(..., min_length=1, max_length=128)


class UserOut(BaseModel):
    # Endpoints serialise SQLAlchemy `User` rows directly, so ORM attribute
    # reading must be enabled (without it every response raised a 500).
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    role: str
    is_active: bool
    created_at: datetime


# ---------- endpoints ----------

@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=UserOut)
def register(
    payload: RegisterRequest,
    response: Response,
    session: Annotated[Session, Depends(get_session)],
) -> UserOut:
    """Register a new account.

    Public registration always creates a **customer** account. Admin and
    astrologer roles are never assignable by public users.
    """
    normalized = normalize_email(payload.email)

    existing = session.execute(
        select(User).where(User.email_normalized == normalized)
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    user = User(
        email=payload.email,
        email_normalized=normalized,
        password_hash=hash_password(payload.password),
        role="customer",
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    # Auto-login after successful registration.
    session_id = _make_session_id()
    expires_at = _now() + timedelta(seconds=60 * 60 * 24 * 7)
    _session_store.set(session_id, user.id, user.role, expires_at)
    set_session_cookie(response, session_id)

    return UserOut.model_validate(user)


@router.post("/login", status_code=status.HTTP_200_OK, response_model=UserOut)
def login(
    payload: LoginRequest,
    response: Response,
    session: Annotated[Session, Depends(get_session)],
) -> UserOut:
    """Authenticate and create a session cookie.

    Errors use a generic message that does not reveal whether the email or
    password was wrong.
    """
    normalized = normalize_email(payload.email)
    user = authenticate_user(session, normalized, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    session_id = _make_session_id()
    expires_at = _now() + timedelta(seconds=60 * 60 * 24 * 7)
    _session_store.set(session_id, user.id, user.role, expires_at)
    set_session_cookie(response, session_id)

    return UserOut.model_validate(user)


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(
    request: Request,
    response: Response,
    current_user: Annotated[User, Depends(current_user)],
) -> dict[str, bool]:
    """Invalidate the current session and clear the cookie."""
    session_id = request.cookies.get(SESSION_COOKIE)
    invalidate_session(session_id, response)
    return {"ok": True}


@router.get("/me", response_model=UserOut)
def me(current_user: Annotated[User, Depends(current_user)]) -> UserOut:
    """Return the currently authenticated user (requires session)."""
    return UserOut.model_validate(current_user)


# ---------- role-protected sample endpoints ----------

@router.get("/customer/me")
def customer_me(current_user: Annotated[User, Depends(role_required("customer"))]) -> UserOut:
    """Customer-only endpoint: admin and astrologer cannot call this."""
    return UserOut.model_validate(current_user)


@router.get("/astrologer/me")
def astrologer_me(current_user: Annotated[User, Depends(role_required("astrologer"))]) -> UserOut:
    """Astrologer-only endpoint: admin and customer cannot call this."""
    return UserOut.model_validate(current_user)


@router.get("/admin/me")
def admin_me(current_user: Annotated[User, Depends(role_required("admin"))]) -> UserOut:
    """Admin-only endpoint: customer and astrologer cannot call this."""
    return UserOut.model_validate(current_user)


@router.get("/public")
def public_endpoint() -> dict[str, str]:
    """Public endpoint with no auth requirement (integration smoke test)."""
    return {"message": "public"}