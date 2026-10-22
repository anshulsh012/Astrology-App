"""Shared helpers for Phase 2 astrologer tests.

Kept out of conftest.py so Phase 1 fixtures stay untouched.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.astrologer import AstrologerLanguage, AstrologerProfile, AstrologerSpecialty
from app.models.user import User

DEFAULT_PASSWORD = "Passw0rd!1"


def create_user(
    session: Session,
    email: str,
    role: str,
    password: str = DEFAULT_PASSWORD,
) -> User:
    """Create an active user with the given role and return it."""
    user = User(
        email=email,
        email_normalized=email.strip().lower(),
        password_hash=hash_password(password),
        role=role,
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def login(client: TestClient, email: str, password: str = DEFAULT_PASSWORD) -> dict[str, str]:
    """Log in through the API and return the session cookie mapping."""
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"login failed: {resp.status_code} {resp.text}"
    pair = resp.headers.get("set-cookie", "").split(";", 1)[0]
    name, _, value = pair.partition("=")
    return {name: value}


def valid_profile_payload(**overrides: Any) -> dict[str, Any]:
    """A valid create/update payload; override fields per test."""
    base: dict[str, Any] = {
        "display_name": "Guru Meera",
        "bio": "Vedic astrologer guiding seekers through charts for years.",
        "years_experience": 6,
        "languages": ["Hindi", "English"],
        "specialties": ["Kundli"],
        "chat_enabled": True,
        "chat_rate": "12.50",
    }
    base.update(overrides)
    return base


def seed_profile(
    session: Session,
    user: User,
    *,
    status: str = "approved",
    **overrides: Any,
) -> AstrologerProfile:
    """Insert a profile directly through the ORM (bypasses API validation)."""
    data: dict[str, Any] = {
        "display_name": f"Astro {user.id}",
        "bio": "Seeded profile used by the Phase 2 backend test-suite.",
        "years_experience": 5,
        "chat_enabled": True,
        "chat_rate": Decimal("10.00"),
        "approval_status": status,
    }
    data.update(overrides)
    languages = data.pop("languages", ["Hindi"])
    specialties = data.pop("specialties", ["Vedic"])

    profile = AstrologerProfile(user_id=user.id, **data)
    profile.languages = [AstrologerLanguage(language=item) for item in languages]
    profile.specialties = [AstrologerSpecialty(specialty=item) for item in specialties]
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile
