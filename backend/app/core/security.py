from __future__ import annotations

from passlib.context import CryptContext

_bcrypt = CryptContext(schemes=["bcrypt"], deprecated="auto")

HASH_ALGORITHM = "bcrypt"


def hash_password(plain_password: str) -> str:
    return _bcrypt.hash(plain_password)


def verify_password(plain_password: str, hashed: str) -> bool:
    """Constant-time bcrypt verification. Never returns exceptions to callers."""
    try:
        return _bcrypt.verify(plain_password, hashed)
    except Exception:
        return False


def normalize_email(email: str) -> str:
    """Lowercase email (RFC 5321 permits mailbox-local-part case sensitivity,
    but most providers and platforms treat emails as case-insensitive; using
    lowercase for lookups and DB uniqueness avoids duplicates like A@b.C vs a@b.c)."""
    return email.strip().lower()


TOKEN_HEADER_SCHEME = "Bearer"