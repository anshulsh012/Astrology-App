"""SQLAlchemy declarative base for all future models.

Phase 0 ships no domain tables; models will be added in later phases and
discovered by Alembic autogeneration via `Base.metadata`.
"""

from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for ORM models."""