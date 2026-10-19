"""Phase 3: consultation booking domain models.

A booking is a request from a customer for a consultation with an approved
astrologer at a specific UTC time window and in a specific consultation
mode. No payments or live-consultation infrastructure live here — Phase 3
only schedules and arbitrates the appointment.

Lifecycle (explicit, terminal states are final):

    pending ──► accepted   (astrologer accepts; the slot is then confirmed)
        │
        ├──► rejected      (astrologer declines)
        │
        └──► cancelled     (either participant cancels, per policy)

All timestamps are timezone-aware and stored in UTC.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

VALID_BOOKING_STATUSES = ("pending", "accepted", "rejected", "cancelled")
# Consultation modes mirror the astrologer profile flags (same order).
VALID_BOOKING_MODES = ("chat", "audio", "video")

# PostgreSQL enums (see alembic 0004).
BookingStatusType = Enum(*VALID_BOOKING_STATUSES, name="bookingstatus")
BookingModeType = Enum(*VALID_BOOKING_MODES, name="bookingmode")

# Duration policy (minutes). Enforced in the API and mirrored as a DB
# CHECK so no code path can persist an out-of-bounds booking.
MIN_BOOKING_MINUTES = 10
MAX_BOOKING_MINUTES = 240  # 4 hours

# Statuses that occupy an astrologer's calendar. Only `accepted` blocks
# overlapping confirmations; `pending` is a request, not a commitment.
ACTIVE_STATUSES = ("pending", "accepted")
CONFIRMING_STATUS = "accepted"
TERMINAL_STATUSES = ("rejected", "cancelled")


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Booking(Base):
    """A consultation booking between one customer and one astrologer."""

    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )

    customer_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Customer who requested the booking.",
    )
    astrologer_profile_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("astrologer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Target astrologer profile (must be an approved profile).",
    )

    mode: Mapped[str] = mapped_column(
        BookingModeType,
        nullable=False,
        doc="chat | audio | video — one of the astrologer's enabled modes.",
    )

    start_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        doc="UTC start of the consultation window.",
    )
    end_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        doc="UTC end of the consultation window.",
    )

    status: Mapped[str] = mapped_column(
        BookingStatusType,
        nullable=False,
        default="pending",
        server_default="pending",
        index=True,
        doc="pending | accepted | rejected | cancelled",
    )

    topic: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        doc="Customer-provided topic/notes (optional, never shown publicly).",
    )

    # --- audit / decision timestamps ----------------------------------------
    decision_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="When the astrologer accepted or rejected the request.",
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="When the booking was cancelled.",
    )
    cancelled_by_id: Mapped[int | None] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        doc="Participant who cancelled (customer or the astrologer user).",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utc_now,
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utc_now,
        onupdate=_utc_now,
        server_default=func.now(),
        nullable=False,
    )

    # --- relationships --------------------------------------------------------
    customer: Mapped["User"] = relationship(  # noqa: F821 -- registered in app.models
        "User", foreign_keys=[customer_id], lazy="selectin"
    )
    astrologer_profile: Mapped["AstrologerProfile"] = relationship(  # noqa: F821
        "AstrologerProfile", foreign_keys=[astrologer_profile_id], lazy="selectin"
    )

    __table_args__ = (
        CheckConstraint("end_at > start_at", name="ck_bookings_end_after_start"),
        CheckConstraint(
            f"(EXTRACT(EPOCH FROM (end_at - start_at)) / 60) >= {MIN_BOOKING_MINUTES}",
            name="ck_bookings_min_duration",
        ),
        CheckConstraint(
            f"(EXTRACT(EPOCH FROM (end_at - start_at)) / 60) <= {MAX_BOOKING_MINUTES}",
            name="ck_bookings_max_duration",
        ),
        # Hot query paths: "my bookings by time", "astrologer's calendar".
        Index("ix_bookings_customer_start", "customer_id", "start_at"),
        Index("ix_bookings_astrologer_status_start", "astrologer_profile_id", "status", "start_at"),
        Index("ix_bookings_status_start", "status", "start_at"),
    )

    def __repr__(self) -> str:
        return (
            f"<Booking(id={self.id}, customer_id={self.customer_id}, "
            f"profile_id={self.astrologer_profile_id}, mode={self.mode!r}, "
            f"start_at={self.start_at!r}, status={self.status!r})>"
        )
