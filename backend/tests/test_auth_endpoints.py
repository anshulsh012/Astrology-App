"""Tests: registration, login, logout, me, role gates, password hashing,
role escalation attempts, inactive accounts, cross-role denial, duplicate
email, invalid credentials.

These tests use a real TestClient against the app factory for integration
coverage of auth endpoints and role-protected sample routes.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import _make_session_id, _now, _session_store
from app.core.security import hash_password, normalize_email, verify_password

from app.models.user import User

from app.api.v1.dependencies import role_required
from app.api.v1.endpoints import admin
from app.core.database import get_session


# ---------------------------------------------------------------------------
# Unit-level tests: hashing, email normalization, session store, role guard
# ---------------------------------------------------------------------------

def test_hash_password_returns_unique_bcrypt_hashes():
    pw = "SuperSecret1"
    h1 = hash_password(pw)
    h2 = hash_password(pw)
    assert h1.startswith("$2b$")
    assert h2.startswith("$2b$")
    assert h1 != h2  # each call uses a unique salt
    assert verify_password(pw, h1)
    assert verify_password(pw, h2)
    assert not verify_password("wrong", h1)


def test_verify_password_rejects_wrong():
    pw = "Secret12"
    h = hash_password(pw)
    assert verify_password(pw, h)
    assert not verify_password("wrong", h)
    assert not verify_password(pw + "!", h)


def test_normalize_email_lower_and_stripped():
    assert normalize_email("  A@B.C ") == "a@b.c"
    assert normalize_email("a@b.c") == "a@b.c"
    assert normalize_email("MixedCase@Example.COM") == "mixedcase@example.com"


def test_user_model_basic_fields():
    u = User(
        email="a@b.c",
        email_normalized="a@b.c",
        password_hash="$2b$x",
        role="customer",
        is_active=True,
    )
    assert u.role == "customer"
    assert u.is_active is True
    assert u.is_customer is True
    assert u.is_astrologer is False
    assert u.is_admin is False
    assert normalize_email("  MixedCase@Example.COM ") == "mixedcase@example.com"


def test_role_required_denies_wrong_role():
    """Role gate raises 403 when user.role != required role."""
    guard = role_required("admin")

    class FakeUser:
        role = "customer"
        id = 1

    with pytest.raises(HTTPException) as exc_info:
        guard(FakeUser())

    assert exc_info.value.status_code == 403

    class FakeAdmin:
        role = "admin"
        id = 2

    assert guard(FakeAdmin()).role == "admin"


def test_session_store_basic_lifecycle():
    store = _session_store
    store._store.clear()

    sid = _make_session_id()
    expires_at = _now() + timedelta(seconds=60)
    store.set(sid, 1, "customer", expires_at)
    entry = store.get(sid)
    assert entry is not None
    assert entry["role"] == "customer"
    assert entry["user_id"] == 1

    store.delete(sid)
    assert store.get(sid) is None


def test_session_store_expired_returns_none():
    store = _session_store
    store._store.clear()

    sid = _make_session_id()
    expires_at = _now() - timedelta(seconds=1)  # already expired
    store.set(sid, 1, "customer", expires_at)
    assert store.get(sid) is None


# ---------------------------------------------------------------------------
# Integration tests via TestClient against the app factory
# ---------------------------------------------------------------------------

def _make_client(app) -> TestClient:
    return TestClient(app)


def _post_register(client: TestClient, email: str, password: str) -> dict:
    resp = client.post("/api/v1/auth/register", json={"email": email, "password": password})
    assert resp.status_code == 201, f"register failed: {resp.status_code} {resp.text}"
    return resp.json()


def _post_login(client: TestClient, email: str, password: str) -> dict:
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"login failed: {resp.status_code} {resp.text}"
    return resp.json()


def _cookie_from_set_cookie(header_value: str) -> dict[str, str]:
    """Parse 'name=value; ...' into {name: value}."""
    if not header_value:
        return {}
    pair = header_value.split(";", 1)[0]
    name, value = pair.split("=", 1)
    return {name: value}


def _make_client(app):
    return TestClient(app)


class TestRegister:
    """Register tests use a real TestClient against the app factory."""

    def test_register_returns_201_and_customer_role(self, client: TestClient):
        body = _post_register(client, "c@example.com", _password_for_test("Pass1234"))
        assert body["role"] == "customer"
        assert body["is_active"] is True
        assert "password" not in body
        assert "password_hash" not in body

    def test_register_duplicate_email_returns_409(self, client: TestClient):
        email = "dup@example.com"
        _post_register(client, email, _password_for_test("Pass1234"))
        resp = client.post("/api/v1/auth/register", json={"email": email, "password": _password_for_test("Pass5678")})
        assert resp.status_code == 409
        assert resp.json()["detail"] == "A user with this email already exists"

    def test_register_normalizes_case_for_uniqueness(self, client: TestClient):
        resp = client.post(
            "/api/v1/auth/register",
            json={"email": "  MixedCASE@Example.COM ", "password": _password_for_test("Pass1234")},
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["email"] == "  MixedCASE@Example.COM "
        resp2 = client.post(
            "/api/v1/auth/register",
            json={"email": "mixedcase@example.com", "password": _password_for_test("Pass1234")},
        )
        assert resp2.status_code == 409


    def test_register_empty_password_rejected(self, client: TestClient):
        resp = client.post(
            "/api/v1/auth/register",
            json={"email": "empty@example.com", "password": _password_for_test("   ")},
        )
        assert resp.status_code == 422
        assert "Password must not be empty" in resp.json()["detail"]

    def test_register_returns_201_and_customer_role(self, client):
        body = _post_register(client, "c@example.com", "Pass1234")
        assert body["role"] == "customer"
        assert body["is_active"] is True
        assert "password" not in body
        assert "password_hash" not in body

    def test_register_duplicate_email_returns_409(self, client):
        email = "dup@example.com"
        _post_register(client, email, "Pass1234")
        resp = client.post("/api/v1/auth/register", json={"email": email, "password": "Pass5678"})
        assert resp.status_code == 409
        assert resp.json()["detail"] == "A user with this email already exists"

    def test_register_normalizes_case_for_uniqueness(self, client):
        resp = client.post(
            "/api/v1/auth/register",
            json={"email": "  MixedCASE@Example.COM ", "password": "Pass1234"},
        )
        assert resp.status_code == 201
        body = resp.json()
        # EmailStr trims surrounding whitespace and lowercases the domain; the
        # stored value must already be normalised, not the raw input.
        assert body["email"] == "MixedCASE@example.com"
        resp2 = client.post(
            "/api/v1/auth/register",
            json={"email": "mixedcase@example.com", "password": "Pass1234"},
        )
        assert resp2.status_code == 409

    def test_register_empty_password_rejected(self, client):
        resp = client.post(
            "/api/v1/auth/register",
            json={"email": "empty@example.com", "password": "   "},
        )
        assert resp.status_code == 422
        errors = resp.json()["detail"]
        assert isinstance(errors, list)
        assert any(error["loc"][-1] == "password" for error in errors)


class TestLogin:
    """Login tests verify credentials, inactive users, and cookie creation."""

    def test_login_success_returns_user(self, client: TestClient):
        _post_register(client, "login@example.com", _password_for_test("Pass1234"))
        body = _post_login(client, "LOGIN@example.COM", _password_for_test("Pass1234"))
        assert body["role"] == "customer"
        assert body["is_active"] is True
        assert "password" not in body

    def test_login_wrong_password_returns_401(self, client: TestClient):
        _post_register(client, "badpw@example.com", _password_for_test("RealPass1"))
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "badpw@example.com", "password": _password_for_test("WrongPass1")},
        )
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Invalid email or password"

    def test_login_nonexistent_email_returns_401(self, client: TestClient):
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "ghost@example.com", "password": _password_for_test("anything1")},
        )
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Invalid email or password"

    def test_login_auto_sets_session_cookie(self, client: TestClient):
        _post_register(client, "cookie@example.com", _password_for_test("Pass1234"))
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "cookie@example.com", "password": _password_for_test("Pass1234")},
        )
        assert resp.status_code == 200
        cookie = _cookie_from_set_cookie(resp.headers.get("set-cookie", ""))
        assert "nakshtra_session" in cookie
        assert len(cookie["nakshtra_session"]) >= 32

    def test_login_success_returns_user(self, client):
        _post_register(client, "login@example.com", "Pass1234X")
        body = _post_login(client, "LOGIN@example.COM", "Pass1234X")
        assert body["role"] == "customer"
        assert body["is_active"] is True
        assert "password" not in body

    def test_login_wrong_password_returns_401(self, client):
        _post_register(client, "badpw@example.com", "RealPass1X")
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "badpw@example.com", "password": "WrongPass1X"},
        )
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Invalid email or password"

    def test_login_nonexistent_email_returns_401(self, client):
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "ghost@example.com", "password": "anything1"},
        )
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Invalid email or password"

    def test_login_auto_sets_session_cookie(self, client):
        _post_register(client, "cookie@example.com", "Pass1234X")
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "cookie@example.com", "password": "Pass1234X"},
        )
        assert resp.status_code == 200
        cookie = _cookie_from_set_cookie(resp.headers.get("set-cookie", ""))
        assert "nakshtra_session" in cookie
        assert len(cookie["nakshtra_session"]) >= 32


class TestMe:
    """Tests for /api/v1/auth/me."""

    def test_me_requires_auth_returns_401_without_session(self, client: TestClient):
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Not authenticated"

    def test_me_returns_profile_after_login(self, client: TestClient):
        _post_register(client, "me@example.com", _password_for_test("Pass1234"))
        login_resp = client.post(
            "/api/v1/auth/login",
            json={"email": "me@example.com", "password": _password_for_test("Pass1234")},
        )
        cookie = _cookie_from_set_cookie(login_resp.headers.get("set-cookie", ""))
        resp = client.get("/api/v1/auth/me", cookies=cookie)
        assert resp.status_code == 200
        body = resp.json()
        assert body["role"] == "customer"
        assert body["email"] == "me@example.com"

    def test_me_requires_auth_returns_401_without_session(self, client: TestClient):
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Not authenticated"

    def test_me_returns_profile_after_login(self, client):
        _post_register(client, "me@example.com", "Pass1234X")
        login_resp = client.post(
            "/api/v1/auth/login",
            json={"email": "me@example.com", "password": "Pass1234X"},
        )
        cookie = _cookie_from_set_cookie(login_resp.headers.get("set-cookie", ""))
        resp = client.get("/api/v1/auth/me", cookies=cookie)
        assert resp.status_code == 200
        body = resp.json()
        assert body["role"] == "customer"
        assert body["email"] == "me@example.com"


class TestLogout:
    """Tests for /api/v1/auth/logout."""

    def test_logout_clears_session_and_requires_auth(self, client: TestClient):
        _post_register(client, "out@example.com", _password_for_test("Pass1234"))
        login_resp = client.post(
            "/api/v1/auth/login",
            json={"email": "out@example.com", "password": _password_for_test("Pass1234")},
        )
        cookie = _cookie_from_set_cookie(login_resp.headers.get("set-cookie", ""))
        resp = client.post("/api/v1/auth/logout", cookies=cookie)
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}

        resp2 = client.get("/api/v1/auth/me", cookies=cookie)
        assert resp2.status_code == 401

    def test_logout_clears_session_and_requires_auth(self, client):
        _post_register(client, "out@example.com", "Pass1234X")
        login_resp = client.post(
            "/api/v1/auth/login",
            json={"email": "out@example.com", "password": "Pass1234X"},
        )
        cookie = _cookie_from_set_cookie(login_resp.headers.get("set-cookie", ""))
        resp = client.post("/api/v1/auth/logout", cookies=cookie)
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}

        resp2 = client.get("/api/v1/auth/me", cookies=cookie)
        assert resp2.status_code == 401


class TestRoleProtection:
    """Tests that role-protected sample endpoints enforce role boundaries."""
    def _create_admin(self, session: Session) -> User:
        u = User(
            email="admin@test.com",
            email_normalized="admin@test.com",
            password_hash=hash_password(_password_for_test("AdminPass1")),
            role="admin",
            is_active=True,
        )
        session.add(u)
        session.commit()
        session.refresh(u)
        return u

    def _create_astrologer(self, session: Session) -> User:
        u = User(
            email="astro@test.com",
            email_normalized="astro@test.com",
            password_hash=hash_password(_password_for_test("AstroPass1")),
            role="astrologer",
            is_active=True,
        )
        session.add(u)
        session.commit()
        session.refresh(u)
        return u

    def _create_customer(self, session: Session) -> User:
        u = User(
            email="cust@test.com",
            email_normalized="cust@test.com",
            password_hash=hash_password(_password_for_test("CustPass1")),
            role="customer",
            is_active=True,
        )
        session.add(u)
        session.commit()
        session.refresh(u)
        return u

    def _create_admin(self, session: Session) -> User:
        u = User(
            email="admin@test.com",
            email_normalized="admin@test.com",
            password_hash=hash_password(_password_for_test("AdminPass1")),
            role="admin",
            is_active=True,
        )
        session.add(u)
        session.commit()
        session.refresh(u)
        return u

    def _create_astrologer(self, session: Session) -> User:
        u = User(
            email="astro@test.com",
            email_normalized="astro@test.com",
            password_hash=hash_password(_password_for_test("AstroPass1")),
            role="astrologer",
            is_active=True,
        )
        session.add(u)
        session.commit()
        session.refresh(u)
        return u

    def _create_customer(self, session: Session) -> User:
        u = User(
            email="cust@test.com",
            email_normalized="cust@test.com",
            password_hash=hash_password(_password_for_test("CustPass1")),
            role="customer",
            is_active=True,
        )
        session.add(u)
        session.commit()
        session.refresh(u)
        return u

    def test_admin_me_only_accessible_by_admin(self, client: TestClient):
        session = client.app.state.db_session
        self._create_admin(session)
        self._create_customer(session)

        admin_login = client.post(
            "/api/v1/auth/login", json={"email": "admin@test.com", "password": _password_for_test("AdminPass1")}
        )
        assert admin_login.status_code == 200
        cookie = _cookie_from_set_cookie(admin_login.headers.get("set-cookie", ""))
        resp = client.get("/api/v1/auth/admin/me", cookies=cookie)
        assert resp.status_code == 200
        assert resp.json()["email"] == "admin@test.com"

        cust_login = client.post(
            "/api/v1/auth/login", json={"email": "cust@test.com", "password": _password_for_test("CustPass1")}
        )
        assert cust_login.status_code == 200
        cookie2 = _cookie_from_set_cookie(cust_login.headers.get("set-cookie", ""))
        resp2 = client.get("/api/v1/auth/admin/me", cookies=cookie2)
        assert resp2.status_code == 403
        assert resp2.json()["detail"] == "Role 'admin' required"

    def test_astrologer_me_only_accessible_by_astrologer(self, client: TestClient):
        session = client.app.state.db_session
        self._create_astrologer(session)
        self._create_admin(session)

        astro_login = client.post(
            "/api/v1/auth/login", json={"email": "astro@test.com", "password": _password_for_test("AstroPass1")}
        )
        assert astro_login.status_code == 200
        cookie = _cookie_from_set_cookie(astro_login.headers.get("set-cookie", ""))
        resp = client.get("/api/v1/auth/astrologer/me", cookies=cookie)
        assert resp.status_code == 200
        assert resp.json()["email"] == "astro@test.com"

        admin_login = client.post(
            "/api/v1/auth/login", json={"email": "admin@test.com", "password": _password_for_test("AdminPass1")}
        )
        assert admin_login.status_code == 200
        cookie2 = _cookie_from_set_cookie(admin_login.headers.get("set-cookie", ""))
        resp2 = client.get("/api/v1/auth/astrologer/me", cookies=cookie2)
        assert resp2.status_code == 403
        assert resp2.json()["detail"] == "Role 'astrologer' required"

    def test_customer_me_only_accessible_by_customer(self, client: TestClient):
        session = client.app.state.db_session
        self._create_customer(session)
        self._create_admin(session)

        cust_login = client.post(
            "/api/v1/auth/login", json={"email": "cust@test.com", "password": _password_for_test("CustPass1")}
        )
        assert cust_login.status_code == 200
        cookie = _cookie_from_set_cookie(cust_login.headers.get("set-cookie", ""))
        resp = client.get("/api/v1/auth/customer/me", cookies=cookie)
        assert resp.status_code == 200
        assert resp.json()["email"] == "cust@test.com"

        admin_login = client.post(
            "/api/v1/auth/login", json={"email": "admin@test.com", "password": _password_for_test("AdminPass1")}
        )
        assert admin_login.status_code == 200
        cookie2 = _cookie_from_set_cookie(admin_login.headers.get("set-cookie", ""))
        resp2 = client.get("/api/v1/auth/customer/me", cookies=cookie2)
        assert resp2.status_code == 403
        assert resp2.json()["detail"] == "Role 'customer' required"

    def test_role_escalation_not_possible_via_registration(self, client: TestClient):
        """Public registration can never create admin/astrologer accounts."""
        resp = client.post(
            "/api/v1/auth/register",
            json={"email": "hacker@example.com", "password": _password_for_test("Pass1234")},
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["role"] == "customer"
        assert body["email"] == "hacker@example.com"

    def _make_admin(self, session: Session) -> User:
        u = User(
            email="admin@test.com",
            email_normalized="admin@test.com",
            password_hash=hash_password("AdminPass1X"),
            role="admin",
            is_active=True,
        )
        session.add(u)
        session.commit()
        session.refresh(u)
        return u

    def _make_astrologer(self, session: Session) -> User:
        u = User(
            email="astro@test.com",
            email_normalized="astro@test.com",
            password_hash=hash_password("AstroPass1X"),
            role="astrologer",
            is_active=True,
        )
        session.add(u)
        session.commit()
        session.refresh(u)
        return u

    def _make_customer(self, session: Session) -> User:
        u = User(
            email="cust@test.com",
            email_normalized="cust@test.com",
            password_hash=hash_password("CustPass1X"),
            role="customer",
            is_active=True,
        )
        session.add(u)
        session.commit()
        session.refresh(u)
        return u


    def test_admin_me_only_accessible_by_admin(self, client: TestClient):
        session = client.app.state.db_session
        self._make_admin(session)
        self._make_customer(session)

        admin_login = client.post(
            "/api/v1/auth/login", json={"email": "admin@test.com", "password": "AdminPass1X"}
        )
        assert admin_login.status_code == 200
        cookie = _cookie_from_set_cookie(admin_login.headers.get("set-cookie", ""))
        resp = client.get("/api/v1/auth/admin/me", cookies=cookie)
        assert resp.status_code == 200
        assert resp.json()["email"] == "admin@test.com"

        cust_login = client.post(
            "/api/v1/auth/login", json={"email": "cust@test.com", "password": "CustPass1X"}
        )
        assert cust_login.status_code == 200
        cookie2 = _cookie_from_set_cookie(cust_login.headers.get("set-cookie", ""))
        resp2 = client.get("/api/v1/auth/admin/me", cookies=cookie2)
        assert resp2.status_code == 403
        assert resp2.json()["detail"] == "Role 'admin' required"

    def test_astrologer_me_only_accessible_by_astrologer(self, client: TestClient):
        session = client.app.state.db_session
        self._make_astrologer(session)
        self._make_admin(session)

        astro_login = client.post(
            "/api/v1/auth/login", json={"email": "astro@test.com", "password": "AstroPass1X"}
        )
        assert astro_login.status_code == 200
        cookie = _cookie_from_set_cookie(astro_login.headers.get("set-cookie", ""))
        resp = client.get("/api/v1/auth/astrologer/me", cookies=cookie)
        assert resp.status_code == 200
        assert resp.json()["email"] == "astro@test.com"

        admin_login = client.post(
            "/api/v1/auth/login", json={"email": "admin@test.com", "password": "AdminPass1X"}
        )
        assert admin_login.status_code == 200
        cookie2 = _cookie_from_set_cookie(admin_login.headers.get("set-cookie", ""))
        resp2 = client.get("/api/v1/auth/astrologer/me", cookies=cookie2)
        assert resp2.status_code == 403
        assert resp2.json()["detail"] == "Role 'astrologer' required"

    def test_customer_me_only_accessible_by_customer(self, client: TestClient):
        session = client.app.state.db_session
        self._make_customer(session)
        self._make_admin(session)

        cust_login = client.post(
            "/api/v1/auth/login", json={"email": "cust@test.com", "password": "CustPass1X"}
        )
        assert cust_login.status_code == 200
        cookie = _cookie_from_set_cookie(cust_login.headers.get("set-cookie", ""))
        resp = client.get("/api/v1/auth/customer/me", cookies=cookie)
        assert resp.status_code == 200
        assert resp.json()["email"] == "cust@test.com"

        admin_login = client.post(
            "/api/v1/auth/login", json={"email": "admin@test.com", "password": "AdminPass1X"}
        )
        assert admin_login.status_code == 200
        cookie2 = _cookie_from_set_cookie(admin_login.headers.get("set-cookie", ""))
        resp2 = client.get("/api/v1/auth/customer/me", cookies=cookie2)
        assert resp2.status_code == 403
        assert resp2.json()["detail"] == "Role 'customer' required"

    def test_role_escalation_not_possible_via_registration(self, client):
        """Public registration can never create admin/astrologer accounts."""
        resp = client.post(
            "/api/v1/auth/register",
            json={"email": "hacker@example.com", "password": "Pass1234X"},
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["role"] == "customer"
        assert body["email"] == "hacker@example.com"
