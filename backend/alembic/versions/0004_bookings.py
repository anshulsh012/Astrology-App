"""Phase 3: consultation bookings.

Explicit lifecycle (bookingstatus): pending -> accepted | rejected |
cancelled. All timestamps are timezone-aware (UTC). Duration bounds are
mirrored as CHECK constraints on PostgreSQL (the target database).

Revision ID: 0004_bookings
Revises: 0003_astrologer_profiles
Create Date: 2026-10-19

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0004_bookings"
down_revision: Union[str, None] = "0003_astrologer_profiles"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

MIN_BOOKING_MINUTES = 10
MAX_BOOKING_MINUTES = 240


def upgrade() -> None:
    booking_status = sa.Enum(
        "pending", "accepted", "rejected", "cancelled", name="bookingstatus", create_type=True
    )
    booking_mode = sa.Enum("chat", "audio", "video", name="bookingmode", create_type=True)

    op.create_table(
        "bookings",
        sa.Column(
            "id",
            sa.BigInteger().with_variant(sa.Integer, "sqlite"),
            primary_key=True,
            autoincrement=True,
        ),
        sa.Column(
            "customer_id",
            sa.BigInteger().with_variant(sa.Integer, "sqlite"),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "astrologer_profile_id",
            sa.BigInteger().with_variant(sa.Integer, "sqlite"),
            sa.ForeignKey("astrologer_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("mode", booking_mode, nullable=False),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", booking_status, nullable=False, server_default=sa.text("'pending'")),
        sa.Column("topic", sa.Text(), nullable=True),
        sa.Column("decision_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "cancelled_by_id",
            sa.BigInteger().with_variant(sa.Integer, "sqlite"),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        # --- integrity constraints ------------------------------------------
        sa.CheckConstraint("end_at > start_at", name="ck_bookings_end_after_start"),
    )

    # Duration bounds: EXTRACT(EPOCH ...) is PostgreSQL-only, so the CHECK is
    # added conditionally. The API layer enforces the same bounds on every
    # database (app/models/booking.py MIN/MAX_BOOKING_MINUTES).
    if op.get_bind().dialect.name == "postgresql":
        op.execute(
            f"""
            ALTER TABLE bookings ADD CONSTRAINT ck_bookings_min_duration
                CHECK ((EXTRACT(EPOCH FROM (end_at - start_at)) / 60) >= {MIN_BOOKING_MINUTES});
            ALTER TABLE bookings ADD CONSTRAINT ck_bookings_max_duration
                CHECK ((EXTRACT(EPOCH FROM (end_at - start_at)) / 60) <= {MAX_BOOKING_MINUTES});
            """
        )

    op.create_index("ix_bookings_customer_id", "bookings", ["customer_id"])
    op.create_index("ix_bookings_astrologer_profile_id", "bookings", ["astrologer_profile_id"])
    op.create_index("ix_bookings_status", "bookings", ["status"])
    op.create_index("ix_bookings_customer_start", "bookings", ["customer_id", "start_at"])
    op.create_index(
        "ix_bookings_astrologer_status_start", "bookings", ["astrologer_profile_id", "status", "start_at"]
    )
    op.create_index("ix_bookings_status_start", "bookings", ["status", "start_at"])


def downgrade() -> None:
    op.drop_table("bookings")
    sa.Enum(name="bookingstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="bookingmode").drop(op.get_bind(), checkfirst=True)
