"""Tests: inactive user can't login, logout clears session, session expiry."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import _make_session_id, _now, _session_store
from app.core.security import hash_password, normalize_email, verify_password
from app.models.user import User


def _password_for_test(plain: str) -> str:
    encoded = plain.encode("utf-8")
    if len(encoded) > 72:
        return plain[:72]
    if len(encoded) < 8:
        return plain + "X" * (8 - len(encoded))
    return plain


def _cookie_from_set_cookie(header_value: str) -> dict[str, str]:
    if not header_value:
        return {}
    pair = header_value.split(";", 1)[0]
    name, value = pair.split("=", 1)
    return {name: value}


def _post_register(client: TestClient, email: str, password: str) -> dict:
    resp = client.post("/api/v1/auth/register", json={"email": email, "password": password})
    assert resp.status_code == 201, f"register failed: {resp.status_code} {resp.text}"
    return resp.json()


def _post_login(client: TestClient, email: str, password: str) -> dict:
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"login failed: {resp.status_code} {resp.text}"
    return resp.json()


def _password_for_test(plain: str) -> str:
    encoded = plain.encode("utf-8")
    if len(encoded) > 72:
        return plain[:72]
    if len(encoded) < 8:
        return plain + "X" * (8 - len(encoded))
    return plain


class TestInactiveUser:
    """Inactive users must not be able to authenticate."""
    def test_inactive_user_cannot_login(self, client: TestClient, db_session: Session):
        inactive = User(
            email="inactive@test.com",
            email_normalized="inactive@test.com",
            password_hash=hash_password(_password_for_test("InactivePass1")),
            role="customer",
            is_active=False,
        )
        db_session.add(inactive)
        db_session.commit()
        db_session.refresh(inactive)

        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "inactive@test.com", "password": _password_for_test("InactivePass1")},
        )
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Invalid email or password"

    def test_inactive_user_cannot_login(self, client: TestClient, db_session: Session):
        inactive = User(
            email="inactive@test.com",
            email_normalized="inactive@test.com",
            password_hash=hash_password("InactivePass1X"),
            role="customer",
            is_active=False,
        )
        db_session.add(inactive)
        db_session.commit()
        db_session.refresh(inactive)

        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "inactive@test.com", "password": "InactivePass1"},
        )
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Invalid email or password"


class TestSessionLifecycle:
    """Tests for session lifecycle: creation, logout, expiry."""
    def test_me_401_without_session(self, client: TestClient):
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    def test_logout_invalidates_session(self, client: TestClient, db_session: Session):
        user = User(
            email="out@test.com",
            email_normalized="out@test.com",
            password_hash=hash_password(_password_for_test("OutPass1")),
            role="customer",
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        login_resp = client.post(
            "/api/v1/auth/login",
            json={"email": "out@test.com", "password": _password_for_test("OutPass1")},
        )
        assert login_resp.status_code == 200
        cookie = _cookie_from_set_cookie(login_resp.headers.get("set-cookie", ""))

        resp = client.get("/api/v1/auth/me", cookies=cookie)
        assert resp.status_code == 200

        logout_resp = client.post("/api/v1/auth/logout", cookies=cookie)
        assert logout_resp.status_code == 200
        assert logout_resp.json() == {"ok": True}

        resp2 = client.get("/api/v1/auth/me", cookies=cookie)
        assert resp2.status_code == 401

    def test_session_expired_returns_401(self, client: TestClient, db_session: Session):
        user = User(
            email="expire@test.com",
            email_normalized="expire@test.com",
            password_hash=hash_password(_password_for_test("ExpirePass1")),
            role="customer",
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        login_resp = client.post(
            "/api/v1/auth/login",
            json={"email": "expire@test.com", "password": _password_for_test("ExpirePass1")},
        )
        assert login_resp.status_code == 200
        cookie = _cookie_from_set_cookie(login_resp.headers.get("set-cookie", ""))

        session_id = cookie.get("nakshtra_session")
        if session_id:
            entry = _session_store.get(session_id)
            if entry:
                entry["expires_at"] = _now() - timedelta(seconds=1)
                _session_store.set(session_id, entry["user_id"], entry["role"], entry["expires_at"])

        resp = client.get("/api/v1/auth/me", cookies=cookie)
        assert resp.status_code == 401

    def test_me_401_without_session(self, client: TestClient):
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    def test_logout_invalidates_session(self, client: TestClient, db_session: Session):
        user = User(
            email="out@test.com",
            email_normalized="out@test.com",
            password_hash=hash_password("OutPass1X"),
            role="customer",
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        login_resp = client.post(
            "/api/v1/auth/login",
            json={"email": "out@test.com", "password": "OutPass1X"},
        )
        assert login_resp.status_code == 200
        cookie = _cookie_from_set_cookie(login_resp.headers.get("set-cookie", ""))

        resp = client.get("/api/v1/auth/me", cookies=cookie)
        assert resp.status_code == 200

        logout_resp = client.post("/api/v1/auth/logout", cookies=cookie)
        assert logout_resp.status_code == 200
        assert logout_resp.json() == {"ok": True}

        resp2 = client.get("/api/v1/auth/me", cookies=cookie)
        assert resp2.status_code == 401

    def test_session_expired_returns_401(self, client: TestClient, db_session: Session):
        user = User(
            email="expire@test.com",
            email_normalized="expire@test.com",
            password_hash=hash_password("ExpirePass1X"),
            role="customer",
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        login_resp = client.post(
            "/api/v1/auth/login",
            json={"email": "expire@test.com", "password": "ExpirePass1X"},
        )
        assert login_resp.status_code == 200
        cookie = _cookie_from_set_cookie(login_resp.headers.get("set-cookie", ""))

        # manually expire the session in the in-memory store
        session_id = cookie.get("nakshtra_session")
        if session_id:
            entry = _session_store.get(session_id)
            if entry:
                entry["expires_at"] = _now() - timedelta(seconds=1)
                _session_store.set(session_id, entry["user_id"], entry["role"], entry["expires_at"])

        resp = client.get("/api/v1/auth/me", cookies=cookie)
        assert resp.status_code == 401
