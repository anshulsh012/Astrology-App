"""Health endpoint tests (no database required)."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root_health_returns_json() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["version"]
    assert payload["environment"]


def test_api_v1_health_returns_json() -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/json")
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["service"]
    assert payload["version"]
    assert payload["environment"]


def test_api_v1_health_db_returns_json_without_database() -> None:
    """Even when no DB is configured, the endpoint must answer JSON."""
    response = client.get("/api/v1/health/db")

    assert response.status_code == 200
    payload = response.json()
    assert set(payload) == {"configured", "connected", "detail"}
    assert isinstance(payload["connected"], bool)
    assert isinstance(payload["detail"], str)


def test_root_index_returns_service_info() -> None:
    response = client.get("/")

    assert response.status_code == 200
    payload = response.json()
    assert payload["health"] == "/health"
    assert payload["api_health"] == "/api/v1/health"


def test_unknown_route_returns_json_404() -> None:
    response = client.get("/api/v1/nonexistent")

    assert response.status_code == 404
    assert response.json()["detail"] == "Not Found"