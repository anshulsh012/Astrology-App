"""Phase 3: consultation booking endpoints.

Authorization model (enforced in the backend, not the frontend):
- POST /bookings                  -> customers only
- GET  /bookings/me               -> customers see their own bookings
- GET  /bookings/astrologer/me    -> astrologers see requests assigned to them
- GET  /bookings/{id}             -> participants only (404 hides existence)
- POST /bookings/{id}/accept|reject -> owning astrologer, pending only
- POST /bookings/{id}/cancel      -> participants only, per cancellation policy

Availability & concurrency:
- The astrologer profile row is locked with SELECT ... FOR UPDATE inside the
  transaction before any overlap check (PostgreSQL). Serialising per-profile
  means two concurrent requests (create or accept) can never both confirm
  overlapping appointments — the second waits for the first transaction and
  then sees its committed rows.
- Confirmed (`accepted`) appointments must not overlap, enforced by an
  explicit range query under that lock. `pending` requests do not occupy the
  calendar but a customer cannot stack overlapping active bookings either.

Cancellation policy (documented, enforced in `_check_cancellation`):
- A `pending` booking may be cancelled by either participant at any time
  before it starts.
- An `accepted` booking may be cancelled by the astrologer at any time
  before it starts; the customer needs at least
  CANCELLATION_NOTICE_MINUTES (60) minutes of notice.

Limitations of the initial availability implementation:
- `available_from`/`available_to` are a single daily local-time window in the
  astrologer's timezone; bookings must fit inside it on one local day.
- A booking that is already started or in the past can never be created or
  accepted; there is no rescheduling (cancel + rebook) yet.
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from typing import Annotated
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.v1.dependencies import current_user, role_required
from app.core.database import get_session
from app.models.astrologer import AstrologerProfile
from app.models.booking import (
    ACTIVE_STATUSES,
    MAX_BOOKING_MINUTES,
    MIN_BOOKING_MINUTES,
    Booking,
)
from app.models.user import User
from app.schemas.booking import AvailabilityOut, BookingCreate, BookingOut, BookingPage, SlotOut

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
DEFAULT_SLOT_MINUTES = 30
SLOT_STEP_MINUTES = 30
MAX_SLOT_DAYS_AHEAD = 14
ALLOWED_DURATIONS = (15, 30, 45, 60)

# How much notice a customer must give to cancel a confirmed appointment.
CANCELLATION_NOTICE_MINUTES = 60

router = APIRouter(prefix="/bookings", tags=["bookings"])


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


# --- helpers ----------------------------------------------------------------


def _lock_profile(session: Session, profile_id: int) -> AstrologerProfile | None:
    """Load the astrologer profile, taking a row lock when on PostgreSQL.

    The lock serialises booking decisions per astrologer: concurrent create
    / accept transactions queue here and then observe each other's committed
    rows in the overlap check below. SQLite (used only by ad-hoc local runs)
    has a single-writer model, so the lock is a plain read there.
    """
    stmt = select(AstrologerProfile).where(AstrologerProfile.id == profile_id)
    if session.bind is not None and session.bind.dialect.name == "postgresql":
        stmt = stmt.with_for_update()
    return session.execute(stmt).scalar_one_or_none()


def _accepted_overlap(
    session: Session,
    profile_id: int,
    start: datetime,
    end: datetime,
    exclude_booking_id: int | None = None,
) -> Booking | None:
    """First confirmed booking of this astrologer overlapping [start, end)."""
    stmt = select(Booking).where(
        Booking.astrologer_profile_id == profile_id,
        Booking.status == "accepted",
        Booking.start_at < end,
        Booking.end_at > start,
    )
    if exclude_booking_id is not None:
        stmt = stmt.where(Booking.id != exclude_booking_id)
    return session.execute(stmt.order_by(Booking.start_at)).scalars().first()


def _customer_active_overlap(
    session: Session,
    customer_id: int,
    start: datetime,
    end: datetime,
) -> Booking | None:
    """First active (pending/accepted) booking of this customer overlapping."""
    return (
        session.execute(
            select(Booking).where(
                Booking.customer_id == customer_id,
                Booking.status.in_(ACTIVE_STATUSES),
                Booking.start_at < end,
                Booking.end_at > start,
            ).order_by(Booking.start_at)
        )
        .scalars()
        .first()
    )


def _validate_mode(profile: AstrologerProfile, mode: str) -> None:
    if mode not in profile.enabled_modes:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"This astrologer does not offer {mode} consultations",
        )


def _rate_for_mode(profile: AstrologerProfile, mode: str) -> Decimal:
    rate = {
        "chat": profile.chat_rate,
        "audio": profile.audio_rate,
        "video": profile.video_rate,
    }.get(mode)
    if rate is None or rate <= 0:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"This astrologer has no rate for {mode} consultations",
        )
    return Decimal(rate).quantize(Decimal("0.01"))


def _quote(rate: Decimal, minutes: int) -> Decimal:
    return (rate * Decimal(minutes)).quantize(Decimal("0.01"))


def _profile_timezone(profile: AstrologerProfile) -> ZoneInfo:
    try:
        return ZoneInfo(profile.timezone_name)
    except Exception:
        return ZoneInfo("Asia/Kolkata")


def _local_window(profile: AstrologerProfile, day: date) -> tuple[datetime, datetime] | None:
    tz = _profile_timezone(profile)
    start_clock = profile.available_from or time(9, 0)
    end_clock = profile.available_to or time(17, 0)
    if start_clock >= end_clock:
        return None
    start = datetime.combine(day, start_clock, tzinfo=tz)
    end = datetime.combine(day, end_clock, tzinfo=tz)
    return start, end


def _occupied_ranges(session: Session, profile_id: int, start: datetime, end: datetime) -> list[tuple[datetime, datetime]]:
    rows = session.execute(
        select(Booking.start_at, Booking.end_at).where(
            Booking.astrologer_profile_id == profile_id,
            Booking.status == "accepted",
            Booking.start_at < end,
            Booking.end_at > start,
        )
    ).all()
    return [(row.start_at, row.end_at) for row in rows]


def _slot_open(start: datetime, end: datetime, occupied: list[tuple[datetime, datetime]]) -> bool:
    return all(not (slot_start < end and slot_end > start) for slot_start, slot_end in occupied)


def _validate_availability_window(
    profile: AstrologerProfile, start: datetime, end: datetime
) -> None:
    """Both ends of the booking must fit the astrologer's daily local window.

    The window is expressed in the profile's timezone. An invalid timezone
    name on the profile is a data problem on the astrologer's side and must
    not block customers, so it degrades to "no window".
    """
    if profile.available_from is None or profile.available_to is None:
        return
    try:
        tz = ZoneInfo(profile.timezone_name)
    except Exception:
        return
    local_start = start.astimezone(tz)
    local_end = end.astimezone(tz)
    if local_start.date() != local_end.date():
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The booking must fit inside a single day of the astrologer's schedule",
        )
    window_start = local_start.replace(
        hour=profile.available_from.hour,
        minute=profile.available_from.minute,
        second=profile.available_from.second,
        microsecond=0,
    )
    window_end = local_start.replace(
        hour=profile.available_to.hour,
        minute=profile.available_to.minute,
        second=profile.available_to.second,
        microsecond=0,
    )
    if local_start < window_start or local_end > window_end:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Selected time is outside the astrologer's availability window "
                f"({profile.available_from.strftime('%H:%M')}–"
                f"{profile.available_to.strftime('%H:%M')} {profile.timezone_name})"
            ),
        )


def _validate_future(start: datetime, end: datetime) -> None:
    now = _utc_now()
    if start <= now:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start_at must be in the future",
        )
    if end <= now:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="end_at must be in the future",
        )


def _get_booking_or_404(session: Session, booking_id: int) -> Booking:
    booking = session.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )
    return booking


def _require_participant(booking: Booking, user: User) -> None:
    """404 (not 403) for non-participants so bookings stay unguessable."""
    profile = booking.astrologer_profile
    is_astrologer_owner = profile is not None and profile.user_id == user.id
    if booking.customer_id != user.id and not is_astrologer_owner:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )


def _require_own_astrologer_booking(
    session: Session, booking: Booking, user: User
) -> AstrologerProfile:
    """Guard for accept/reject: the caller must own the target profile."""
    profile = session.get(AstrologerProfile, booking.astrologer_profile_id)
    if profile is None or profile.user_id != user.id:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )
    return profile


def _require_pending(booking: Booking, action: str) -> None:
    if booking.status != "pending":
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail=f"Only pending bookings can be {action} (current: {booking.status})",
        )


def _check_cancellation(booking: Booking, actor: User) -> None:
    """Apply the documented cancellation policy for the acting participant."""
    if booking.status not in ACTIVE_STATUSES:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail=f"Only pending or accepted bookings can be cancelled (current: {booking.status})",
        )
    if booking.start_at <= _utc_now():
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail="A booking can no longer be cancelled once it has started",
        )
    is_customer = booking.customer_id == actor.id
    is_accepted = booking.status == "accepted"
    if is_customer and is_accepted:
        notice_boundary = booking.start_at - timedelta(minutes=CANCELLATION_NOTICE_MINUTES)
        if _utc_now() > notice_boundary:
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail=(
                    "Confirmed bookings need at least "
                    f"{CANCELLATION_NOTICE_MINUTES} minutes of notice to cancel; "
                    "contact your astrologer directly"
                ),
            )


def _paginate(session: Session, stmt, page: int, page_size: int, schema_cls):
    total = session.execute(
        select(func.count()).select_from(stmt.subquery())
    ).scalar_one()
    rows = (
        session.execute(stmt.offset((page - 1) * page_size).limit(page_size))
        .scalars()
        .all()
    )
    total_pages = max((total + page_size - 1) // page_size, 1)
    return BookingPage(
        items=[schema_cls.model_validate(row) for row in rows],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1,
    )


# --- endpoints ---------------------------------------------------------------


@router.get("/availability/{profile_id}", response_model=AvailabilityOut)
def list_availability(
    profile_id: int,
    session: Annotated[Session, Depends(get_session)],
    day: Annotated[date, Query(description="Local calendar day in the astrologer's timezone")],
    mode: Annotated[str, Query(description="chat | audio | video")],
    duration_minutes: Annotated[int, Query(ge=MIN_BOOKING_MINUTES, le=MAX_BOOKING_MINUTES)] = DEFAULT_SLOT_MINUTES,
) -> AvailabilityOut:
    """Public slot list for an approved astrologer on one local day."""
    if mode not in ("chat", "audio", "video"):
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="mode must be one of chat, audio, video",
        )
    profile = session.get(AstrologerProfile, profile_id)
    if profile is None or profile.approval_status != "approved":
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Astrologer not found",
        )
    if not profile.is_available:
        return AvailabilityOut(
            astrologer_profile_id=profile.id,
            astrologer_name=profile.display_name,
            timezone_name=profile.timezone_name,
            date=day,
            mode=mode,  # type: ignore[arg-type]
            duration_minutes=duration_minutes,
            is_available=False,
            slots=[],
            detail="This astrologer is currently unavailable for bookings",
        )
    if mode not in profile.enabled_modes:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"This astrologer does not offer {mode} consultations",
        )

    tz = _profile_timezone(profile)
    today_local = _utc_now().astimezone(tz).date()
    if day < today_local or day > today_local + timedelta(days=MAX_SLOT_DAYS_AHEAD):
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"date must be between today and {MAX_SLOT_DAYS_AHEAD} days ahead",
        )

    window = _local_window(profile, day)
    if window is None:
        return AvailabilityOut(
            astrologer_profile_id=profile.id,
            astrologer_name=profile.display_name,
            timezone_name=profile.timezone_name,
            date=day,
            mode=mode,  # type: ignore[arg-type]
            duration_minutes=duration_minutes,
            is_available=True,
            slots=[],
            detail="No availability window is configured for this day",
        )

    window_start, window_end = window
    rate = _rate_for_mode(profile, mode)
    occupied = _occupied_ranges(session, profile.id, window_start.astimezone(timezone.utc), window_end.astimezone(timezone.utc))
    now = _utc_now()
    slots: list[SlotOut] = []
    cursor = window_start
    step = timedelta(minutes=SLOT_STEP_MINUTES)
    length = timedelta(minutes=duration_minutes)
    while cursor + length <= window_end:
        slot_start = cursor.astimezone(timezone.utc)
        slot_end = (cursor + length).astimezone(timezone.utc)
        if slot_start > now and _slot_open(slot_start, slot_end, occupied):
            slots.append(
                SlotOut(
                    start_at=slot_start,
                    end_at=slot_end,
                    duration_minutes=duration_minutes,
                    rate_per_minute=rate,
                    quoted_total=_quote(rate, duration_minutes),
                )
            )
        cursor += step

    return AvailabilityOut(
        astrologer_profile_id=profile.id,
        astrologer_name=profile.display_name,
        timezone_name=profile.timezone_name,
        date=day,
        mode=mode,  # type: ignore[arg-type]
        duration_minutes=duration_minutes,
        is_available=True,
        slots=slots,
    )


@router.post("", response_model=BookingOut, status_code=http_status.HTTP_201_CREATED)
def create_booking(
    payload: BookingCreate,
    session: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(role_required("customer"))],
) -> Booking:
    """Customers request a booking with an approved astrologer (starts pending)."""
    start = payload.start_at.astimezone(timezone.utc)
    end = payload.end_at.astimezone(timezone.utc)
    _validate_future(start, end)

    # Lock the profile row first: overlap checks below must be race-free.
    profile = _lock_profile(session, payload.astrologer_profile_id)
    if profile is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Astrologer profile not found",
        )
    if profile.approval_status != "approved":
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail="This astrologer is not accepting bookings yet",
        )
    if not profile.is_available:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail="This astrologer is currently unavailable for bookings",
        )
    _validate_mode(profile, payload.mode)
    _validate_availability_window(profile, start, end)

    minutes = int((end - start).total_seconds() // 60)
    if minutes not in ALLOWED_DURATIONS and not (MIN_BOOKING_MINUTES <= minutes <= MAX_BOOKING_MINUTES):
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"duration must be between {MIN_BOOKING_MINUTES} and {MAX_BOOKING_MINUTES} minutes",
        )
    rate = _rate_for_mode(profile, payload.mode)

    # Confirmed appointments of this astrologer must not overlap.
    if _accepted_overlap(session, profile.id, start, end) is not None:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail="The astrologer already has a confirmed appointment overlapping this time",
        )
    # A customer cannot stack overlapping active requests either.
    if _customer_active_overlap(session, user.id, start, end) is not None:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail="You already have an active booking overlapping this time",
        )

    booking = Booking(
        customer_id=user.id,
        astrologer_profile_id=profile.id,
        mode=payload.mode,
        start_at=start,
        end_at=end,
        topic=payload.topic,
        status="pending",
        duration_minutes=minutes,
        rate_per_minute=rate,
        quoted_total=_quote(rate, minutes),
    )
    session.add(booking)
    session.commit()
    session.refresh(booking)
    return booking


@router.get("/me", response_model=BookingPage)
def my_bookings(
    session: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(role_required("customer"))],
    status_filter: Annotated[
        str | None,
        Query(alias="status", description="pending | accepted | rejected | cancelled | all"),
    ] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
) -> BookingPage:
    """The current customer's bookings, newest start time first."""
    if status_filter not in (None, "all", "pending", "accepted", "rejected", "cancelled"):
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="status must be one of pending, accepted, rejected, cancelled or 'all'",
        )
    stmt = select(Booking).where(Booking.customer_id == user.id)
    if status_filter not in (None, "all"):
        stmt = stmt.where(Booking.status == status_filter)
    stmt = stmt.order_by(Booking.start_at.desc(), Booking.id.desc())
    return _paginate(session, stmt, page, page_size, BookingOut)


@router.get("/astrologer/me", response_model=BookingPage)
def astrologer_bookings(
    session: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(role_required("astrologer"))],
    status_filter: Annotated[
        str | None,
        Query(alias="status", description="pending | accepted | rejected | cancelled | all"),
    ] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
) -> BookingPage:
    """Requests and appointments assigned to the caller's own profile."""
    profile = session.execute(
        select(AstrologerProfile).where(AstrologerProfile.user_id == user.id)
    ).scalar_one_or_none()
    if profile is None:
        # No profile -> no bookings; an empty page beats a confusing 404.
        return BookingPage(
            items=[], page=page, page_size=page_size, total=0,
            total_pages=1, has_next=False, has_prev=False,
        )
    if status_filter not in (None, "all", "pending", "accepted", "rejected", "cancelled"):
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="status must be one of pending, accepted, rejected, cancelled or 'all'",
        )
    stmt = select(Booking).where(Booking.astrologer_profile_id == profile.id)
    if status_filter not in (None, "all"):
        stmt = stmt.where(Booking.status == status_filter)
    stmt = stmt.order_by(Booking.start_at.desc(), Booking.id.desc())
    return _paginate(session, stmt, page, page_size, BookingOut)


@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(
    booking_id: int,
    session: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(current_user)],
) -> Booking:
    """Retrieve one booking; participants only (everyone else gets 404)."""
    booking = _get_booking_or_404(session, booking_id)
    _require_participant(booking, user)
    return booking


@router.post("/{booking_id}/accept", response_model=BookingOut)
def accept_booking(
    booking_id: int,
    session: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(role_required("astrologer"))],
) -> Booking:
    """The owning astrologer accepts a pending request (confirms the slot)."""
    booking = _get_booking_or_404(session, booking_id)
    _require_own_astrologer_booking(session, booking, user)
    _require_pending(booking, "accepted")

    if booking.start_at <= _utc_now():
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail="A booking that has already started cannot be accepted",
        )

    # Re-check overlaps under the profile lock: two pending requests for the
    # same slot may exist, but only one can ever become accepted.
    _lock_profile(session, booking.astrologer_profile_id)
    conflict = _accepted_overlap(
        session, booking.astrologer_profile_id, booking.start_at, booking.end_at,
        exclude_booking_id=booking.id,
    )
    if conflict is not None:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail="Another confirmed appointment overlaps this booking",
        )

    booking.status = "accepted"
    booking.decision_at = _utc_now()
    session.add(booking)
    session.commit()
    session.refresh(booking)
    return booking


@router.post("/{booking_id}/reject", response_model=BookingOut)
def reject_booking(
    booking_id: int,
    session: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(role_required("astrologer"))],
) -> Booking:
    """The owning astrologer rejects a pending request."""
    booking = _get_booking_or_404(session, booking_id)
    _require_own_astrologer_booking(session, booking, user)
    _require_pending(booking, "rejected")

    booking.status = "rejected"
    booking.decision_at = _utc_now()
    session.add(booking)
    session.commit()
    session.refresh(booking)
    return booking


@router.post("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(
    booking_id: int,
    session: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(current_user)],
) -> Booking:
    """Either participant cancels, subject to the cancellation policy."""
    booking = _get_booking_or_404(session, booking_id)
    _require_participant(booking, user)
    _check_cancellation(booking, user)

    booking.status = "cancelled"
    booking.cancelled_at = _utc_now()
    booking.cancelled_by_id = user.id
    session.add(booking)
    session.commit()
    session.refresh(booking)
    return booking
