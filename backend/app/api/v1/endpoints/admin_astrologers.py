"""Phase 2: admin dashboard endpoints for astrologer applications.

Every route is gated by ``role_required("admin")`` in the backend, so an
astrologer can never approve (or reject) their own profile — approval power
is not reachable from any non-admin session.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.v1.dependencies import role_required
from app.core.database import get_session
from app.models.astrologer import VALID_APPROVAL_STATUSES, AstrologerProfile
from app.models.user import User
from app.schemas.astrologer import AdminApplicationOut, ApplicationPage, RejectRequest

router = APIRouter(
    prefix="/admin/astrologers",
    tags=["admin"],
    dependencies=[Depends(role_required("admin"))],
)

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _get_application(session: Session, profile_id: int) -> AstrologerProfile:
    profile = session.get(AstrologerProfile, profile_id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Astrologer profile not found",
        )
    return profile


@router.get("/applications", response_model=ApplicationPage)
def list_applications(
    session: Annotated[Session, Depends(get_session)],
    _admin: Annotated[User, Depends(role_required("admin"))],
    status_filter: Annotated[
        str | None,
        Query(alias="status", description="draft | pending | approved | rejected | all"),
    ] = "pending",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
) -> ApplicationPage:
    """List astrologer applications, newest first (defaults to pending)."""
    if status_filter not in (*VALID_APPROVAL_STATUSES, "all"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"status must be one of {sorted(VALID_APPROVAL_STATUSES)} or 'all'",
        )

    stmt = select(AstrologerProfile)
    if status_filter != "all":
        stmt = stmt.where(AstrologerProfile.approval_status == status_filter)

    total = session.execute(
        select(func.count()).select_from(stmt.subquery())
    ).scalar_one()

    rows = (
        session.execute(
            stmt.order_by(AstrologerProfile.created_at.desc(), AstrologerProfile.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        .scalars()
        .all()
    )

    total_pages = max((total + page_size - 1) // page_size, 1)
    return ApplicationPage(
        items=[AdminApplicationOut.model_validate(row) for row in rows],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1,
    )


@router.get("/{profile_id}", response_model=AdminApplicationOut)
def get_application(
    profile_id: int,
    session: Annotated[Session, Depends(get_session)],
    _admin: Annotated[User, Depends(role_required("admin"))],
) -> AstrologerProfile:
    """Review a single application in detail (includes applicant email)."""
    return _get_application(session, profile_id)


@router.post("/{profile_id}/approve", response_model=AdminApplicationOut)
def approve_application(
    profile_id: int,
    session: Annotated[Session, Depends(get_session)],
    admin: Annotated[User, Depends(role_required("admin"))],
) -> AstrologerProfile:
    """Approve a pending application (admin-only)."""
    profile = _get_application(session, profile_id)
    if profile.approval_status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Only pending applications can be approved (current: {profile.approval_status})",
        )

    profile.approval_status = "approved"
    profile.rejection_reason = None
    profile.reviewed_at = _utc_now()
    profile.reviewed_by_id = admin.id
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile


@router.post("/{profile_id}/reject", response_model=AdminApplicationOut)
def reject_application(
    profile_id: int,
    payload: RejectRequest,
    session: Annotated[Session, Depends(get_session)],
    admin: Annotated[User, Depends(role_required("admin"))],
) -> AstrologerProfile:
    """Reject a pending application with a mandatory reason (admin-only)."""
    profile = _get_application(session, profile_id)
    if profile.approval_status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Only pending applications can be rejected (current: {profile.approval_status})",
        )

    profile.approval_status = "rejected"
    profile.rejection_reason = payload.reason
    profile.reviewed_at = _utc_now()
    profile.reviewed_by_id = admin.id
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile
