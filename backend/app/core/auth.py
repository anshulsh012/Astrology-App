from __future__ import annotations

import secrets
from collections.abc import Generator
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.core.security import verify_password
from app.models.user import User

# --- Session cookie strategy -----------------------------------------
# HttpOnly + SameSite=Lax + Secure-in-production cookie holding a random
# session id. No access/refresh bearer tokens are exposed to JS, and
# nothing long-lived is stored in localStorage. The server stores the
# session -> user mapping only in the cookie (signed/encrypted would be
# stronger; placeholder in Phase 1 — documented, not implemented yet).
#
# In production, set SESSION_COOKIE_SECURE=true and consider a server-side
# session record. This Phase 1 implementation is a simple cookie-based
# session intended for HTTP-only state, not a full OIDC/OAuth server.

SESSION_COOKIE = "nakshtra_session"
SESSION_COOKIE_MAX_AGE_SECONDS = 3600 * 24 * 7  # 7 days


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _make_session_id() -> str:
    return secrets.token_urlsafe(32)


def _cookie_kwargs(secure: bool = False) -> dict:
    return {
        "key": SESSION_COOKIE,
        "value": "",
        "max_age": 0,
        "path": "/",
        "httponly": True,
        "secure": secure,
        "samesite": "Lax",
    }


def set_session_cookie(response: Response, session_id: str, secure: bool = False) -> None:
    response.set_cookie(
        key=SESSION_COOKIE,
        value=session_id,
        max_age=SESSION_COOKIE_MAX_AGE_SECONDS,
        path="/",
        httponly=True,
        secure=secure,
        samesite="Lax",
    )


def clear_session_cookie(response: Response, secure: bool = False) -> None:
    response.delete_cookie(
        key=SESSION_COOKIE,
        path="/",
        httponly=True,
        secure=secure,
        samesite="Lax",
    )


class SessionStore:
    """Minimal in-memory session store.

    Phase 1 placeholder. In production, replace with a server-side store
    (e.g. DB/Redis) keyed by a signed/encrypted session id. This store is
    not persistent across restarts and is not shared across workers.
    """

    def __init__(self) -> None:
        self._store: dict[str, dict] = {}

    def set(self, session_id: str, user_id: int, role: str, expires_at: datetime) -> None:
        self._store[session_id] = {
            "user_id": user_id,
            "role": role,
            "expires_at": expires_at,
        }

    def get(self, session_id: str) -> dict | None:
        entry = self._store.get(session_id)
        if entry is None:
            return None
        if _now() >= entry["expires_at"]:
            self._store.pop(session_id, None)
            return None
        return entry

    def delete(self, session_id: str) -> None:
        self._store.pop(session_id, None)


_session_store = SessionStore()


def _get_session_from_cookie(
    session_id: str | None,
    session: Session,
) -> User | None:
    if not session_id:
        return None

    session_data = _session_store.get(session_id)
    if session_data is None:
        return None

    user = session.get(User, session_data["user_id"])
    if user is None or not user.is_active:
        return None
    return user


def get_current_user(
    session_id: str | None,
    session: Session,
) -> User | None:
    """Return the active authenticated user for a session id, or None."""
    return _get_session_from_cookie(session_id, session)


def require_role(role: str):
    """Factory for a dependency that requires a specific role.

    Usage: `Depends(require_role("admin"))` on an endpoint.
    """

    def _check(user: User) -> User:
        if user.role != role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role}' required",
            )
        return user

    return _check


def create_session(user: User, response: Response, secure: bool = False) -> str:
    session_id = _make_session_id()
    expires_at = _now() + timedelta(seconds=SESSION_COOKIE_MAX_AGE_SECONDS)
    _session_store.set(session_id, user.id, user.role, expires_at)
    set_session_cookie(response, session_id, secure=secure)
    return session_id


def invalidate_session(session_id: str | None, response: Response, secure: bool = False) -> None:
    if session_id:
        _session_store.delete(session_id)
    clear_session_cookie(response, secure=secure)


def authenticate_user(
    session: Session,
    email_normalized: str,
    password: str,
) -> User | None:
    """Look up a user by normalized email and verify the password.

    Returns the user only when the password matches and the account is active.
    """
    user = session.execute(
        select(User).where(User.email_normalized == email_normalized)
    ).scalar_one_or_none()
    if user is None or not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user
