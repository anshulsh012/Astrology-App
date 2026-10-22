from __future__ import annotations

from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings, get_settings

# Fail fast (instead of hanging) when a host silently drops connections —
# keeps /api/v1/health/db responsive.
CONNECT_TIMEOUT_SECONDS = 3


@lru_cache
def _engine_for_url(url: str) -> Engine:
    """Create (and cache) one engine per database URL."""
    return create_engine(
        url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        connect_args={"connect_timeout": CONNECT_TIMEOUT_SECONDS},
        future=True,
    )


def get_engine() -> Engine:
    """Engine built from the current environment settings."""
    return _engine_for_url(get_settings().build_database_url())


@lru_cache
def new_session_factory() -> sessionmaker[Session]:
    """Cached session factory bound to the settings-derived engine."""
    return sessionmaker(bind=get_engine(), autoflush=False, expire_on_commit=False, future=True)


def get_session() -> Iterator[Session]:
    """FastAPI dependency yielding a session (closed after use)."""
    session: Session = new_session_factory()()
    try:
        yield session
    finally:
        session.close()


def check_database(settings: Settings | None = None) -> dict[str, object]:
    """Verify database connectivity with a trivial query.

    Returns a JSON-safe status dictionary instead of raising, so health
    endpoints always respond with valid JSON.
    """
    settings = settings or get_settings()

    if not settings.is_configured_database:
        return {
            "configured": False,
            "connected": False,
            "detail": "DATABASE_URL / POSTGRES_* not set (see .env.example)",
        }

    try:
        with _engine_for_url(settings.build_database_url()).connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"configured": True, "connected": True, "detail": "SELECT 1 ok"}
    except Exception as exc:
        return {
            "configured": True,
            "connected": False,
            "detail": f"{type(exc).__name__}: {exc}",
        }


def reset_database_caches() -> None:
    """Clear cached engines/session factory (used by tests)."""
    _engine_for_url.cache_clear()
    new_session_factory.cache_clear()