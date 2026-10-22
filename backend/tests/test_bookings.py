"""Phase 4 booking tests: auth, create, overlap, cancellation, privacy."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, time, timedelta, timezone
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.booking import Booking
from tests.phase2_helpers import create_user, login, seed_profile

CREATE_URL = "/api/v1/bookings"


def _future_window(hours: int = 48, minutes: int = 30) -> tuple[str, str]:
    """Pick a UTC slot that always sits inside the seeded 09:00–18:00 window."""
    now = datetime.now(timezone.utc).replace(microsecond=0)
    start = (now + timedelta(hours=hours)).replace(hour=10, minute=0, second=0)
    if start <= now:
        start += timedelta(days=1)
    end = start + timedelta(minutes=minutes)
    return start.isoformat(), end.isoformat()


def _payload(profile_id: int, **overrides):
    start, end = _future_window()
    body = {
        "astrologer_profile_id": profile_id,
        "mode": "chat",
        "start_at": start,
        "end_at": end,
    }
    body.update(overrides)
    return body


def _approved_profile(db_session: Session, email: str = "astro@test.com", **overrides):
    user = create_user(db_session, email, "astrologer")
    return seed_profile(
        db_session,
        user,
        status="approved",
        display_name="Guru Meera",
        chat_enabled=True,
        chat_rate=Decimal("12.50"),
        is_available=True,
        available_from=time(9, 0),
        available_to=time(18, 0),
        timezone_name="UTC",
        **overrides,
    )


class TestAuthorization:
    def test_create_requires_authentication(self, client: TestClient, db_session: Session):
        profile = _approved_profile(db_session)
        resp = client.post(CREATE_URL, json=_payload(profile.id))
        assert resp.status_code == 401

    def test_astrologer_cannot_create(self, client: TestClient, db_session: Session):
        profile = _approved_profile(db_session)
        cookies = login(client, "astro@test.com")
        resp = client.post(CREATE_URL, json=_payload(profile.id), cookies=cookies)
        assert resp.status_code == 403

    def test_customer_cannot_list_astrologer_queue(self, client: TestClient, db_session: Session):
        create_user(db_session, "cust@test.com", "customer")
        cookies = login(client, "cust@test.com")
        resp = client.get("/api/v1/bookings/astrologer/me", cookies=cookies)
        assert resp.status_code == 403

    def test_customer_cannot_accept(self, client: TestClient, db_session: Session):
        profile = _approved_profile(db_session)
        create_user(db_session, "cust@test.com", "customer")
        customer = login(client, "cust@test.com")
        created = client.post(CREATE_URL, json=_payload(profile.id), cookies=customer)
        assert created.status_code == 201
        booking_id = created.json()["id"]
        resp = client.post(f"/api/v1/bookings/{booking_id}/accept", cookies=customer)
        assert resp.status_code == 403


class TestCreateAndRetrieve:
    def test_customer_creates_pending_booking_with_server_price(self, client: TestClient, db_session: Session):
        profile = _approved_profile(db_session)
        create_user(db_session, "cust@test.com", "customer")
        cookies = login(client, "cust@test.com")
        resp = client.post(CREATE_URL, json=_payload(profile.id, topic="Kundli"), cookies=cookies)
        assert resp.status_code == 201, resp.text
        body = resp.json()
        assert body["status"] == "pending"
        assert body["mode"] == "chat"
        assert body["duration_minutes"] == 30
        assert body["rate_per_minute"] == "12.50"
        assert body["quoted_total"] == "375.00"
        assert body["astrologer_name"] == "Guru Meera"
        assert body["topic"] == "Kundli"
        persisted = db_session.get(Booking, body["id"])
        assert persisted is not None
        assert persisted.customer_id != profile.user_id
        assert persisted.quoted_total == Decimal("375.00")

    def test_customer_lists_own_bookings(self, client: TestClient, db_session: Session):
        profile = _approved_profile(db_session)
        create_user(db_session, "cust@test.com", "customer")
        cookies = login(client, "cust@test.com")
        created = client.post(CREATE_URL, json=_payload(profile.id), cookies=cookies)
        resp = client.get("/api/v1/bookings/me", cookies=cookies)
        assert resp.status_code == 200
        assert resp.json()["total"] == 1
        assert resp.json()["items"][0]["id"] == created.json()["id"]


class TestValidation:
    def test_past_start_is_rejected(self, client: TestClient, db_session: Session):
        profile = _approved_profile(db_session)
        create_user(db_session, "cust@test.com", "customer")
        cookies = login(client, "cust@test.com")
        start = datetime.now(timezone.utc) - timedelta(hours=1)
        end = start + timedelta(minutes=30)
        resp = client.post(
            CREATE_URL,
            json=_payload(profile.id, start_at=start.isoformat(), end_at=end.isoformat()),
            cookies=cookies,
        )
        assert resp.status_code == 422

    def test_naive_timestamp_is_rejected(self, client: TestClient, db_session: Session):
        profile = _approved_profile(db_session)
        create_user(db_session, "cust@test.com", "customer")
        cookies = login(client, "cust@test.com")
        resp = client.post(
            CREATE_URL,
            json=_payload(profile.id, start_at="2026-12-01T10:00:00", end_at="2026-12-01T10:30:00"),
            cookies=cookies,
        )
        assert resp.status_code == 422

    def test_unapproved_astrologer_cannot_be_booked(self, client: TestClient, db_session: Session):
        user = create_user(db_session, "draft@test.com", "astrologer")
        profile = seed_profile(db_session, user, status="draft", chat_enabled=True, chat_rate=Decimal("10.00"))
        create_user(db_session, "cust@test.com", "customer")
        cookies = login(client, "cust@test.com")
        resp = client.post(CREATE_URL, json=_payload(profile.id), cookies=cookies)
        assert resp.status_code == 409
        assert "not accepting" in resp.json()["detail"].lower()

    def test_disabled_mode_is_rejected(self, client: TestClient, db_session: Session):
        profile = _approved_profile(db_session, video_enabled=False)
        create_user(db_session, "cust@test.com", "customer")
        cookies = login(client, "cust@test.com")
        resp = client.post(CREATE_URL, json=_payload(profile.id, mode="video"), cookies=cookies)
        assert resp.status_code == 422


class TestOverlapAndConcurrency:
    def test_customer_cannot_stack_overlapping_pending(self, client: TestClient, db_session: Session):
        profile = _approved_profile(db_session)
        create_user(db_session, "cust@test.com", "customer")
        cookies = login(client, "cust@test.com")
        first = client.post(CREATE_URL, json=_payload(profile.id), cookies=cookies)
        assert first.status_code == 201
        second = client.post(CREATE_URL, json=_payload(profile.id), cookies=cookies)
        assert second.status_code == 409

    def test_accept_blocks_overlapping_confirmations(self, client: TestClient, db_session: Session):
        profile = _approved_profile(db_session)
        create_user(db_session, "cust1@test.com", "customer")
        create_user(db_session, "cust2@test.com", "customer")
        astro = login(client, "astro@test.com")
        one = login(client, "cust1@test.com")
        two = login(client, "cust2@test.com")
        payload = _payload(profile.id)
        a = client.post(CREATE_URL, json=payload, cookies=one)
        b = client.post(CREATE_URL, json=payload, cookies=two)
        assert a.status_code == 201
        assert b.status_code == 201
        first = client.post(f"/api/v1/bookings/{a.json()['id']}/accept", cookies=astro)
        second = client.post(f"/api/v1/bookings/{b.json()['id']}/accept", cookies=astro)
        assert first.status_code == 200
        assert second.status_code == 409

    def test_concurrent_creates_do_not_double_confirm(self, client: TestClient, db_session: Session):
        profile = _approved_profile(db_session)
        create_user(db_session, "cust1@test.com", "customer")
        create_user(db_session, "cust2@test.com", "customer")
        cookies = [login(client, "cust1@test.com"), login(client, "cust2@test.com")]
        payload = _payload(profile.id)

        def create(cookie):
            return client.post(CREATE_URL, json=payload, cookies=cookie)

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(create, cookies))
        codes = sorted(resp.status_code for resp in results)
        assert codes[0] in (201, 409)
        assert codes[1] in (201, 409)
        rows = db_session.execute(select(Booking)).scalars().all()
        pending = [row for row in rows if row.status == "pending"]
        assert len(pending) <= 2


class TestCancelAndTransitions:
    def test_customer_cancels_pending(self, client: TestClient, db_session: Session):
        profile = _approved_profile(db_session)
        create_user(db_session, "cust@test.com", "customer")
        cookies = login(client, "cust@test.com")
        created = client.post(CREATE_URL, json=_payload(profile.id), cookies=cookies)
        booking_id = created.json()["id"]
        resp = client.post(f"/api/v1/bookings/{booking_id}/cancel", cookies=cookies)
        assert resp.status_code == 200
        assert resp.json()["status"] == "cancelled"
        again = client.post(f"/api/v1/bookings/{booking_id}/cancel", cookies=cookies)
        assert again.status_code == 409

    def test_reject_then_accept_is_invalid(self, client: TestClient, db_session: Session):
        profile = _approved_profile(db_session)
        create_user(db_session, "cust@test.com", "customer")
        astro = login(client, "astro@test.com")
        customer = login(client, "cust@test.com")
        created = client.post(CREATE_URL, json=_payload(profile.id), cookies=customer)
        booking_id = created.json()["id"]
        rejected = client.post(f"/api/v1/bookings/{booking_id}/reject", cookies=astro)
        assert rejected.status_code == 200
        accepted = client.post(f"/api/v1/bookings/{booking_id}/accept", cookies=astro)
        assert accepted.status_code == 409


class TestPrivacy:
    def test_stranger_gets_404_not_403(self, client: TestClient, db_session: Session):
        profile = _approved_profile(db_session)
        create_user(db_session, "cust@test.com", "customer")
        create_user(db_session, "other@test.com", "customer")
        owner = login(client, "cust@test.com")
        stranger = login(client, "other@test.com")
        created = client.post(CREATE_URL, json=_payload(profile.id), cookies=owner)
        booking_id = created.json()["id"]
        resp = client.get(f"/api/v1/bookings/{booking_id}", cookies=stranger)
        assert resp.status_code == 404
        listed = client.get("/api/v1/bookings/me", cookies=stranger)
        assert listed.json()["total"] == 0

    def test_payload_masks_customer_email(self, client: TestClient, db_session: Session):
        profile = _approved_profile(db_session)
        create_user(db_session, "cust@test.com", "customer")
        astro = login(client, "astro@test.com")
        customer = login(client, "cust@test.com")
        created = client.post(CREATE_URL, json=_payload(profile.id), cookies=customer)
        listed = client.get("/api/v1/bookings/astrologer/me", cookies=astro)
        assert listed.status_code == 200
        item = listed.json()["items"][0]
        assert item["id"] == created.json()["id"]
        assert "cust@test.com" not in item["customer_ref"]
        assert "****@" in item["customer_ref"]


class TestAvailability:
    def test_public_slots_use_server_rate(self, client: TestClient, db_session: Session):
        profile = _approved_profile(db_session)
        day = (datetime.now(timezone.utc) + timedelta(days=2)).date().isoformat()
        resp = client.get(
            f"/api/v1/bookings/availability/{profile.id}",
            params={"day": day, "mode": "chat", "duration_minutes": 30},
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["astrologer_profile_id"] == profile.id
        assert body["slots"]
        assert body["slots"][0]["rate_per_minute"] == "12.50"
        assert body["slots"][0]["quoted_total"] == "375.00"
