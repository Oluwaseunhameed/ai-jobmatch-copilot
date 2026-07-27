"""Career coach endpoints — conversational coaching over Growth Hub context."""

from __future__ import annotations

import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.services.coach import CoachChatInput, CoachChatResponse, chat, iter_chat_events

router = APIRouter(prefix="/v1/coach", tags=["coach"])


@router.post("/chat", response_model=CoachChatResponse)
async def coach_chat(body: CoachChatInput) -> CoachChatResponse:
    """Generate a coach reply from Growth Hub context + user message."""
    return chat(body)


@router.post("/chat/stream")
async def coach_chat_stream(body: CoachChatInput) -> StreamingResponse:
    """Stream a coach reply as SSE (`data: {json}\\n\\n`)."""

    def event_stream():
        for event in iter_chat_events(body):
            yield f"data: {json.dumps(event, ensure_ascii=True)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
        },
    )
