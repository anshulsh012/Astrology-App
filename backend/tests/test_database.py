"""Database wiring tests (no live PostgreSQL required)."""

from __future__ import annotations

import pytest
from sqlalchemy import make_url

from app.core.config import Settings
from app.core.database import (
    CONNECT_TIMEOUT_SECONDS,
    check_database,
    get_engine,
    reset_database_caches,
)

TEST_DB_URL = "postgresql+psycopg://user:pass@localhost:5432/astrology_db"


def _clean_settings(monkeypatch: pytest.MonkeyPatch, **env: str) -> Settings:
    """Build Settings from monkeypatched env vars only (no .env file)."""
    for var in ("DATABASE_URL", "POSTGRES_USER", "POSTGRES_DB", "POSTGRES_PASSWORD",
                "POSTGRES_HOST", "POSTGRES_PORT"):
        monkeypatch.delenv(var, raising=False)
    for key, value in env.items():
        monkeypatch.setenv(key, value)
    return Settings(_env_file=None)


def test_engine_built_from_configured_url(monkeypatch: pytest.MonkeyPatch) -> None:
    _clean_settings(DATABASE_URL=TEST_DB_URL, monkeypatch=monkeypatch)
    reset_database_caches()
    try:
        monkeypatch.setattr("app.core.config.get_settings", lambda: Settings(_env_file=None))
        engine = get_engine()
        assert engine.url.get_backend_name() == "postgresql"
        assert engine.url.drivername == "postgresql+psycopg"
        # Password must be masked when the URL is rendered for logs/reprs.
        assert "pass" not in engine.url.render_as_string(hide_password=True)
    finally:
        reset_database_caches()


def test_url_helper_parses_as_postgresql() -> None:
    url = make_url(TEST_DB_URL)
    assert url.get_backend_name() == "postgresql"


def test_check_database_reports_unconfigured(monkeypatch: pytest.MonkeyPatch) -> None:
    settings = _clean_settings(monkeypatch=monkeypatch)

    status = check_database(settings)

    assert status["configured"] is False
    assert status["connected"] is False
    assert "not set" in str(status["detail"])


def test_check_database_reports_connection_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    """A configured-but-unreachable DB yields a JSON-safe failure status."""
    settings = _clean_settings(
        DATABASE_URL="postgresql+psycopg://user:pass@127.0.0.1:59999/none",
        monkeypatch=monkeypatch,
    )
    reset_database_caches()
    try:
        status = check_database(settings)
    finally:
        reset_database_caches()

    assert status["configured"] is True
    assert status["connected"] is False
    assert isinstance(status["detail"], str)


def test_connect_timeout_is_bounded() -> None:
    assert 0 < CONNECT_TIMEOUT_SECONDS <= 10