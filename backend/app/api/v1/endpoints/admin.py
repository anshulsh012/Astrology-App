from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.dependencies import role_required
from app.core.database import get_session
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users")
def admin_users(
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(role_required("admin"))],
):
    """Admin-only: list users (id, email, role, active, created_at)."""
    users = session.execute(select(User)).scalars().all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at,
        }
        for u in users
    ]