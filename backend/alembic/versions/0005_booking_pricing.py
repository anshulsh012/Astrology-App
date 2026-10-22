"""Phase 4: snapshot duration and server-side pricing on bookings.

Rates are never trusted from the client. At create time the API copies the
astrologer's per-minute rate for the chosen mode, the whole-minute duration,
and the quoted total onto the booking row.

Revision ID: 0005_booking_pricing
Revises: 0004_bookings
Create Date: 2026-10-21
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0005_booking_pricing"
down_revision: Union[str, None] = "0004_bookings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "bookings",
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="30"),
    )
    op.add_column(
        "bookings",
        sa.Column("rate_per_minute", sa.Numeric(10, 2), nullable=False, server_default="0.01"),
    )
    op.add_column(
        "bookings",
        sa.Column("quoted_total", sa.Numeric(10, 2), nullable=False, server_default="0.01"),
    )
    op.alter_column("bookings", "duration_minutes", server_default=None)
    op.alter_column("bookings", "rate_per_minute", server_default=None)
    op.alter_column("bookings", "quoted_total", server_default=None)

    if op.get_bind().dialect.name == "postgresql":
        op.execute(
            """
            ALTER TABLE bookings ADD CONSTRAINT ck_bookings_duration_minutes
                CHECK (duration_minutes >= 10 AND duration_minutes <= 240);
            ALTER TABLE bookings ADD CONSTRAINT ck_bookings_rate_per_minute
                CHECK (rate_per_minute > 0);
            ALTER TABLE bookings ADD CONSTRAINT ck_bookings_quoted_total
                CHECK (quoted_total > 0);
            """
        )


def downgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        op.execute(
            """
            ALTER TABLE bookings DROP CONSTRAINT IF EXISTS ck_bookings_quoted_total;
            ALTER TABLE bookings DROP CONSTRAINT IF EXISTS ck_bookings_rate_per_minute;
            ALTER TABLE bookings DROP CONSTRAINT IF EXISTS ck_bookings_duration_minutes;
            """
        )
    op.drop_column("bookings", "quoted_total")
    op.drop_column("bookings", "rate_per_minute")
    op.drop_column("bookings", "duration_minutes")
