"""Job insights narrative endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.services.insights import InsightsNarrativeInput, InsightsNarrativeResponse, narrative

router = APIRouter(prefix="/v1/jobs", tags=["jobs"])


@router.post("/insights/narrative", response_model=InsightsNarrativeResponse)
async def insights_narrative(body: InsightsNarrativeInput) -> InsightsNarrativeResponse:
    return narrative(body)
