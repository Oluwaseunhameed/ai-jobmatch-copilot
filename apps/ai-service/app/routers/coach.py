"""Career coach endpoints — conversational coaching over Growth Hub context."""

from __future__ import annotations

from fastapi import APIRouter

from app.services.coach import CoachChatInput, CoachChatResponse, chat

router = APIRouter(prefix="/v1/coach", tags=["coach"])


@router.post("/chat", response_model=CoachChatResponse)
async def coach_chat(body: CoachChatInput) -> CoachChatResponse:
    """Generate a coach reply from Growth Hub context + user message."""
    return chat(body)
