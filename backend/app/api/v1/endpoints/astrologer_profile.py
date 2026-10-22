"""Phase 2: astrologer dashboard endpoints (owner-scoped).

Every route here is gated by ``role_required("astrologer")`` so customers
and admins cannot touch another astrologer's profile, and an astrologer can
only ever read/write the profile attached to their own user id.

Approval workflow handled here:
  POST   /astrologer/profile         -> create own profile (starts as draft)
  PATCH  /astrologer/profile         -> edit own profile
  POST   /astrologer/profile/submit  -> draft|rejected -> pending review
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.dependencies import role_required
from app.core.database import get_session
from app.models.astrologer import AstrologerLanguage, AstrologerProfile, AstrologerSpecialty
from app.models.user import User
from app.schemas.astrologer import ProfileCreate, ProfileOut, ProfileUpdate

router = APIRouter(
    prefix="/astrologer",
    tags=["astrologer-dashboard"],
    dependencies=[Depends(role_required("astrologer"))],
)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _get_own_profile(session: Session, user: User) -> AstrologerProfile:
    profile = session.execute(
        select(AstrologerProfile).where(AstrologerProfile.user_id == user.id)
    ).scalar_one_or_none()
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You have not created an astrologer profile yet",
        )
    return profile


def _profile_snapshot(profile: AstrologerProfile) -> dict:
    """Flat dict of the current profile, used to validate merged updates."""
    return {
        "display_name": profile.display_name,
        "bio": profile.bio,
        "profile_image_url": profile.profile_image_url,
        "years_experience": profile.years_experience,
        "languages": [entry.language for entry in profile.languages],
        "specialties": [entry.specialty for entry in profile.specialties],
        "chat_enabled": profile.chat_enabled,
        "audio_enabled": profile.audio_enabled,
        "video_enabled": profile.video_enabled,
        "chat_rate": profile.chat_rate,
        "audio_rate": profile.audio_rate,
        "video_rate": profile.video_rate,
        "is_available": profile.is_available,
        "available_from": profile.available_from,
        "available_to": profile.available_to,
        "timezone_name": profile.timezone_name,
    }


def _replace_children(
    session: Session,
    profile: AstrologerProfile,
    languages: list[str],
    specialties: list[str],
) -> None:
    profile.languages = [AstrologerLanguage(language=item) for item in languages]
    profile.specialties = [AstrologerSpecialty(specialty=item) for item in specialties]


@router.get("/profile", response_model=ProfileOut)
def get_own_profile(
    session: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(role_required("astrologer"))],
) -> AstrologerProfile:
    """Return the caller's own profile (404 when it does not exist yet)."""
    return _get_own_profile(session, user)


@router.post("/profile", response_model=ProfileOut, status_code=status.HTTP_201_CREATED)
def create_own_profile(
    payload: ProfileCreate,
    session: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(role_required("astrologer"))],
) -> AstrologerProfile:
    """Create the caller's own profile (always starts as a draft)."""
    existing = session.execute(
        select(AstrologerProfile).where(AstrologerProfile.user_id == user.id)
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an astrologer profile",
        )

    profile = AstrologerProfile(
        user_id=user.id,
        display_name=payload.display_name,
        bio=payload.bio,
        profile_image_url=payload.profile_image_url,
        years_experience=payload.years_experience,
        chat_enabled=payload.chat_enabled,
        audio_enabled=payload.audio_enabled,
        video_enabled=payload.video_enabled,
        chat_rate=payload.chat_rate,
        audio_rate=payload.audio_rate,
        video_rate=payload.video_rate,
        is_available=payload.is_available,
        available_from=payload.available_from,
        available_to=payload.available_to,
        timezone_name=payload.timezone_name,
        approval_status="draft",
    )
    _replace_children(session, profile, payload.languages, payload.specialties)
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile


@router.patch("/profile", response_model=ProfileOut)
def update_own_profile(
    payload: ProfileUpdate,
    session: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(role_required("astrologer"))],
) -> AstrologerProfile:
    """Partially update the caller's own profile.

    The merged result is re-validated in full so cross-field rules (for
    example "enabled mode needs a rate") cannot be bypassed by splitting an
    invalid state across two PATCH requests.
    """
    profile = _get_own_profile(session, user)

    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No fields to update",
        )

    merged = _profile_snapshot(profile)
    merged.update(changes)
    try:
        # Re-validate the *merged* profile so cross-field rules (for example
        # "an enabled mode needs a rate") cannot be bypassed by splitting an
        # invalid state across two PATCH requests.
        validated = ProfileCreate.model_validate(merged)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=jsonable_encoder(exc.errors()),
        ) from exc

    profile.display_name = validated.display_name
    profile.bio = validated.bio
    profile.profile_image_url = validated.profile_image_url
    profile.years_experience = validated.years_experience
    profile.chat_enabled = validated.chat_enabled
    profile.audio_enabled = validated.audio_enabled
    profile.video_enabled = validated.video_enabled
    profile.chat_rate = validated.chat_rate
    profile.audio_rate = validated.audio_rate
    profile.video_rate = validated.video_rate
    profile.is_available = validated.is_available
    profile.available_from = validated.available_from
    profile.available_to = validated.available_to
    profile.timezone_name = validated.timezone_name

    if "languages" in changes or "specialties" in changes:
        _replace_children(session, profile, validated.languages, validated.specialties)

    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile


@router.post("/profile/submit", response_model=ProfileOut)
def submit_own_profile_for_review(
    session: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(role_required("astrologer"))],
) -> AstrologerProfile:
    """Submit the own profile for admin review (draft|rejected -> pending)."""
    profile = _get_own_profile(session, user)

    if profile.approval_status == "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Your profile is already awaiting review",
        )
    if profile.approval_status == "approved":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Your profile is already approved",
        )
    if not profile.enabled_modes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Enable at least one consultation mode before submitting",
        )

    profile.approval_status = "pending"
    profile.submitted_at = _utc_now()
    # The previous rejection only describes the previous submission.
    profile.rejection_reason = None
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile
