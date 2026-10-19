"""Phase 3: booking schemas (validation + serialization).

Rules enforced here (in addition to DB constraints):
- timestamps must be timezone-aware (naive input is rejected, never
  silently assumed); everything is normalised to UTC
- end_at strictly after start_at, duration within policy bounds
- mode is one of chat | audio | video
- topic is optional, trimmed, length-capped

Privacy: payloads expose only participant-safe data. The astrologer sees a
*masked* customer email (never the raw address) plus the customer id needed
to reference the booking; the customer sees the astrologer's display name.
The topic is only ever sent to the two participants.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.booking import MAX_BOOKING_MINUTES, MIN_BOOKING_MINUTES

BookingModeLiteral = Literal["chat", "audio", "video"]
BookingStatusLiteral = Literal["pending", "accepted", "rejected", "cancelled"]

MAX_TOPIC_LENGTH = 1000


def _require_aware(value: datetime, field_name: str) -> datetime:
    """Reject naive timestamps and normalise aware ones to UTC."""
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError(
            f"{field_name} must include a UTC offset (e.g. 2026-10-20T10:00:00+05:30); "
            "naive timestamps are ambiguous and rejected"
        )
    return value.astimezone(timezone.utc)


class BookingCreate(BaseModel):
    """POST /api/v1/bookings body."""

    model_config = ConfigDict(extra="forbid")

    astrologer_profile_id: int = Field(..., gt=0)
    mode: BookingModeLiteral
    start_at: datetime
    end_at: datetime
    topic: str | None = Field(default=None, max_length=MAX_TOPIC_LENGTH)

    @field_validator("start_at", "end_at")
    @classmethod
    def _normalise_to_utc(cls, value: datetime, info: Any) -> datetime:
        return _require_aware(value, info.field_name)

    @field_validator("topic")
    @classmethod
    def _clean_topic(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @model_validator(mode="after")
    def _check_window(self) -> "BookingCreate":
        if self.end_at <= self.start_at:
            raise ValueError("end_at must be after start_at")
        minutes = (self.end_at - self.start_at).total_seconds() / 60
        if minutes < MIN_BOOKING_MINUTES:
            raise ValueError(f"booking must be at least {MIN_BOOKING_MINUTES} minutes long")
        if minutes > MAX_BOOKING_MINUTES:
            raise ValueError(f"booking must be at most {MAX_BOOKING_MINUTES} minutes long")
        return self


class BookingOut(BaseModel):
    """Participant-facing booking payload (customer and astrologer only)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    astrologer_profile_id: int
    mode: BookingModeLiteral
    start_at: datetime
    end_at: datetime
    status: BookingStatusLiteral
    topic: str | None = None
    decision_at: datetime | None = None
    cancelled_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    # Denormalised participant-safe references (never raw emails).
    astrologer_name: str = ""
    customer_ref: str = ""

    @model_validator(mode="before")
    @classmethod
    def _denormalise_participants(cls, data: Any) -> Any:
        """Pull display name + masked customer email off the ORM relations."""
        if isinstance(data, dict):
            return data
        profile = getattr(data, "astrologer_profile", None)
        customer = getattr(data, "customer", None)
        base = {
            "id": data.id,
            "customer_id": data.customer_id,
            "astrologer_profile_id": data.astrologer_profile_id,
            "mode": data.mode,
            "start_at": data.start_at,
            "end_at": data.end_at,
            "status": data.status,
            "topic": data.topic,
            "decision_at": data.decision_at,
            "cancelled_at": data.cancelled_at,
            "created_at": data.created_at,
            "updated_at": data.updated_at,
            "astrologer_name": getattr(profile, "display_name", "") or "",
            "customer_ref": mask_email(getattr(customer, "email", "")) if customer else "",
        }
        return base


def mask_email(email: str) -> str:
    """`someone@example.com` -> `so****@example.com` (participant-safe)."""
    if not email or "@" not in email:
        return ""
    local, _, domain = email.partition("@")
    keep = local[:2] if len(local) >= 2 else local[:1]
    return f"{keep}****@{domain}"


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool


class BookingPage(PaginationMeta):
    items: list[BookingOut]
