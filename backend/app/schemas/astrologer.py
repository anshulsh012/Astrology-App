"""Phase 2: astrologer profile schemas (validation + serialization).

Rules enforced here (in addition to DB constraints):
- display_name / bio length bounds
- languages & specialties: trimmed, de-duplicated, capped
- an enabled consultation mode must carry a rate > 0
- availability window: from < to when both are given
- money is Decimal (serialized as an exact string, never float)

Public payloads never include email, approval internals or any other
private user data — see ``PublicAstrologerOut``.
"""

from __future__ import annotations

from datetime import datetime, time
from decimal import Decimal, InvalidOperation
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

ConsultationMode = Literal["chat", "audio", "video"]
SortOption = Literal["price_asc", "price_desc", "experience_asc", "experience_desc"]

MAX_LANGUAGES = 12
MAX_SPECIALTIES = 12
MAX_RATE = Decimal("100000")

_TIME_FORMATS = ("%H:%M", "%H:%M:%S")


def _clean_list(values: list[str] | None, max_items: int, label: str) -> list[str]:
    """Trim, drop blanks, de-duplicate case-insensitively, cap length."""
    if values is None:
        return []
    cleaned: list[str] = []
    seen: set[str] = set()
    for raw in values:
        item = raw.strip()
        if not item:
            continue
        key = item.lower()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(item)
    if len(cleaned) > max_items:
        raise ValueError(f"at most {max_items} {label} allowed")
    return cleaned


def _to_decimal(value: Any) -> Decimal | None:
    """Convert int/float/str to Decimal without float artefacts."""
    if value is None or value == "":
        return None
    try:
        # str() first: Decimal(0.1) would keep binary noise.
        return Decimal(str(value))
    except (InvalidOperation, ValueError) as exc:
        raise ValueError("rate must be a number") from exc


def _validate_rate_value(value: Any) -> Decimal | None:
    """Shared per-minute rate validation (bounds + 2 decimal places)."""
    rate = _to_decimal(value)
    if rate is None:
        return None
    if rate < 0:
        raise ValueError("rate must not be negative")
    if rate > MAX_RATE:
        raise ValueError("rate is too large")
    # NUMERIC(10, 2): keep at most two decimal places.
    if rate != rate.quantize(Decimal("0.01")):
        raise ValueError("rate must have at most two decimal places")
    return rate


class ProfileData(BaseModel):
    """Full profile payload used for create and merged-update validation."""

    model_config = ConfigDict(from_attributes=True)

    display_name: str = Field(..., min_length=2, max_length=120)
    bio: str = Field(..., min_length=20, max_length=4000)
    profile_image_url: str | None = Field(default=None, max_length=500)
    years_experience: int = Field(..., ge=0, le=80)

    languages: list[str] = Field(default_factory=list, max_length=MAX_LANGUAGES)
    specialties: list[str] = Field(default_factory=list, max_length=MAX_SPECIALTIES)

    chat_enabled: bool = False
    audio_enabled: bool = False
    video_enabled: bool = False
    chat_rate: Decimal | None = None
    audio_rate: Decimal | None = None
    video_rate: Decimal | None = None

    is_available: bool = True
    available_from: time | None = None
    available_to: time | None = None
    timezone_name: str = Field(default="Asia/Kolkata", min_length=1, max_length=64)

    # --- validators ---------------------------------------------------------
    @field_validator("display_name", "bio", "timezone_name")
    @classmethod
    def _strip_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("profile_image_url")
    @classmethod
    def _validate_image_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            return None
        if not value.startswith(("http://", "https://")):
            raise ValueError("profile_image_url must start with http:// or https://")
        return value

    @field_validator("languages")
    @classmethod
    def _validate_languages(cls, value: list[str]) -> list[str]:
        cleaned = _clean_list(value, MAX_LANGUAGES, "languages")
        if not cleaned:
            raise ValueError("at least one language is required")
        for item in cleaned:
            if len(item) > 60:
                raise ValueError("each language must be at most 60 characters")
        return cleaned

    @field_validator("specialties")
    @classmethod
    def _validate_specialties(cls, value: list[str]) -> list[str]:
        cleaned = _clean_list(value, MAX_SPECIALTIES, "specialties")
        if not cleaned:
            raise ValueError("at least one specialty is required")
        for item in cleaned:
            if len(item) > 80:
                raise ValueError("each specialty must be at most 80 characters")
        return cleaned

    @field_validator("chat_rate", "audio_rate", "video_rate", mode="before")
    @classmethod
    def _validate_rate(cls, value: Any) -> Decimal | None:
        return _validate_rate_value(value)

    @model_validator(mode="after")
    def _cross_field_checks(self) -> ProfileData:
        enabled = {
            "chat": (self.chat_enabled, self.chat_rate),
            "audio": (self.audio_enabled, self.audio_rate),
            "video": (self.video_enabled, self.video_rate),
        }
        for mode, (is_enabled, rate) in enabled.items():
            if is_enabled and (rate is None or rate <= 0):
                raise ValueError(f"{mode} mode requires a rate greater than 0")

        if (
            self.available_from is not None
            and self.available_to is not None
            and self.available_from >= self.available_to
        ):
            raise ValueError("available_from must be earlier than available_to")
        return self


class ProfileCreate(ProfileData):
    """POST body for creating the own profile."""


class ProfileUpdate(BaseModel):
    """PATCH body: every field optional, merged onto the current profile."""

    model_config = ConfigDict(extra="forbid")

    display_name: str | None = Field(default=None, min_length=2, max_length=120)
    bio: str | None = Field(default=None, min_length=20, max_length=4000)
    profile_image_url: str | None = Field(default=None, max_length=500)
    years_experience: int | None = Field(default=None, ge=0, le=80)

    languages: list[str] | None = None
    specialties: list[str] | None = None

    chat_enabled: bool | None = None
    audio_enabled: bool | None = None
    video_enabled: bool | None = None
    chat_rate: Decimal | None = None
    audio_rate: Decimal | None = None
    video_rate: Decimal | None = None

    is_available: bool | None = None
    available_from: time | None = None
    available_to: time | None = None
    timezone_name: str | None = Field(default=None, min_length=1, max_length=64)

    @field_validator("display_name", "bio", "timezone_name")
    @classmethod
    def _strip_text(cls, value: str | None) -> str | None:
        return value.strip() if isinstance(value, str) else value

    @field_validator("chat_rate", "audio_rate", "video_rate", mode="before")
    @classmethod
    def _validate_rate(cls, value: Any) -> Decimal | None:
        return _validate_rate_value(value)


class ProfileBase(BaseModel):
    """Public-safe profile shape shared by every profile payload.

    Deliberately contains no approval workflow fields, no user identity and
    no reviewer data — ``ProfileOut`` layers the owner-visible approval
    state on top, while ``PublicAstrologerOut`` stays exactly this base.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: str
    bio: str
    profile_image_url: str | None
    years_experience: int

    languages: list[str] = Field(default_factory=list)
    specialties: list[str] = Field(default_factory=list)

    chat_enabled: bool
    audio_enabled: bool
    video_enabled: bool
    chat_rate: Decimal | None
    audio_rate: Decimal | None
    video_rate: Decimal | None
    consultation_modes: list[str] = Field(default_factory=list)
    min_rate_per_minute: Decimal | None = None

    is_available: bool
    available_from: str | None = None
    available_to: str | None = None
    timezone_name: str

    created_at: datetime
    updated_at: datetime

    @field_validator("languages", mode="before")
    @classmethod
    def _unwrap_languages(cls, value: Any) -> list[str]:
        return [getattr(item, "language", item) for item in (value or [])]

    @field_validator("specialties", mode="before")
    @classmethod
    def _unwrap_specialties(cls, value: Any) -> list[str]:
        return [getattr(item, "specialty", item) for item in (value or [])]

    @field_validator("available_from", "available_to", mode="before")
    @classmethod
    def _format_time(cls, value: Any) -> str | None:
        if value is None:
            return None
        if isinstance(value, time):
            return value.strftime("%H:%M")
        return str(value)[:5]

    @model_validator(mode="after")
    def _derive_fields(self) -> ProfileBase:
        pairs = (
            ("chat", self.chat_enabled, self.chat_rate),
            ("audio", self.audio_enabled, self.audio_rate),
            ("video", self.video_enabled, self.video_rate),
        )
        self.consultation_modes = [mode for mode, enabled, _ in pairs if enabled]
        rates = [rate for _, enabled, rate in pairs if enabled and rate is not None]
        self.min_rate_per_minute = min(rates) if rates else None
        return self


class ProfileOut(ProfileBase):
    """Owner-facing profile payload (astrologer dashboard).

    Adds the approval workflow state the owner must see.
    """

    approval_status: str
    rejection_reason: str | None = None
    submitted_at: datetime | None = None
    reviewed_at: datetime | None = None


class PublicAstrologerOut(ProfileBase):
    """Public discovery payload: no approval internals, no user data.

    Only ever built from approved profiles.
    """


class AdminApplicationOut(ProfileOut):
    """Admin review payload: adds applicant identity + audit fields."""

    user_id: int
    applicant_email: str
    applicant_is_active: bool
    reviewed_by_id: int | None = None

    @model_validator(mode="before")
    @classmethod
    def _pull_applicant_identity(cls, data: Any) -> Any:
        """Denormalise ``profile.user`` into the applicant_* fields.

        FastAPI validates responses straight from the ORM object, which has
        no ``applicant_email`` attribute; expand the owning user here so
        every construction path (list + detail) behaves the same.
        """
        user = getattr(data, "user", None)
        if isinstance(data, dict) or user is None:
            return data
        base = ProfileOut.model_validate(data).model_dump()
        base.update(
            user_id=data.user_id,
            applicant_email=user.email,
            applicant_is_active=user.is_active,
            reviewed_by_id=data.reviewed_by_id,
        )
        return base


class RejectRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reason: str = Field(..., min_length=5, max_length=2000)

    @field_validator("reason")
    @classmethod
    def _strip_reason(cls, value: str) -> str:
        return value.strip()


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool


class PublicAstrologerPage(PaginationMeta):
    items: list[PublicAstrologerOut]


class ApplicationPage(PaginationMeta):
    items: list[AdminApplicationOut]
