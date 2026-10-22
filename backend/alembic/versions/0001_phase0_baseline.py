"""Alembic version table placeholder for Phase 0.

Phase 0 ships no domain tables, so this baseline revision intentionally
creates nothing. Running `alembic upgrade head` still verifies that the
configured PostgreSQL connection works end-to-end.

Revision ID: 0001_phase0_baseline
Revises:
Create Date: 2026-10-17

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op  # noqa: F401

# revision identifiers, used by Alembic.
revision: str = "0001_phase0_baseline"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # No tables in Phase 0 — connection validation happens implicitly.
    pass


def downgrade() -> None:
    pass