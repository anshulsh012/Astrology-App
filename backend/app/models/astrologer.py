"""Phase 2: astrologer profile domain models.

Authentication identity (`users`) and astrologer-specific profile data are
intentionally separate: `users` owns credentials/role, `astrologer_profiles`
owns everything a customer sees. A user may have at most one profile
(enforced by a unique constraint on `user_id`).

Approval workflow: draft -> pending (astrologer submits) -> approved|
rejected (admin decides). Only `approved` profiles are ever exposed through
the public discovery endpoints.
"""

from __future__ import annotations

from datetime import datetime, time, timezone
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.user import User

VALID_APPROVAL_STATUSES = ("draft", "pending", "approved", "rejected")
VALID_CONSULTATION_MODES = ("chat", "audio", "video")

# PostgreSQL enum for approval state (see alembic 0003).
ApprovalStatusType = Enum(*VALID_APPROVAL_STATUSES, name="profileapprovalstatus")

MAX_LANGUAGES = 12
MAX_SPECIALTIES = 12


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class AstrologerProfile(Base):
    """Public-facing profile of an astrologer, owned by one user."""

    __tablename__ = "astrologer_profiles"

    # Monetary values are NUMERIC(10, 2): never float arithmetic.
    RATE_PRECISION = (10, 2)

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    user_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
        doc="Owning user (role must be 'astrologer'). One profile per user.",
    )

    # --- identity / content -------------------------------------------------
    display_name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    bio: Mapped[str] = mapped_column(Text, nullable=False)
    profile_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    years_experience: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    # --- consultation modes + per-minute rates ------------------------------
    chat_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    audio_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    video_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    # NULL when the mode is disabled; otherwise > 0 (see check constraints).
    chat_rate: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    audio_rate: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    video_rate: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)

    # --- approval workflow ---------------------------------------------------
    approval_status: Mapped[str] = mapped_column(
        ApprovalStatusType,
        nullable=False,
        default="draft",
        server_default="draft",
        index=True,
        doc="draft | pending | approved | rejected",
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_by_id: Mapped[int | None] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        doc="Admin who approved/rejected the application.",
    )

    # --- basic availability ---------------------------------------------------
    is_available: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    available_from: Mapped[time | None] = mapped_column(Time, nullable=True)
    available_to: Mapped[time | None] = mapped_column(Time, nullable=True)
    timezone_name: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="Asia/Kolkata",
        server_default="Asia/Kolkata",
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

    # --- relationships ---------------------------------------------------------
    user: Mapped[User] = relationship("User", foreign_keys=[user_id], lazy="selectin")
    reviewer: Mapped[User | None] = relationship("User", foreign_keys=[reviewed_by_id], lazy="selectin")
    languages: Mapped[list[AstrologerLanguage]] = relationship(
        "AstrologerLanguage",
        back_populates="profile",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="AstrologerLanguage.language",
    )
    specialties: Mapped[list[AstrologerSpecialty]] = relationship(
        "AstrologerSpecialty",
        back_populates="profile",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="AstrologerSpecialty.specialty",
    )

    __table_args__ = (
        CheckConstraint(
            "years_experience >= 0 AND years_experience <= 80",
            name="ck_astrologer_profiles_years_experience",
        ),
        CheckConstraint(
            "(chat_rate IS NULL OR chat_rate >= 0) AND (NOT chat_enabled OR chat_rate > 0)",
            name="ck_astrologer_profiles_chat_rate",
        ),
        CheckConstraint(
            "(audio_rate IS NULL OR audio_rate >= 0) AND (NOT audio_enabled OR audio_rate > 0)",
            name="ck_astrologer_profiles_audio_rate",
        ),
        CheckConstraint(
            "(video_rate IS NULL OR video_rate >= 0) AND (NOT video_enabled OR video_rate > 0)",
            name="ck_astrologer_profiles_video_rate",
        ),
        CheckConstraint(
            "available_from IS NULL OR available_to IS NULL OR available_from < available_to",
            name="ck_astrologer_profiles_availability_window",
        ),
        Index("ix_astrologer_profiles_approval_created", "approval_status", "created_at"),
        Index("ix_astrologer_profiles_years_experience", "years_experience"),
    )

    def __repr__(self) -> str:
        return (
            f"<AstrologerProfile(id={self.id}, user_id={self.user_id}, "
            f"name={self.display_name!r}, status={self.approval_status})>"
        )

    @property
    def enabled_modes(self) -> list[str]:
        """Consultation modes the astrologer offers, in canonical order."""
        return [
            mode
            for mode, enabled in (
                ("chat", self.chat_enabled),
                ("audio", self.audio_enabled),
                ("video", self.video_enabled),
            )
            if enabled
        ]

    @property
    def min_rate_per_minute(self) -> float | None:
        """Cheapest enabled per-minute rate (None when no mode is offered)."""
        rates = [
            float(rate)
            for rate, enabled in (
                (self.chat_rate, self.chat_enabled),
                (self.audio_rate, self.audio_enabled),
                (self.video_rate, self.video_enabled),
            )
            if enabled and rate is not None
        ]
        return min(rates) if rates else None


class AstrologerLanguage(Base):
    """Language spoken by an astrologer (child row, one per language)."""

    __tablename__ = "astrologer_languages"

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    profile_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("astrologer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    language: Mapped[str] = mapped_column(String(60), nullable=False)

    profile: Mapped[AstrologerProfile] = relationship("AstrologerProfile", back_populates="languages")

    __table_args__ = (
        UniqueConstraint("profile_id", "language", name="uq_astrologer_languages_profile_language"),
        Index("ix_astrologer_languages_language", "language"),
    )

    def __repr__(self) -> str:
        return f"<AstrologerLanguage(profile_id={self.profile_id}, language={self.language!r})>"


class AstrologerSpecialty(Base):
    """Astrology specialty of an astrologer (child row, one per specialty)."""

    __tablename__ = "astrologer_specialties"

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    profile_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("astrologer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    specialty: Mapped[str] = mapped_column(String(80), nullable=False)

    profile: Mapped[AstrologerProfile] = relationship("AstrologerProfile", back_populates="specialties")

    __table_args__ = (
        UniqueConstraint("profile_id", "specialty", name="uq_astrologer_specialties_profile_specialty"),
        Index("ix_astrologer_specialties_specialty", "specialty"),
    )

    def __repr__(self) -> str:
        return f"<AstrologerSpecialty(profile_id={self.profile_id}, specialty={self.specialty!r})>"
