"""Health check router."""

from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "ai-service",
        "version": "0.1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
