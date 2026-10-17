from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Response schema for liveness health checks."""

    status: Literal["ok"] = "ok"
    service: str
    version: str
    environment: str


class DatabaseHealthResponse(BaseModel):
    """Response schema for database connectivity checks."""

    configured: bool = Field(description="Whether database settings are present")
    connected: bool = Field(description="Whether a trivial query succeeded")
    detail: str = Field(description="Human-readable diagnostic detail")