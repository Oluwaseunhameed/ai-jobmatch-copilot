"""Text embeddings for semantic job search.

Design notes:

* Two transports. LiteLLM is preferred (ADR-005) because it covers hosted
  providers, but embeddings are cheap and local, so a direct Ollama HTTP call is
  used when LiteLLM is not installed. Semantic search therefore works from a
  plain ``pnpm setup:ai`` without the optional LLM extras.
* Vectors are L2-normalised before they leave this module. The pgvector index is
  built with ``vector_cosine_ops``, and normalising here keeps cosine distance
  equivalent to a dot product and stops magnitude differences between providers
  from shifting scores.
* Dimensions are asserted against the configured value. A model that silently
  returns a different width would corrupt the column, so it fails loudly.
* Like the LLM layer, failures are reported rather than raised: callers degrade
  to keyword search instead of erroring.
"""

from __future__ import annotations

import logging
import math
import re
import time
from dataclasses import dataclass, field
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)

MAX_INPUT_CHARS = 8000


@dataclass
class EmbeddingOutcome:
    """Observable record of an embedding attempt."""

    enabled: bool
    used: bool = False
    model: str | None = None
    dimensions: int | None = None
    transport: str | None = None
    error: str | None = None
    duration_ms: int | None = None
    vectors: list[list[float]] = field(default_factory=list, repr=False)

    def as_metadata(self) -> dict[str, Any]:
        return {
            "enabled": self.enabled,
            "used": self.used,
            "model": self.model,
            "dimensions": self.dimensions,
            "transport": self.transport,
            "error": self.error,
            "durationMs": self.duration_ms,
        }


def embed_texts(texts: list[str]) -> EmbeddingOutcome:
    """Embed one or more texts. Never raises."""
    if not settings.embeddings_enabled:
        return EmbeddingOutcome(enabled=False)

    cleaned = [text.strip()[:MAX_INPUT_CHARS] for text in texts]
    if not cleaned or all(not text for text in cleaned):
        return EmbeddingOutcome(enabled=True, error="no text to embed")

    model = settings.embedding_model
    started = time.monotonic()

    try:
        vectors, transport = _embed(model, cleaned)
    except Exception as exc:  # noqa: BLE001 — any provider error degrades to keyword search
        message = _short_error(exc)
        logger.warning("Embedding failed for model %s: %s", model, message)
        return EmbeddingOutcome(
            enabled=True,
            model=model,
            error=message,
            duration_ms=int((time.monotonic() - started) * 1000),
        )

    duration_ms = int((time.monotonic() - started) * 1000)

    expected = settings.embedding_dimensions
    for vector in vectors:
        if len(vector) != expected:
            message = (
                f"model returned {len(vector)}-dimensional vectors but the database "
                f"column expects {expected}"
            )
            logger.error("Embedding rejected for model %s: %s", model, message)
            return EmbeddingOutcome(
                enabled=True,
                model=model,
                dimensions=len(vector),
                transport=transport,
                error=message,
                duration_ms=duration_ms,
            )

    return EmbeddingOutcome(
        enabled=True,
        used=True,
        model=model,
        dimensions=expected,
        transport=transport,
        duration_ms=duration_ms,
        vectors=[_normalise(vector) for vector in vectors],
    )


def _embed(model: str, texts: list[str]) -> tuple[list[list[float]], str]:
    try:
        import litellm
    except ImportError:
        litellm = None

    if litellm is not None:
        return _embed_via_litellm(litellm, model, texts), "litellm"

    if model.startswith("ollama/"):
        return _embed_via_ollama(model.split("/", 1)[1], texts), "ollama"

    raise RuntimeError(
        f"embedding model '{model}' needs litellm (run: INSTALL_LLM=1 pnpm setup:ai)"
    )


def _embed_via_litellm(litellm: Any, model: str, texts: list[str]) -> list[list[float]]:
    kwargs: dict[str, Any] = {
        "model": model,
        "input": texts,
        "timeout": settings.embedding_timeout_seconds,
    }
    if model.startswith("ollama/"):
        kwargs["api_base"] = settings.ollama_api_base

    response = litellm.embedding(**kwargs)
    data = getattr(response, "data", None)
    if data is None and isinstance(response, dict):
        data = response.get("data")
    if not data:
        raise ValueError("provider returned no embedding data")

    vectors: list[list[float]] = []
    for item in data:
        vector = item.get("embedding") if isinstance(item, dict) else getattr(item, "embedding", None)
        if not vector:
            raise ValueError("provider returned an empty embedding")
        vectors.append([float(value) for value in vector])
    return vectors


def _embed_via_ollama(model: str, texts: list[str]) -> list[list[float]]:
    """Ollama's embeddings endpoint takes one prompt per call."""
    import httpx

    url = f"{settings.ollama_api_base.rstrip('/')}/api/embeddings"
    vectors: list[list[float]] = []

    with httpx.Client(timeout=settings.embedding_timeout_seconds) as client:
        for text in texts:
            response = client.post(url, json={"model": model, "prompt": text})
            response.raise_for_status()
            payload = response.json()
            vector = payload.get("embedding")
            if not vector:
                raise ValueError(f"ollama returned no embedding for model '{model}'")
            vectors.append([float(value) for value in vector])

    return vectors


def _normalise(vector: list[float]) -> list[float]:
    magnitude = math.sqrt(sum(value * value for value in vector))
    if magnitude == 0:
        return vector
    return [value / magnitude for value in vector]


def _short_error(exc: Exception) -> str:
    message = str(exc).strip() or exc.__class__.__name__
    return re.sub(r"\s+", " ", message)[:300]
