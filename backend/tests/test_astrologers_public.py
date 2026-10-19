"""Phase 2 tests: public astrologer discovery (no authentication).

Covers: unauthenticated listing/detail, exclusion of unapproved profiles,
name search, specialty/language/mode filters, price & experience sorting,
pagination metadata, invalid query parameters, and the absence of private
fields (email, approval internals) in every public payload.

Profiles require distinct users because `user_id` is unique — each seeder
call therefore creates its own user row.
"""

from __future__ import annotations

from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.phase2_helpers import create_user, seed_profile

LIST_URL = "/api/v1/astrologers"

PRIVATE_FIELDS = {
    "email",
    "applicant_email",
    "user_id",
    "applicant_is_active",
    "reviewed_by_id",
    "reviewed_at",
    "rejection_reason",
    "approval_status",
    "submitted_at",
    "password_hash",
}


def _seed_approved(
    db_session: Session,
    email: str,
    *,
    display_name: str,
    **overrides,
):
    user = create_user(db_session, email, "astrologer")
    return seed_profile(
        db_session,
        user,
        status="approved",
        display_name=display_name,
        **overrides,
    )


def _detail_url(profile_id: int) -> str:
    return f"{LIST_URL}/{profile_id}"


class TestUnauthenticatedAccess:
    def test_listing_needs_no_authentication(self, client: TestClient, db_session: Session):
        _seed_approved(db_session, "a@test.com", display_name="Guru Meera")

        resp = client.get(LIST_URL)  # no cookies, no headers
        assert resp.status_code == 200
        assert resp.json()["total"] == 1

    def test_detail_needs_no_authentication(self, client: TestClient, db_session: Session):
        profile = _seed_approved(db_session, "a@test.com", display_name="Guru Meera")

        resp = client.get(_detail_url(profile.id))
        assert resp.status_code == 200
        assert resp.json()["display_name"] == "Guru Meera"

    def test_detail_of_approved_profile_is_public(self, client: TestClient, db_session: Session):
        profile = _seed_approved(
            db_session,
            "a@test.com",
            display_name="Guru Meera",
            specialties=["Kundli"],
            languages=["Hindi", "English"],
        )

        body = client.get(_detail_url(profile.id)).json()
        assert body["specialties"] == ["Kundli"]
        assert body["languages"] == ["English", "Hindi"]  # canonical order
        assert body["consultation_modes"] == ["chat"]
        assert body["min_rate_per_minute"] == "10.00"


class TestUnapprovedExcluded:
    def test_only_approved_profiles_are_listed(self, client: TestClient, db_session: Session):
        for index, status in enumerate(("draft", "pending", "rejected")):
            user = create_user(db_session, f"un{index}@test.com", "astrologer")
            seed_profile(db_session, user, status=status, display_name=f"Hidden {index}")
        _seed_approved(db_session, "ok@test.com", display_name="Visible One")

        body = client.get(LIST_URL).json()
        assert body["total"] == 1
        assert [item["display_name"] for item in body["items"]] == ["Visible One"]

    def test_detail_404_for_unapproved_statuses(self, client: TestClient, db_session: Session):
        for index, status in enumerate(("draft", "pending", "rejected")):
            user = create_user(db_session, f"un{index}@test.com", "astrologer")
            profile = seed_profile(db_session, user, status=status)
            resp = client.get(_detail_url(profile.id))
            assert resp.status_code == 404, f"status {status} leaked via detail"

    def test_detail_404_for_unknown_id(self, client: TestClient):
        assert client.get(_detail_url(999999)).status_code == 404

    def test_unapproved_profiles_are_not_counted_in_pagination(
        self, client: TestClient, db_session: Session
    ):
        user = create_user(db_session, "pend@test.com", "astrologer")
        seed_profile(db_session, user, status="pending")

        body = client.get(LIST_URL).json()
        assert body["total"] == 0
        assert body["items"] == []


class TestNameSearch:
    def test_search_matches_display_name_case_insensitively(
        self, client: TestClient, db_session: Session
    ):
        _seed_approved(db_session, "a@test.com", display_name="Guru Meera")
        _seed_approved(db_session, "b@test.com", display_name="Pandit Rao")
        _seed_approved(db_session, "c@test.com", display_name="meera devi")

        body = client.get(LIST_URL, params={"q": "MEERA"}).json()
        assert body["total"] == 2
        names = {item["display_name"] for item in body["items"]}
        assert names == {"Guru Meera", "meera devi"}

    def test_search_with_no_match_returns_empty(self, client: TestClient, db_session: Session):
        _seed_approved(db_session, "a@test.com", display_name="Guru Meera")

        body = client.get(LIST_URL, params={"q": "zzz-no-match"}).json()
        assert body["total"] == 0
        assert body["items"] == []

    def test_search_ignores_unapproved_matches(self, client: TestClient, db_session: Session):
        user = create_user(db_session, "hidden@test.com", "astrologer")
        seed_profile(db_session, user, status="pending", display_name="Hidden Meera")
        _seed_approved(db_session, "ok@test.com", display_name="Visible Meera")

        body = client.get(LIST_URL, params={"q": "meera"}).json()
        assert [item["display_name"] for item in body["items"]] == ["Visible Meera"]

    def test_like_wildcards_in_query_are_literal(self, client: TestClient, db_session: Session):
        _seed_approved(db_session, "a@test.com", display_name="Guru Meera")

        # "%" must not act as a wildcard matching everything.
        body = client.get(LIST_URL, params={"q": "%"}).json()
        assert body["total"] == 0


class TestFilters:
    def test_specialty_filter_is_case_insensitive(self, client: TestClient, db_session: Session):
        _seed_approved(db_session, "a@test.com", display_name="A", specialties=["Kundli"])
        _seed_approved(db_session, "b@test.com", display_name="B", specialties=["Tarot"])
        _seed_approved(
            db_session, "c@test.com", display_name="C", specialties=["Numerology", "Vedic"]
        )

        body = client.get(LIST_URL, params={"specialty": "kundli"}).json()
        assert [item["display_name"] for item in body["items"]] == ["A"]

        body = client.get(LIST_URL, params={"specialty": "VEDIC"}).json()
        assert [item["display_name"] for item in body["items"]] == ["C"]

    def test_language_filter_is_case_insensitive(self, client: TestClient, db_session: Session):
        _seed_approved(db_session, "a@test.com", display_name="A", languages=["Hindi"])
        _seed_approved(db_session, "b@test.com", display_name="B", languages=["English", "Tamil"])

        body = client.get(LIST_URL, params={"language": "hindi"}).json()
        assert [item["display_name"] for item in body["items"]] == ["A"]

        body = client.get(LIST_URL, params={"language": "TAMIL"}).json()
        assert [item["display_name"] for item in body["items"]] == ["B"]

    def test_mode_filter_returns_only_enabled_profiles(self, client: TestClient, db_session: Session):
        _seed_approved(
            db_session,
            "chat@test.com",
            display_name="Chatter",
            chat_enabled=True,
            chat_rate=Decimal("10.00"),
            audio_enabled=True,
            audio_rate=Decimal("15.00"),
        )
        _seed_approved(
            db_session,
            "videoonly@test.com",
            display_name="Talker",
            chat_enabled=False,
            chat_rate=None,
            video_enabled=True,
            video_rate=Decimal("30.00"),
        )

        body = client.get(LIST_URL, params={"mode": "chat"}).json()
        assert [item["display_name"] for item in body["items"]] == ["Chatter"]

        body = client.get(LIST_URL, params={"mode": "video"}).json()
        assert [item["display_name"] for item in body["items"]] == ["Talker"]

        body = client.get(LIST_URL, params={"mode": "audio"}).json()
        assert body["total"] == 1
        assert body["items"][0]["display_name"] == "Chatter"

    def test_filters_combine(self, client: TestClient, db_session: Session):
        _seed_approved(
            db_session,
            "match@test.com",
            display_name="Match",
            specialties=["Kundli"],
            languages=["Hindi"],
        )
        _seed_approved(
            db_session,
            "wrongspec@test.com",
            display_name="Wrong Specialty",
            specialties=["Tarot"],
            languages=["Hindi"],
        )
        _seed_approved(
            db_session,
            "wronglang@test.com",
            display_name="Wrong Language",
            specialties=["Kundli"],
            languages=["English"],
        )

        body = client.get(
            LIST_URL, params={"specialty": "Kundli", "language": "Hindi"}
        ).json()
        assert [item["display_name"] for item in body["items"]] == ["Match"]

    def test_no_filters_returns_every_approved_profile(self, client: TestClient, db_session: Session):
        for index in range(3):
            _seed_approved(db_session, f"a{index}@test.com", display_name=f"Astro {index}")

        body = client.get(LIST_URL).json()
        assert body["total"] == 3


class TestSorting:
    def _seed_mixed_prices(self, db_session: Session):
        # price = cheapest enabled mode per profile: 5 / 10 / 15
        _seed_approved(
            db_session,
            "cheap@test.com",
            display_name="Cheap",
            chat_rate=Decimal("5.00"),
        )
        _seed_approved(
            db_session,
            "mid@test.com",
            display_name="Mid",
            chat_rate=Decimal("10.00"),
        )
        _seed_approved(
            db_session,
            "pricey@test.com",
            display_name="Pricey",
            chat_rate=Decimal("15.00"),
        )

    def test_sort_price_ascending(self, client: TestClient, db_session: Session):
        self._seed_mixed_prices(db_session)

        body = client.get(LIST_URL, params={"sort": "price_asc"}).json()
        assert [item["display_name"] for item in body["items"]] == ["Cheap", "Mid", "Pricey"]

    def test_sort_price_descending(self, client: TestClient, db_session: Session):
        self._seed_mixed_prices(db_session)

        body = client.get(LIST_URL, params={"sort": "price_desc"}).json()
        assert [item["display_name"] for item in body["items"]] == ["Pricey", "Mid", "Cheap"]

    def test_sort_price_uses_cheapest_enabled_mode(self, client: TestClient, db_session: Session):
        _seed_approved(
            db_session,
            "multi@test.com",
            display_name="Multi",
            chat_enabled=True,
            chat_rate=Decimal("20.00"),
            audio_enabled=True,
            audio_rate=Decimal("8.00"),
        )
        _seed_approved(
            db_session,
            "single@test.com",
            display_name="Single",
            chat_rate=Decimal("12.00"),
        )

        body = client.get(LIST_URL, params={"sort": "price_asc"}).json()
        assert [item["display_name"] for item in body["items"]] == ["Multi", "Single"]

    def test_sort_experience_ascending_and_descending(self, client: TestClient, db_session: Session):
        _seed_approved(db_session, "junior@test.com", display_name="Junior", years_experience=2)
        _seed_approved(db_session, "senior@test.com", display_name="Senior", years_experience=15)
        _seed_approved(db_session, "mid@test.com", display_name="Mid", years_experience=7)

        body = client.get(LIST_URL, params={"sort": "experience_asc"}).json()
        assert [item["display_name"] for item in body["items"]] == ["Junior", "Mid", "Senior"]

        body = client.get(LIST_URL, params={"sort": "experience_desc"}).json()
        assert [item["display_name"] for item in body["items"]] == ["Senior", "Mid", "Junior"]

    def test_default_sort_is_experience_descending(self, client: TestClient, db_session: Session):
        _seed_approved(db_session, "junior@test.com", display_name="Junior", years_experience=2)
        _seed_approved(db_session, "senior@test.com", display_name="Senior", years_experience=15)

        body = client.get(LIST_URL).json()
        assert [item["display_name"] for item in body["items"]] == ["Senior", "Junior"]


class TestPagination:
    def test_pagination_metadata_is_consistent(self, client: TestClient, db_session: Session):
        for index in range(5):
            _seed_approved(db_session, f"a{index}@test.com", display_name=f"Astro {index}")

        first = client.get(LIST_URL, params={"page": 1, "page_size": 2}).json()
        assert first["total"] == 5
        assert first["total_pages"] == 3
        assert len(first["items"]) == 2
        assert first["page"] == 1 and first["page_size"] == 2
        assert first["has_next"] is True and first["has_prev"] is False

        last = client.get(LIST_URL, params={"page": 3, "page_size": 2}).json()
        assert len(last["items"]) == 1
        assert last["has_next"] is False and last["has_prev"] is True

    def test_pages_do_not_overlap(self, client: TestClient, db_session: Session):
        for index in range(4):
            _seed_approved(db_session, f"a{index}@test.com", display_name=f"Astro {index}")

        seen: set[int] = set()
        for page in (1, 2):
            body = client.get(LIST_URL, params={"page": page, "page_size": 2}).json()
            for item in body["items"]:
                assert item["id"] not in seen, "same profile appeared on two pages"
                seen.add(item["id"])
        assert len(seen) == 4

    def test_page_beyond_end_is_empty_not_error(self, client: TestClient, db_session: Session):
        _seed_approved(db_session, "a@test.com", display_name="Solo")

        resp = client.get(LIST_URL, params={"page": 99, "page_size": 12})
        assert resp.status_code == 200
        body = resp.json()
        assert body["items"] == []
        assert body["total"] == 1
        assert body["has_next"] is False
        assert body["has_prev"] is True

    def test_empty_resultset_metadata(self, client: TestClient):
        body = client.get(LIST_URL).json()
        assert body["items"] == []
        assert body["total"] == 0
        assert body["total_pages"] == 1
        assert body["has_next"] is False and body["has_prev"] is False


class TestInvalidQueryParameters:
    def test_invalid_values_return_422(self, client: TestClient):
        invalid_params = [
            {"mode": "telepathy"},
            {"mode": ""},
            {"sort": "random"},
            {"page": 0},
            {"page": -1},
            {"page_size": 0},
            {"page_size": 51},  # MAX_PAGE_SIZE is 50
        ]
        for params in invalid_params:
            resp = client.get(LIST_URL, params=params)
            assert resp.status_code == 422, f"expected 422 for {params}, got {resp.status_code}"

    def test_overlong_query_values_return_422(self, client: TestClient):
        resp = client.get(LIST_URL, params={"q": "x" * 101})
        assert resp.status_code == 422

        resp = client.get(LIST_URL, params={"specialty": "x" * 81})
        assert resp.status_code == 422

        resp = client.get(LIST_URL, params={"language": "x" * 61})
        assert resp.status_code == 422


class TestNoPrivateFields:
    def _assert_public_shape(self, item: dict) -> None:
        leaked = PRIVATE_FIELDS.intersection(item.keys())
        assert leaked == set(), f"public payload leaked private fields: {leaked}"
        # The fields customers actually need must be present.
        for expected in (
            "id",
            "display_name",
            "bio",
            "years_experience",
            "languages",
            "specialties",
            "consultation_modes",
            "min_rate_per_minute",
        ):
            assert expected in item

    def test_list_items_contain_no_private_fields(self, client: TestClient, db_session: Session):
        _seed_approved(db_session, "private@test.com", display_name="Guru Meera")

        body = client.get(LIST_URL).json()
        assert body["items"], "expected at least one item"
        self._assert_public_shape(body["items"][0])

    def test_detail_contains_no_private_fields(self, client: TestClient, db_session: Session):
        profile = _seed_approved(db_session, "private@test.com", display_name="Guru Meera")

        body = client.get(_detail_url(profile.id)).json()
        self._assert_public_shape(body)

    def test_email_never_appears_anywhere_in_response(
        self, client: TestClient, db_session: Session
    ):
        profile = _seed_approved(
            db_session,
            "super-secret@example.com",
            display_name="Guru Meera",
        )

        for resp in (client.get(LIST_URL), client.get(_detail_url(profile.id))):
            assert "super-secret@example.com" not in resp.text
            assert "password_hash" not in resp.text
