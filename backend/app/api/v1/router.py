from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin,
    admin_astrologers,
    astrologer_profile,
    astrologers_public,
    auth,
    health,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(admin.router, tags=["admin"])
api_router.include_router(admin_astrologers.router, tags=["admin"])
api_router.include_router(astrologer_profile.router, tags=["astrologer-dashboard"])
api_router.include_router(astrologers_public.router, tags=["public"])
