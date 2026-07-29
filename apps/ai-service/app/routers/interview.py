"""Interview mock-turn endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.services.interview import InterviewTurnInput, InterviewTurnResponse, mock_turn

router = APIRouter(prefix="/v1/interview", tags=["interview"])


@router.post("/mock-turn", response_model=InterviewTurnResponse)
async def interview_mock_turn(body: InterviewTurnInput) -> InterviewTurnResponse:
    return mock_turn(body)
