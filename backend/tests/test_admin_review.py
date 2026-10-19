"""Phase 2 tests: admin review of astrologer applications.

Covers: admin-only approval actions, rejection reasons, listing/filtering
applications, and the fact that an astrologer cannot approve their own
profile.
"""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.astrologer import AstrologerProfile
from tests.phase2_helpers import create_user, login, seed_profile

APPLICATIONS_URL = "/api/v1/admin/astrologers/applications"


def _detail_url(profile_id: int) -> str:
    return f"/api/v1/admin/astrologers/{profile_id}"


def _approve_url(profile_id: int) -> str:
    return f"/api/v1/admin/astrologers/{profile_id}/approve"


def _reject_url(profile_id: int) -> str:
    return f"/api/v1/admin/astrologers/{profile_id}/reject"


class TestAdminOnlyAccess:
    def test_unauthenticated_requests_are_rejected(self, client: TestClient):
        assert client.get(APPLICATIONS_URL).status_code == 401
        assert client.post(_approve_url(1)).status_code == 401
        assert client.post(_reject_url(1), json={"reason": "Not enough detail"}).status_code == 401

    def test_customers_cannot_review_applications(self, client: TestClient, db_session: Session):
        create_user(db_session, "cust@test.com", "customer")
        cookies = login(client, "cust@test.com")

        assert client.get(APPLICATIONS_URL, cookies=cookies).status_code == 403
        assert client.post(_approve_url(1), cookies=cookies).status_code == 403

    def test_astrologer_cannot_approve_own_profile(self, client: TestClient, db_session: Session):
        user = create_user(db_session, "sneaky@test.com", "astrologer")
        profile = seed_profile(db_session, user, status="pending")
        cookies = login(client, "sneaky@test.com")

        assert client.get(_detail_url(profile.id), cookies=cookies).status_code == 403
        assert client.post(_approve_url(profile.id), cookies=cookies).status_code == 403
        assert (
            client.post(_reject_url(profile.id), json={"reason": "nope nope"}, cookies=cookies).status_code
            == 403
        )

        # The self-approval attempt changed nothing.
        db_session.expire_all()
        stored = db_session.get(AstrologerProfile, profile.id)
        assert stored.approval_status == "pending"


class TestApplicationListing:
    def test_admin_lists_pending_applications_only(self, client: TestClient, db_session: Session):
        create_user(db_session, "admin@test.com", "admin")
        pending_user = create_user(db_session, "pend@test.com", "astrologer")
        approved_user = create_user(db_session, "appr@test.com", "astrologer")
        seed_profile(db_session, pending_user, status="pending")
        seed_profile(db_session, approved_user, status="approved")

        cookies = login(client, "admin@test.com")
        body = client.get(APPLICATIONS_URL, cookies=cookies).json()

        assert body["total"] == 1
        assert [item["approval_status"] for item in body["items"]] == ["pending"]
        assert body["page"] == 1 and body["has_prev"] is False

    def test_status_filter_all_returns_every_application(self, client: TestClient, db_session: Session):
        create_user(db_session, "admin@test.com", "admin")
        for index, status in enumerate(("draft", "pending", "approved", "rejected")):
            user = create_user(db_session, f"user{index}@test.com", "astrologer")
            seed_profile(db_session, user, status=status)

        cookies = login(client, "admin@test.com")
        body = client.get(APPLICATIONS_URL, params={"status": "all"}, cookies=cookies).json()
        assert body["total"] == 4

        body = client.get(APPLICATIONS_URL, params={"status": "rejected"}, cookies=cookies).json()
        assert body["total"] == 1
        assert body["items"][0]["approval_status"] == "rejected"

    def test_invalid_status_filter_is_rejected(self, client: TestClient, db_session: Session):
        create_user(db_session, "admin@test.com", "admin")
        cookies = login(client, "admin@test.com")

        resp = client.get(APPLICATIONS_URL, params={"status": "banana"}, cookies=cookies)
        assert resp.status_code == 422

    def test_pagination_metadata_is_consistent(self, client: TestClient, db_session: Session):
        create_user(db_session, "admin@test.com", "admin")
        for index in range(5):
            user = create_user(db_session, f"page{index}@test.com", "astrologer")
            seed_profile(db_session, user, status="pending")

        cookies = login(client, "admin@test.com")
        first = client.get(APPLICATIONS_URL, params={"page": 1, "page_size": 2}, cookies=cookies).json()
        assert first["total"] == 5
        assert first["total_pages"] == 3
        assert len(first["items"]) == 2
        assert first["has_next"] is True and first["has_prev"] is False

        last = client.get(APPLICATIONS_URL, params={"page": 3, "page_size": 2}, cookies=cookies).json()
        assert len(last["items"]) == 1
        assert last["has_next"] is False and last["has_prev"] is True

    def test_application_detail_includes_applicant_email(self, client: TestClient, db_session: Session):
        create_user(db_session, "admin@test.com", "admin")
        user = create_user(db_session, "applicant@test.com", "astrologer")
        profile = seed_profile(db_session, user, status="pending")
        cookies = login(client, "admin@test.com")

        body = client.get(_detail_url(profile.id), cookies=cookies).json()
        assert body["applicant_email"] == "applicant@test.com"
        assert body["user_id"] == user.id

    def test_unknown_application_returns_404(self, client: TestClient, db_session: Session):
        create_user(db_session, "admin@test.com", "admin")
        cookies = login(client, "admin@test.com")

        assert client.get(_detail_url(999999), cookies=cookies).status_code == 404


class TestApprovalActions:
    def test_admin_approves_pending_application(self, client: TestClient, db_session: Session):
        admin = create_user(db_session, "admin@test.com", "admin")
        user = create_user(db_session, "pend@test.com", "astrologer")
        profile = seed_profile(db_session, user, status="pending")
        cookies = login(client, "admin@test.com")

        resp = client.post(_approve_url(profile.id), cookies=cookies)
        assert resp.status_code == 200
        body = resp.json()
        assert body["approval_status"] == "approved"
        assert body["reviewed_at"] is not None
        assert body["reviewed_by_id"] == admin.id
        assert body["rejection_reason"] is None

        db_session.expire_all()
        stored = db_session.get(AstrologerProfile, profile.id)
        assert stored.approval_status == "approved"

    def test_admin_rejects_with_reason(self, client: TestClient, db_session: Session):
        admin = create_user(db_session, "admin@test.com", "admin")
        user = create_user(db_session, "pend@test.com", "astrologer")
        profile = seed_profile(db_session, user, status="pending")
        cookies = login(client, "admin@test.com")

        resp = client.post(
            _reject_url(profile.id),
            json={"reason": "Please add your certifications."},
            cookies=cookies,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["approval_status"] == "rejected"
        assert body["rejection_reason"] == "Please add your certifications."
        assert body["reviewed_by_id"] == admin.id

    def test_rejection_requires_a_reason(self, client: TestClient, db_session: Session):
        create_user(db_session, "admin@test.com", "admin")
        user = create_user(db_session, "pend@test.com", "astrologer")
        profile = seed_profile(db_session, user, status="pending")
        cookies = login(client, "admin@test.com")

        assert client.post(_reject_url(profile.id), json={}, cookies=cookies).status_code == 422
        assert (
            client.post(_reject_url(profile.id), json={"reason": "no"}, cookies=cookies).status_code == 422
        )

    def test_non_pending_application_cannot_be_approved(self, client: TestClient, db_session: Session):
        create_user(db_session, "admin@test.com", "admin")
        user = create_user(db_session, "appr@test.com", "astrologer")
        profile = seed_profile(db_session, user, status="approved")
        cookies = login(client, "admin@test.com")

        resp = client.post(_approve_url(profile.id), cookies=cookies)
        assert resp.status_code == 409

    def test_non_pending_application_cannot_be_rejected(self, client: TestClient, db_session: Session):
        create_user(db_session, "admin@test.com", "admin")
        user = create_user(db_session, "drafty@test.com", "astrologer")
        profile = seed_profile(db_session, user, status="draft")
        cookies = login(client, "admin@test.com")

        resp = client.post(_reject_url(profile.id), json={"reason": "too early"}, cookies=cookies)
        assert resp.status_code == 409
