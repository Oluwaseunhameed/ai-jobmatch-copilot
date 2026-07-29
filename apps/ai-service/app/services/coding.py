"""Coding AI review — LiteLLM critique of pasted solutions (no execution)."""

from __future__ import annotations

import json
import logging
import re
import time
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.config import settings

logger = logging.getLogger(__name__)


class CodingReviewInput(BaseModel):
    title: str = ""
    prompt: str = ""
    difficulty: str = "medium"
    style: str = "leetcode"
    checklist: list[str] = Field(default_factory=list)
    code: str
    language: str = ""


class LlmMetadata(BaseModel):
    enabled: bool = False
    used: bool = False
    model: str | None = None
    error: str | None = None
    durationMs: int | None = None


class ReviewFields(BaseModel):
    model_config = ConfigDict(extra="ignore")

    review: str = ""


class CodingReviewResponse(BaseModel):
    review: str
    source: str = "template"
    llm: LlmMetadata = Field(default_factory=LlmMetadata)


def review_code(payload: CodingReviewInput) -> CodingReviewResponse:
    code = payload.code.strip()
    template = _template(payload, code)
    meta, fields = _generate_with_llm(payload, code)

    if fields and fields.review.strip():
        return CodingReviewResponse(
            review=fields.review.strip()[:3_000],
            source="llm",
            llm=meta,
        )

    return CodingReviewResponse(review=template, source="template", llm=meta)


def _template(payload: CodingReviewInput, code: str) -> str:
    lines = [ln for ln in code.splitlines() if ln.strip()]
    checklist = payload.checklist[:5]
    bullets = "\n".join(f"- {c}" for c in checklist) if checklist else "- Clarify edge cases\n- State time/space complexity"
    if not code:
        return "Paste a solution to get a review against the problem checklist."
    return (
        f"Self-review for “{payload.title or 'problem'}” ({payload.difficulty}/{payload.style}):\n"
        f"You pasted ~{len(lines)} non-empty lines"
        f"{f' in {payload.language}' if payload.language else ''}.\n"
        f"Check these before considering it done:\n{bullets}\n"
        "No code was executed — this is a static checklist pass only."
    )


def _generate_with_llm(
    payload: CodingReviewInput,
    code: str,
) -> tuple[LlmMetadata, ReviewFields | None]:
    model = (settings.llm_coding_review_model or "").strip() or settings.litellm_model
    meta = LlmMetadata(enabled=settings.llm_coding_review_enabled, model=model)
    if not settings.llm_coding_review_enabled or not code:
        if not code:
            meta.error = "empty_code"
        return meta, None

    started = time.perf_counter()
    try:
        import litellm

        user = (
            "Review this coding interview solution. Do NOT invent that you ran it.\n"
            "Return ONLY JSON with key:\n"
            "  review (string): markdown-friendly critique — correctness risks, complexity, "
            "checklist coverage, and 1-2 improvements.\n\n"
            f"TITLE: {payload.title}\n"
            f"DIFFICULTY: {payload.difficulty}\n"
            f"STYLE: {payload.style}\n"
            f"LANGUAGE: {payload.language or 'unspecified'}\n"
            f"CHECKLIST: {json.dumps(payload.checklist[:8])}\n"
            f"PROMPT:\n{(payload.prompt or '')[:2_000]}\n\n"
            f"CODE:\n{code[:5_000]}"
        )
        kwargs: dict[str, Any] = {
            "model": model,
            "messages": [
                {"role": "system", "content": "Respond with JSON only."},
                {"role": "user", "content": user},
            ],
            "timeout": settings.llm_coding_review_timeout_seconds,
        }
        if model.startswith("ollama/"):
            kwargs["api_base"] = settings.ollama_api_base

        response = litellm.completion(**kwargs)
        content = response.choices[0].message.content or ""
        meta.used = True
        meta.durationMs = int((time.perf_counter() - started) * 1000)
        parsed = _parse_json(content)
        if not parsed:
            meta.error = "invalid_json"
            return meta, None
        return meta, ReviewFields.model_validate(parsed)
    except Exception as exc:  # noqa: BLE001
        meta.error = str(exc)[:400]
        meta.durationMs = int((time.perf_counter() - started) * 1000)
        logger.warning("coding.llm_failed", extra={"error": meta.error})
        return meta, None


def _parse_json(content: str) -> dict[str, Any] | None:
    text = content.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        data = json.loads(text)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            return None
        try:
            data = json.loads(match.group(0))
            return data if isinstance(data, dict) else None
        except json.JSONDecodeError:
            return None
