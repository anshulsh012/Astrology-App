from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Repository root (backend/app/core/config.py -> parents[3])
REPO_ROOT = Path(__file__).resolve().parents[3]
ENV_FILE = REPO_ROOT / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables / `.env`.

    Secrets (database credentials) are never hardcoded here — they must come
    from the environment. See `.env.example` at the repository root.
    """

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "Nakshtra Tak API"
    app_env: str = Field(default="development", description="development | production | test")
    app_version: str = "0.1.0"
    api_v1_prefix: str = "/api/v1"

    # Comma-separated list of allowed CORS origins (frontend dev server by default).
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # --- PostgreSQL -------------------------------------------------------
    # Full SQLAlchemy URL, e.g. postgresql+psycopg://user:pass@host:5432/db
    # Leave empty to compose it from the POSTGRES_* variables below.
    database_url: str = ""

    postgres_user: str = ""
    postgres_password: str = ""
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "astrology_db"

    @field_validator("app_env")
    @classmethod
    def _validate_env(cls, value: str) -> str:
        allowed = {"development", "production", "test"}
        if value not in allowed:
            raise ValueError(f"APP_ENV must be one of {sorted(allowed)}, got {value!r}")
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_configured_database(self) -> bool:
        """True when enough information exists to build a database URL."""
        return bool(self.database_url) or bool(self.postgres_user and self.postgres_db)

    def build_database_url(self) -> str:
        """Return the SQLAlchemy database URL.

        Raises ``RuntimeError`` with a clear message when nothing is
        configured, so credentials are never silently defaulted.
        """
        if self.database_url:
            return self.database_url

        if self.postgres_user and self.postgres_db:
            password = self.postgres_password or ""
            return (
                f"postgresql+psycopg://{self.postgres_user}:{password}"
                f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
            )

        raise RuntimeError(
            "Database is not configured. Copy `.env.example` to `.env` at the "
            "repository root and set DATABASE_URL (or POSTGRES_USER and "
            "POSTGRES_DB)."
        )


@lru_cache
def get_settings() -> Settings:
    """Cached settings accessor (cache is cleared in tests when needed)."""
    return Settings()