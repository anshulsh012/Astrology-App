from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

VALID_ROLES = ("customer", "astrologer", "admin")

# The `users.role` column is a PostgreSQL enum (see alembic 0002). The model
# must bind that type too, or every INSERT fails with a DatatypeMismatch.
RoleType = Enum(*VALID_ROLES, name="userrole")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(unique=True, index=True)
    email_normalized: Mapped[str] = mapped_column(unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(nullable=False)
    role: Mapped[str] = mapped_column(
        RoleType,
        nullable=False,
        default="customer",
        server_default="customer",
        doc="One of customer, astrologer, admin. Normalized by the application.",
    )
    is_active: Mapped[bool] = mapped_column(default=True, server_default="true", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, role={self.role}, active={self.is_active})>"

    @property
    def is_customer(self) -> bool:
        return self.role == "customer"

    @property
    def is_astrologer(self) -> bool:
        return self.role == "astrologer"

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"
