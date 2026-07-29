"""Coach memory endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.services.memory import CoachMemoryInput, CoachMemoryResponse, summarize_memory

router = APIRouter(prefix="/v1/coach", tags=["coach"])


@router.post("/memory/summarize", response_model=CoachMemoryResponse)
async def coach_memory_summarize(body: CoachMemoryInput) -> CoachMemoryResponse:
    return summarize_memory(body)
