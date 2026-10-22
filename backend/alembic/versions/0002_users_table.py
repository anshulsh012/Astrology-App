"""Phase 1: user table for authentication and RBAC.

Roles: customer (default for public registration), astrologer
(admin-approved), admin (provisioned through controlled means).

Revision ID: 0002_users_table
Revises: 0001_phase0_baseline
Create Date: 2026-10-17

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0002_users_table"
down_revision: Union[str, None] = "0001_phase0_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column(
            "id",
            sa.BigInteger().with_variant(sa.Integer, "sqlite"),
            primary_key=True,
            autoincrement=True,
        ),
        sa.Column(
            "email",
            sa.String(),
            nullable=False,
        ),
        sa.Column(
            "email_normalized",
            sa.String(),
            nullable=False,
            unique=True,
            comment="lowercase form used for lookups and DB uniqueness",
        ),
        sa.Column(
            "password_hash",
            sa.String(),
            nullable=False,
        ),
        sa.Column(
            "role",
            sa.Enum("customer", "astrologer", "admin", name="userrole", create_type=True),
            nullable=False,
            server_default=sa.text("'customer'"),
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("email", "email_normalized"),
        sa.Index("ix_users_email_normalized", "email_normalized"),
        sa.Index("ix_users_role", "role"),
        sa.Index("ix_users_created_at", "created_at"),
    )


def downgrade() -> None:
    op.drop_table("users")