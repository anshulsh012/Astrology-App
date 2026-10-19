"""Phase 2 tests: astrologer dashboard (profile CRUD, validation, authz).

Covers: profile creation and updates, validation failures, unauthorized
profile modifications, submit-for-review state machine, and persistence.
"""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.astrologer import AstrologerProfile
from tests.phase2_helpers import (
    DEFAULT_PASSWORD,
    create_user,
    login,
    seed_profile,
    valid_profile_payload,
)

PROFILE_URL = "/api/v1/astrologer/profile"
SUBMIT_URL = "/api/v1/astrologer/profile/submit"


class TestProfileCreation:
    def test_astrologer_creates_profile_and_sees_draft_status(self, client: TestClient, db_session: Session):
        create_user(db_session, "meera@test.com", "astrologer")
        cookies = login(client, "meera@test.com")

        resp = client.post(PROFILE_URL, json=valid_profile_payload(), cookies=cookies)
        assert resp.status_code == 201, resp.text
        body = resp.json()
        assert body["display_name"] == "Guru Meera"
        assert body["approval_status"] == "draft"
        # Languages/specialties are stored in canonical alphabetical order.
        assert body["languages"] == ["English", "Hindi"]
        assert body["specialties"] == ["Kundli"]
        assert body["consultation_modes"] == ["chat"]
        # Money is serialized exactly, never as a float artefact.
        assert body["chat_rate"] == "12.50"
        assert body["min_rate_per_minute"] == "12.50"
        assert body["audio_rate"] is None and body["video_rate"] is None

    def test_profile_is_persisted_in_the_database(self, client: TestClient, db_session: Session):
        user = create_user(db_session, "persist@test.com", "astrologer")
        cookies = login(client, "persist@test.com")

        resp = client.post(PROFILE_URL, json=valid_profile_payload(), cookies=cookies)
        assert resp.status_code == 201

        db_session.expire_all()
        stored = db_session.query(AstrologerProfile).filter_by(user_id=user.id).one()
        assert stored.display_name == "Guru Meera"
        assert stored.approval_status == "draft"
        assert [entry.language for entry in stored.languages] == ["English", "Hindi"]

    def test_get_profile_404_before_creation(self, client: TestClient, db_session: Session):
        create_user(db_session, "none@test.com", "astrologer")
        cookies = login(client, "none@test.com")

        resp = client.get(PROFILE_URL, cookies=cookies)
        assert resp.status_code == 404

    def test_second_profile_is_rejected(self, client: TestClient, db_session: Session):
        create_user(db_session, "dupe@test.com", "astrologer")
        cookies = login(client, "dupe@test.com")

        assert client.post(PROFILE_URL, json=valid_profile_payload(), cookies=cookies).status_code == 201
        resp = client.post(PROFILE_URL, json=valid_profile_payload(), cookies=cookies)
        assert resp.status_code == 409


class TestProfileValidation:
    def _create_then_patch(self, client: TestClient, cookies: dict, **overrides):
        payload = valid_profile_payload(**overrides)
        return client.patch(PROFILE_URL, json=payload, cookies=cookies)

    def test_invalid_payloads_are_rejected(self, client: TestClient, db_session: Session):
        create_user(db_session, "invalid@test.com", "astrologer")
        cookies = login(client, "invalid@test.com")

        cases = [
            {"display_name": "A"},  # too short
            {"bio": "too short"},  # under 20 chars
            {"years_experience": -1},
            {"years_experience": 200},
            {"languages": []},  # at least one required
            {"languages": ["  "]},
            {"specialties": []},
            {"profile_image_url": "ftp://example.com/x.png"},
            {"chat_enabled": True, "chat_rate": None},  # enabled mode needs a rate
            {"chat_enabled": True, "chat_rate": "0"},  # rate must be > 0
            {"chat_rate": "-5"},
            {"chat_rate": "10.123"},  # more than two decimals
            {"available_from": "18:00", "available_to": "09:00"},
        ]
        for overrides in cases:
            resp = client.post(PROFILE_URL, json=valid_profile_payload(**overrides), cookies=cookies)
            assert resp.status_code == 422, f"expected 422 for {overrides}, got {resp.status_code}"
            # Only one profile can exist: every rejected create left nothing behind.
            resp = client.get(PROFILE_URL, cookies=cookies)
            assert resp.status_code == 404

    def test_languages_are_deduplicated_and_trimmed(self, client: TestClient, db_session: Session):
        create_user(db_session, "dedupe@test.com", "astrologer")
        cookies = login(client, "dedupe@test.com")

        resp = client.post(
            PROFILE_URL,
            json=valid_profile_payload(languages=[" Hindi ", "hindi", "English", "  "]),
            cookies=cookies,
        )
        assert resp.status_code == 201
        assert resp.json()["languages"] == ["English", "Hindi"]

    def test_too_many_languages_rejected(self, client: TestClient, db_session: Session):
        create_user(db_session, "many@test.com", "astrologer")
        cookies = login(client, "many@test.com")

        resp = client.post(
            PROFILE_URL,
            json=valid_profile_payload(languages=[f"Lang{i}" for i in range(15)]),
            cookies=cookies,
        )
        assert resp.status_code == 422


class TestProfileUpdates:
    def test_patch_updates_only_given_fields(self, client: TestClient, db_session: Session):
        create_user(db_session, "patch@test.com", "astrologer")
        cookies = login(client, "patch@test.com")
        assert client.post(PROFILE_URL, json=valid_profile_payload(), cookies=cookies).status_code == 201

        resp = client.patch(PROFILE_URL, json={"years_experience": 12}, cookies=cookies)
        assert resp.status_code == 200
        body = resp.json()
        assert body["years_experience"] == 12
        assert body["display_name"] == "Guru Meera"  # untouched

        db_session.expire_all()
        stored = db_session.query(AstrologerProfile).one()
        assert stored.years_experience == 12

    def test_patch_can_update_rates_and_modes(self, client: TestClient, db_session: Session):
        create_user(db_session, "rates@test.com", "astrologer")
        cookies = login(client, "rates@test.com")
        client.post(PROFILE_URL, json=valid_profile_payload(), cookies=cookies)

        resp = client.patch(
            PROFILE_URL,
            json={
                "chat_rate": "9.00",
                "audio_enabled": True,
                "audio_rate": "15.50",
                "video_enabled": True,
                "video_rate": "25.00",
            },
            cookies=cookies,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["consultation_modes"] == ["chat", "audio", "video"]
        assert body["min_rate_per_minute"] == "9.00"

    def test_patch_disabling_a_mode_clears_its_rate_requirement(self, client: TestClient, db_session: Session):
        create_user(db_session, "disable@test.com", "astrologer")
        cookies = login(client, "disable@test.com")
        client.post(PROFILE_URL, json=valid_profile_payload(), cookies=cookies)

        resp = client.patch(
            PROFILE_URL,
            json={"chat_enabled": False, "chat_rate": None},
            cookies=cookies,
        )
        assert resp.status_code == 200
        assert resp.json()["consultation_modes"] == []

    def test_patch_rejects_invalid_merged_state(self, client: TestClient, db_session: Session):
        """A rate of 0 while the mode stays enabled is invalid even via PATCH."""
        create_user(db_session, "merged@test.com", "astrologer")
        cookies = login(client, "merged@test.com")
        client.post(PROFILE_URL, json=valid_profile_payload(), cookies=cookies)

        resp = client.patch(PROFILE_URL, json={"chat_rate": "0"}, cookies=cookies)
        assert resp.status_code == 422

    def test_patch_without_fields_is_rejected(self, client: TestClient, db_session: Session):
        create_user(db_session, "empty@test.com", "astrologer")
        cookies = login(client, "empty@test.com")
        client.post(PROFILE_URL, json=valid_profile_payload(), cookies=cookies)

        resp = client.patch(PROFILE_URL, json={}, cookies=cookies)
        assert resp.status_code == 422

    def test_patch_404_when_profile_missing(self, client: TestClient, db_session: Session):
        create_user(db_session, "nopatch@test.com", "astrologer")
        cookies = login(client, "nopatch@test.com")

        resp = client.patch(PROFILE_URL, json={"years_experience": 3}, cookies=cookies)
        assert resp.status_code == 404


class TestProfileAuthorization:
    def test_unauthenticated_requests_are_rejected(self, client: TestClient):
        for method, url in (("get", PROFILE_URL), ("post", PROFILE_URL), ("patch", PROFILE_URL), ("post", SUBMIT_URL)):
            if method == "get":
                resp = client.get(url)
            else:
                resp = getattr(client, method)(url, json=valid_profile_payload())
            assert resp.status_code == 401, f"{method.upper()} {url} -> {resp.status_code}"

    def test_customers_cannot_use_the_dashboard(self, client: TestClient, db_session: Session):
        create_user(db_session, "cust@test.com", "customer")
        cookies = login(client, "cust@test.com")

        resp = client.get(PROFILE_URL, cookies=cookies)
        assert resp.status_code == 403
        resp = client.post(PROFILE_URL, json=valid_profile_payload(), cookies=cookies)
        assert resp.status_code == 403

    def test_admins_cannot_use_the_dashboard(self, client: TestClient, db_session: Session):
        create_user(db_session, "adminx@test.com", "admin")
        cookies = login(client, "adminx@test.com")

        resp = client.get(PROFILE_URL, cookies=cookies)
        assert resp.status_code == 403

    def test_astrologers_only_touch_their_own_profile(self, client: TestClient, db_session: Session):
        """Each session only ever reads/writes the profile of its own user."""
        alice = create_user(db_session, "alice@test.com", "astrologer")
        bob = create_user(db_session, "bob@test.com", "astrologer")
        seed_profile(db_session, alice, display_name="Alice Charts", status="approved")
        seed_profile(db_session, bob, display_name="Bob Charts", status="approved")

        bob_cookies = login(client, "bob@test.com")
        resp = client.get(PROFILE_URL, cookies=bob_cookies)
        assert resp.status_code == 200
        assert resp.json()["display_name"] == "Bob Charts"

        resp = client.patch(PROFILE_URL, json={"display_name": "Hijacked"}, cookies=bob_cookies)
        assert resp.status_code == 200

        db_session.expire_all()
        alice_profile = db_session.query(AstrologerProfile).filter_by(user_id=alice.id).one()
        bob_profile = db_session.query(AstrologerProfile).filter_by(user_id=bob.id).one()
        assert alice_profile.display_name == "Alice Charts"
        assert bob_profile.display_name == "Hijacked"


class TestSubmitForReview:
    def test_draft_can_be_submitted(self, client: TestClient, db_session: Session):
        create_user(db_session, "submit@test.com", "astrologer")
        cookies = login(client, "submit@test.com")
        client.post(PROFILE_URL, json=valid_profile_payload(), cookies=cookies)

        resp = client.post(SUBMIT_URL, cookies=cookies)
        assert resp.status_code == 200
        body = resp.json()
        assert body["approval_status"] == "pending"
        assert body["submitted_at"] is not None

    def test_pending_profile_cannot_be_submitted_twice(self, client: TestClient, db_session: Session):
        create_user(db_session, "twice@test.com", "astrologer")
        cookies = login(client, "twice@test.com")
        client.post(PROFILE_URL, json=valid_profile_payload(), cookies=cookies)
        assert client.post(SUBMIT_URL, cookies=cookies).status_code == 200

        resp = client.post(SUBMIT_URL, cookies=cookies)
        assert resp.status_code == 409

    def test_approved_profile_cannot_be_resubmitted(self, client: TestClient, db_session: Session):
        user = create_user(db_session, "approved@test.com", "astrologer")
        seed_profile(db_session, user, status="approved")
        cookies = login(client, "approved@test.com")

        resp = client.post(SUBMIT_URL, cookies=cookies)
        assert resp.status_code == 409

    def test_submission_without_modes_is_rejected(self, client: TestClient, db_session: Session):
        create_user(db_session, "nomodes@test.com", "astrologer")
        cookies = login(client, "nomodes@test.com")
        client.post(
            PROFILE_URL,
            json=valid_profile_payload(chat_enabled=False, chat_rate=None),
            cookies=cookies,
        )

        resp = client.post(SUBMIT_URL, cookies=cookies)
        assert resp.status_code == 422

    def test_rejected_profile_can_be_resubmitted_and_clears_old_feedback(
        self, client: TestClient, db_session: Session
    ):
        user = create_user(db_session, "resubmit@test.com", "astrologer")
        seed_profile(
            db_session,
            user,
            status="rejected",
            rejection_reason="Bio needs more credentials.",
        )
        cookies = login(client, "resubmit@test.com")

        resp = client.post(SUBMIT_URL, cookies=cookies)
        assert resp.status_code == 200
        body = resp.json()
        assert body["approval_status"] == "pending"
        assert body["rejection_reason"] is None
