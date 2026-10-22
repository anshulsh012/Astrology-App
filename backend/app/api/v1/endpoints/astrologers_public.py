"""Phase 2: public astrologer discovery endpoints (no authentication).

Only ``approved`` profiles are ever returned. Unapproved, pending, draft and
rejected profiles are invisible here — including their existence via the
detail route, which answers 404 for anything that is not approved.

No private user information (email, reviewer, internal timestamps) leaves
these endpoints; see ``PublicAstrologerOut``.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import exists, func, select
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.models.astrologer import (
    VALID_CONSULTATION_MODES,
    AstrologerLanguage,
    AstrologerProfile,
    AstrologerSpecialty,
)
from app.schemas.astrologer import PublicAstrologerOut, PublicAstrologerPage

router = APIRouter(prefix="/astrologers", tags=["public"])

DEFAULT_PAGE_SIZE = 12
MAX_PAGE_SIZE = 50

SORT_OPTIONS = {
    "price_asc": (
        func.least(
            AstrologerProfile.chat_rate,
            AstrologerProfile.audio_rate,
            AstrologerProfile.video_rate,
        ).asc().nullslast(),
        AstrologerProfile.display_name.asc(),
        AstrologerProfile.id.asc(),
    ),
    "price_desc": (
        func.least(
            AstrologerProfile.chat_rate,
            AstrologerProfile.audio_rate,
            AstrologerProfile.video_rate,
        ).desc().nullslast(),
        AstrologerProfile.display_name.asc(),
        AstrologerProfile.id.asc(),
    ),
    "experience_asc": (
        AstrologerProfile.years_experience.asc(),
        AstrologerProfile.display_name.asc(),
        AstrologerProfile.id.asc(),
    ),
    "experience_desc": (
        AstrologerProfile.years_experience.desc(),
        AstrologerProfile.display_name.asc(),
        AstrologerProfile.id.asc(),
    ),
}

MODE_COLUMN = {
    "chat": AstrologerProfile.chat_enabled,
    "audio": AstrologerProfile.audio_enabled,
    "video": AstrologerProfile.video_enabled,
}


def _escape_like(value: str) -> str:
    """Neutralise LIKE wildcards so user input stays a literal search."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@router.get("", response_model=PublicAstrologerPage)
def list_approved_astrologers(
    session: Annotated[Session, Depends(get_session)],
    q: Annotated[str | None, Query(max_length=100, description="Search by display name")] = None,
    specialty: Annotated[str | None, Query(max_length=80)] = None,
    language: Annotated[str | None, Query(max_length=60)] = None,
    mode: Annotated[str | None, Query(description="chat | audio | video")] = None,
    sort: Annotated[str, Query(description="price_asc | price_desc | experience_asc | experience_desc")] = "experience_desc",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
) -> PublicAstrologerPage:
    """Paginated list of approved astrologers with search/filter/sort."""
    if mode is not None and mode not in VALID_CONSULTATION_MODES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"mode must be one of {list(VALID_CONSULTATION_MODES)}",
        )
    if sort not in SORT_OPTIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"sort must be one of {sorted(SORT_OPTIONS)}",
        )

    filters = [AstrologerProfile.approval_status == "approved"]

    if q and q.strip():
        pattern = f"%{_escape_like(q.strip())}%"
        filters.append(AstrologerProfile.display_name.ilike(pattern, escape="\\"))

    if specialty and specialty.strip():
        filters.append(
            exists().where(
                (AstrologerSpecialty.profile_id == AstrologerProfile.id)
                & (func.lower(AstrologerSpecialty.specialty) == specialty.strip().lower())
            )
        )

    if language and language.strip():
        filters.append(
            exists().where(
                (AstrologerLanguage.profile_id == AstrologerProfile.id)
                & (func.lower(AstrologerLanguage.language) == language.strip().lower())
            )
        )

    if mode is not None:
        filters.append(MODE_COLUMN[mode].is_(True))

    total = session.execute(
        select(func.count()).select_from(AstrologerProfile).where(*filters)
    ).scalar_one()

    order_by = SORT_OPTIONS[sort]
    rows = (
        session.execute(
            select(AstrologerProfile)
            .where(*filters)
            .order_by(*order_by)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        .scalars()
        .all()
    )

    total_pages = max((total + page_size - 1) // page_size, 1)
    return PublicAstrologerPage(
        items=[PublicAstrologerOut.model_validate(row) for row in rows],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1,
    )


@router.get("/{profile_id}", response_model=PublicAstrologerOut)
def get_approved_astrologer(
    profile_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> PublicAstrologerOut:
    """Public profile detail. 404 unless the profile is approved."""
    row = session.execute(
        select(AstrologerProfile).where(
            AstrologerProfile.id == profile_id,
            AstrologerProfile.approval_status == "approved",
        )
    ).scalar_one_or_none()
    if row is None:
        # Same answer for "does not exist" and "not approved": unapproved
        # profiles must not be discoverable.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Astrologer not found",
        )
    return PublicAstrologerOut.model_validate(row)
