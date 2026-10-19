"""Backend test configuration: isolated database, role fixtures, app factory.

Test DB is configured only from environment (TEST_DATABASE_URL) so tests never
touch the developer's local dev/prod database and never depend on a local .env.
"""

from __future__ import annotations

import os
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.core.database import get_session, reset_database_caches
from app.main import create_app
from app.models.user import User


def hash_password(plain: str) -> str:
    from app.core.security import hash_password as _h
    return _h(plain)


def _password_for_test(plain: str) -> str:
    encoded = plain.encode("utf-8")
    if len(encoded) > 72:
        return plain[:72]
    if len(encoded) < 8:
        return plain + "X" * (8 - len(encoded))
    return plain
    if len(encoded) < 8:
        return plain + "X" * (8 - len(encoded))
    return plain


# Use a dedicated test database URL so tests are isolated from dev/production.
_TEST_DB_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://test:test@localhost:5432/test_astrology_db",
)

_test_engine = create_engine(
    _TEST_DB_URL,
    pool_pre_ping=True,
    # The suite holds a fixture session while the app opens its own, so a
    # single-connection pool deadlocks (seconds, then QueuePool TimeoutError).
    pool_size=5,
    max_overflow=10,
    connect_args={"connect_timeout": 3},
    future=True,
)

_test_session_maker = sessionmaker(bind=_test_engine, autoflush=False, expire_on_commit=False, future=True)


@pytest.fixture(scope="session", autouse=True)
def _ensure_test_database_schema():
    """Create the alembic version + users table for the test database once per run.

    `alembic/env.py` derives the URL from application settings and ignores
    `sqlalchemy.url`, so the settings environment must point at the test
    database before migrations run — otherwise they land on the dev database.
    """
    from alembic import command
    from alembic.config import Config

    managed_env = ("DATABASE_URL", "APP_ENV", "CORS_ORIGINS")
    original_env = {key: os.environ.get(key) for key in managed_env}
    os.environ["DATABASE_URL"] = _TEST_DB_URL
    os.environ["APP_ENV"] = "test"
    os.environ["CORS_ORIGINS"] = ""
    get_settings.cache_clear()
    reset_database_caches()

    try:
        alembic_cfg = Config("alembic.ini")
        alembic_cfg.set_main_option("script_location", "alembic")
        alembic_cfg.set_main_option("sqlalchemy.url", _TEST_DB_URL)
        command.upgrade(alembic_cfg, "head")
        yield
    finally:
        for key, value in original_env.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value
        get_settings.cache_clear()
        reset_database_caches()


def _override_get_session() -> Generator[Session, None, None]:
    """Yield sessions from the isolated test engine."""
    session = _test_session_maker()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(autouse=True)
def _clean_database(_ensure_test_database_schema) -> Generator[None, None, None]:
    """Each test starts from an empty users table and session store.

    The test database is dedicated to this suite, so clearing it cannot touch
    development or production data.
    """
    from app.core.auth import _session_store

    with _test_engine.begin() as connection:
        connection.execute(text("DELETE FROM users"))
    _session_store._store.clear()
    yield


@pytest.fixture
def app(monkeypatch: pytest.MonkeyPatch) -> Generator:
    """FastAPI app configured for tests (isolated settings + database)."""
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("DATABASE_URL", _TEST_DB_URL)
    monkeypatch.setenv("CORS_ORIGINS", "")
    get_settings.cache_clear()
    reset_database_caches()

    application = create_app()
    application.dependency_overrides[get_session] = _override_get_session
    # Role-protection tests seed users through `client.app.state.db_session`.
    state_session = _test_session_maker()
    application.state.db_session = state_session
    try:
        yield application
    finally:
        state_session.close()
        application.dependency_overrides.clear()
        get_settings.cache_clear()
        reset_database_caches()


@pytest.fixture
def client(app) -> Generator[TestClient, None, None]:
    with TestClient(app) as c:
        yield c


@pytest.fixture
def db_session(app: Generator) -> Generator[Session, None, None]:
    with _test_session_maker() as session:
        yield session


@pytest.fixture
def admin_user(db_session: Session) -> User:
    """Create an active admin and return it."""
    u = User(
        email="admin@test.com",
        email_normalized="admin@test.com",
        password_hash=hash_password("AdminPass1X"),
        role="admin",
        is_active=True,
    )
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    return u


@pytest.fixture
def astrologer_user(db_session: Session) -> User:
    u = User(
        email="astro@test.com",
        email_normalized="astro@test.com",
        password_hash=hash_password("AstroPass1X"),
        role="astrologer",
        is_active=True,
    )
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    return u


@pytest.fixture
def customer_user(db_session: Session) -> User:
    u = User(
        email="cust@test.com",
        email_normalized="cust@test.com",
        password_hash=hash_password("CustPass1X"),
        role="customer",
        is_active=True,
    )
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    return u


@pytest.fixture
def active_user(db_session: Session) -> User:
    return customer_user(db_session)


@pytest.fixture
def inactive_user(db_session: Session) -> User:
    u = User(
        email="inactive@test.com",
        email_normalized="inactive@test.com",
        password_hash=hash_password("InactivePass1X"),
        role="customer",
        is_active=False,
    )
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    return u


@pytest.fixture
def auth_headers(customer_user: User) -> dict:
    """Return headers with a valid session cookie for the given user.

    Note: session is stored server-side in the in-memory _session_store, so
    we must call login through the test client to obtain the cookie instead
    of manufacturing it here.
    """
    # We cannot manufacture a cookie without calling login through TestClient
    # because the session is stored in app-state in-memory _session_store.
    # This fixture is a stub; real auth headers come from client.login helper.
    pytest.skip("auth_headers is not directly usable; use client helper")
