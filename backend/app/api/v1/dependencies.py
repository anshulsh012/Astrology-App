from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.core.auth import _session_store, _now, set_session_cookie, invalidate_session, create_session, clear_session_cookie, SESSION_COOKIE, _make_session_id, _get_session_from_cookie
from app.models.user import User

from datetime import timedelta


def _require_active_user(
    request: Request,
    session: Annotated[Session, Depends(get_session)],
) -> User:
    session_id = request.cookies.get(SESSION_COOKIE)
    user = _get_session_from_cookie(session_id, session)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def current_user(
    request: Request,
    session: Annotated[Session, Depends(get_session)],
) -> User:
    """Dependency extracting the currently authenticated (active) user.

    Raises 401 when there is no active session for the request.
    """
    return _require_active_user(request, session)


def role_required(role: str):
    """Dependency factory returning an endpoint guard for the given role.

    Usage:
        @router.get("/admin/...", dependencies=[Depends(role_required("admin"))])
        def admin_only(): ...

    Returns 403 when the authenticated user does not hold the required role.
    """

    def _gate(user: Annotated[User, Depends(current_user)]) -> User:
        if user.role != role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role}' required",
            )
        return user

    return _gate


def require_roles(roles: set[str]):
    """Dependency factory returning an endpoint guard for any of the roles.

    Returns 403 when the authenticated user holds none of the allowed roles.
    """

    def _gate(user: Annotated[User, Depends(current_user)]) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"One of roles {sorted(roles)} required",
            )
        return user

    return _gate


def require_any(*roles: str):
    """Dependency factory for any of the named roles.

    Convenience wrapper around require_roles; returns 403 when the user
    holds none of the allowed roles.
    """
    return require_roles(set(roles))