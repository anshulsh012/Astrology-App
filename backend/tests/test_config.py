"""Settings tests: configuration must come from the environment."""

from __future__ import annotations

import pytest

from app.core.config import Settings, get_settings


def test_settings_load_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://app:secret@db:5432/astro")
    monkeypatch.setenv("CORS_ORIGINS", "http://a.test, http://b.test")

    # `_env_file=None` makes the test independent of any local `.env` file.
    settings = Settings(_env_file=None)

    assert settings.app_env == "test"
    assert settings.build_database_url() == "postgresql+psycopg://app:secret@db:5432/astro"
    assert settings.cors_origin_list == ["http://a.test", "http://b.test"]


def test_database_url_composed_from_postgres_vars(monkeypatch: pytest.MonkeyPatch) -> None:
    for var in ("DATABASE_URL", "POSTGRES_USER", "POSTGRES_DB", "POSTGRES_PASSWORD",
                "POSTGRES_HOST", "POSTGRES_PORT"):
        monkeypatch.delenv(var, raising=False)

    monkeypatch.setenv("POSTGRES_USER", "astro")
    monkeypatch.setenv("POSTGRES_PASSWORD", "s3cret")
    monkeypatch.setenv("POSTGRES_HOST", "db.internal")
    monkeypatch.setenv("POSTGRES_PORT", "6543")
    monkeypatch.setenv("POSTGRES_DB", "stars")

    settings = Settings(_env_file=None)

    assert settings.build_database_url() == "postgresql+psycopg://astro:s3cret@db.internal:6543/stars"
    assert settings.is_configured_database is True


def test_missing_database_config_raises_clear_error(monkeypatch: pytest.MonkeyPatch) -> None:
    for var in ("DATABASE_URL", "POSTGRES_USER", "POSTGRES_DB"):
        monkeypatch.delenv(var, raising=False)

    settings = Settings(_env_file=None)

    assert settings.is_configured_database is False
    with pytest.raises(RuntimeError, match="Database is not configured"):
        settings.build_database_url()


def test_invalid_app_env_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "staging")

    with pytest.raises(ValueError, match="APP_ENV"):
        Settings(_env_file=None)


def test_get_settings_is_cached() -> None:
    get_settings.cache_clear()
    try:
        assert get_settings() is get_settings()
    finally:
        get_settings.cache_clear()