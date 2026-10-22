from __future__ import annotations

from fastapi import APIRouter

from app.core.config import get_settings
from app.core.database import check_database
from app.schemas.health import DatabaseHealthResponse, HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, summary="API health (v1)")
def health_v1() -> HealthResponse:
    """Liveness probe for the versioned API."""
    settings = get_settings()
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        version=settings.app_version,
        environment=settings.app_env,
    )


@router.get(
    "/health/db",
    response_model=DatabaseHealthResponse,
    summary="Database connectivity",
)
def health_db() -> DatabaseHealthResponse:
    """Verify PostgreSQL connectivity with a trivial query.

    Returns HTTP 200 with `connected: false` and a diagnostic message on
    failure so monitoring can distinguish 'API up, DB down'.
    """
    return DatabaseHealthResponse(**check_database())