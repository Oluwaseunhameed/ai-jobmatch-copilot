"""Health + readiness probes."""

from datetime import datetime, timezone

from fastapi import APIRouter, Response, status

router = APIRouter()


@router.get("/health")
async def health_check():
    """Liveness — process is accepting requests."""
    return {
        "status": "ok",
        "service": "ai-service",
        "version": "0.1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/ready")
async def ready_check(response: Response):
    """
    Readiness — service can handle AI work.
    Currently mirrors liveness; extend later with model/provider pings.
    """
    payload = {
        "status": "ok",
        "service": "ai-service",
        "version": "0.1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": {"process": "ok"},
    }
    response.status_code = status.HTTP_200_OK
    return payload
