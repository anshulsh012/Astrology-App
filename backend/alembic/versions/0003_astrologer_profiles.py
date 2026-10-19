"""Phase 2: astrologer profiles, languages and specialties.

Approval workflow columns (approval_status, rejection_reason, submitted_at,
reviewed_at, reviewed_by_id) support admin review. Monetary values use
NUMERIC(10, 2) — never floating point.

Revision ID: 0003_astrologer_profiles
Revises: 0002_users_table
Create Date: 2026-10-17

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0003_astrologer_profiles"
down_revision: Union[str, None] = "0002_users_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    approval_status = sa.Enum(
        "draft", "pending", "approved", "rejected", name="profileapprovalstatus", create_type=True
    )

    op.create_table(
        "astrologer_profiles",
        sa.Column(
            "id",
            sa.BigInteger().with_variant(sa.Integer, "sqlite"),
            primary_key=True,
            autoincrement=True,
        ),
        sa.Column(
            "user_id",
            sa.BigInteger().with_variant(sa.Integer, "sqlite"),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("display_name", sa.String(120), nullable=False),
        sa.Column("bio", sa.Text(), nullable=False),
        sa.Column("profile_image_url", sa.String(500), nullable=True),
        sa.Column("years_experience", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("chat_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("audio_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("video_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        # NUMERIC keeps money exact; NULL means the mode is not offered.
        sa.Column("chat_rate", sa.Numeric(10, 2), nullable=True),
        sa.Column("audio_rate", sa.Numeric(10, 2), nullable=True),
        sa.Column("video_rate", sa.Numeric(10, 2), nullable=True),
        sa.Column("approval_status", approval_status, nullable=False, server_default=sa.text("'draft'")),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "reviewed_by_id",
            sa.BigInteger().with_variant(sa.Integer, "sqlite"),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("is_available", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("available_from", sa.Time(), nullable=True),
        sa.Column("available_to", sa.Time(), nullable=True),
        sa.Column(
            "timezone_name",
            sa.String(64),
            nullable=False,
            server_default=sa.text("'Asia/Kolkata'"),
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        # --- integrity constraints ------------------------------------------
        # One profile per user is enforced by the unique index below.
        sa.CheckConstraint(
            "years_experience >= 0 AND years_experience <= 80",
            name="ck_astrologer_profiles_years_experience",
        ),
        sa.CheckConstraint(
            "(chat_rate IS NULL OR chat_rate >= 0) AND (NOT chat_enabled OR chat_rate > 0)",
            name="ck_astrologer_profiles_chat_rate",
        ),
        sa.CheckConstraint(
            "(audio_rate IS NULL OR audio_rate >= 0) AND (NOT audio_enabled OR audio_rate > 0)",
            name="ck_astrologer_profiles_audio_rate",
        ),
        sa.CheckConstraint(
            "(video_rate IS NULL OR video_rate >= 0) AND (NOT video_enabled OR video_rate > 0)",
            name="ck_astrologer_profiles_video_rate",
        ),
        sa.CheckConstraint(
            "available_from IS NULL OR available_to IS NULL OR available_from < available_to",
            name="ck_astrologer_profiles_availability_window",
        ),
    )

    op.create_index("ix_astrologer_profiles_user_id", "astrologer_profiles", ["user_id"], unique=True)
    op.create_index("ix_astrologer_profiles_display_name", "astrologer_profiles", ["display_name"])
    op.create_index("ix_astrologer_profiles_approval_status", "astrologer_profiles", ["approval_status"])
    op.create_index(
        "ix_astrologer_profiles_approval_created",
        "astrologer_profiles",
        ["approval_status", "created_at"],
    )
    op.create_index("ix_astrologer_profiles_years_experience", "astrologer_profiles", ["years_experience"])

    op.create_table(
        "astrologer_languages",
        sa.Column(
            "id",
            sa.BigInteger().with_variant(sa.Integer, "sqlite"),
            primary_key=True,
            autoincrement=True,
        ),
        sa.Column(
            "profile_id",
            sa.BigInteger().with_variant(sa.Integer, "sqlite"),
            sa.ForeignKey("astrologer_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("language", sa.String(60), nullable=False),
        sa.UniqueConstraint("profile_id", "language", name="uq_astrologer_languages_profile_language"),
    )
    op.create_index("ix_astrologer_languages_profile_id", "astrologer_languages", ["profile_id"])
    op.create_index("ix_astrologer_languages_language", "astrologer_languages", ["language"])

    op.create_table(
        "astrologer_specialties",
        sa.Column(
            "id",
            sa.BigInteger().with_variant(sa.Integer, "sqlite"),
            primary_key=True,
            autoincrement=True,
        ),
        sa.Column(
            "profile_id",
            sa.BigInteger().with_variant(sa.Integer, "sqlite"),
            sa.ForeignKey("astrologer_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("specialty", sa.String(80), nullable=False),
        sa.UniqueConstraint("profile_id", "specialty", name="uq_astrologer_specialties_profile_specialty"),
    )
    op.create_index("ix_astrologer_specialties_profile_id", "astrologer_specialties", ["profile_id"])
    op.create_index("ix_astrologer_specialties_specialty", "astrologer_specialties", ["specialty"])


def downgrade() -> None:
    op.drop_table("astrologer_specialties")
    op.drop_table("astrologer_languages")
    op.drop_table("astrologer_profiles")
    sa.Enum(name="profileapprovalstatus").drop(op.get_bind(), checkfirst=True)
