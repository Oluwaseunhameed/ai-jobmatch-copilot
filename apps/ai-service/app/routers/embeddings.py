"""Embedding endpoints backing semantic job search."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.embeddings import embed_texts

router = APIRouter(prefix="/v1/embeddings", tags=["embeddings"])

MAX_BATCH = 64


class EmbedRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=MAX_BATCH)


class EmbedResponse(BaseModel):
    model: str
    dimensions: int
    transport: str
    durationMs: int
    embeddings: list[list[float]]


@router.post("", response_model=EmbedResponse)
def create_embeddings(payload: EmbedRequest) -> EmbedResponse:
    """Embed a batch of texts.

    Returns 503 rather than 500 when the provider is unavailable: the caller is
    expected to fall back to keyword search, not to treat this as a bug.
    """
    outcome = embed_texts(payload.texts)

    if not outcome.enabled:
        raise HTTPException(status_code=503, detail="Embeddings are disabled (EMBEDDINGS_ENABLED)")

    if not outcome.used:
        raise HTTPException(status_code=503, detail=outcome.error or "Embeddings unavailable")

    return EmbedResponse(
        model=outcome.model or "",
        dimensions=outcome.dimensions or 0,
        transport=outcome.transport or "",
        durationMs=outcome.duration_ms or 0,
        embeddings=outcome.vectors,
    )
