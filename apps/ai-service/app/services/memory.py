"""Coach long-term memory summarization."""

from __future__ import annotations

import json
import logging
import re
import time
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.config import settings

logger = logging.getLogger(__name__)


class MemoryMessage(BaseModel):
    role: str
    content: str


class CoachMemoryInput(BaseModel):
    focus: str = "general"
    prior_summary: str = ""
    prior_facts: list[str] = Field(default_factory=list)
    messages: list[MemoryMessage] = Field(default_factory=list)


class LlmMetadata(BaseModel):
    enabled: bool = False
    used: bool = False
    model: str | None = None
    error: str | None = None
    durationMs: int | None = None


class MemoryFields(BaseModel):
    model_config = ConfigDict(extra="ignore")

    summary: str = ""
    facts: list[str] = Field(default_factory=list)


class CoachMemoryResponse(BaseModel):
    summary: str
    facts: list[str] = Field(default_factory=list)
    source: str = "template"
    llm: LlmMetadata = Field(default_factory=LlmMetadata)


def summarize_memory(payload: CoachMemoryInput) -> CoachMemoryResponse:
    template = _template(payload)
    meta, fields = _generate_with_llm(payload)

    if fields and (fields.summary.strip() or fields.facts):
        facts = [f.strip() for f in (fields.facts or []) if f.strip()][:12]
        return CoachMemoryResponse(
            summary=(fields.summary or template["summary"]).strip()[:2_000],
            facts=facts or template["facts"],
            source="llm",
            llm=meta,
        )

    return CoachMemoryResponse(
        summary=template["summary"],
        facts=template["facts"],
        source="template",
        llm=meta,
    )


def _template(payload: CoachMemoryInput) -> dict[str, Any]:
    user_bits = [
        m.content.strip()
        for m in payload.messages
        if m.role == "user" and m.content.strip()
    ][-3:]
    facts = list(payload.prior_facts)[:8]
    for bit in user_bits:
        snippet = " ".join(bit.split())[:160]
        if snippet and snippet not in facts:
            facts.append(snippet)
    summary = (payload.prior_summary or "").strip()
    if user_bits:
        latest = " ".join(user_bits[-1].split())[:240]
        summary = (
            f"{summary} Recent focus ({payload.focus}): {latest}".strip()
            if summary
            else f"Recent focus ({payload.focus}): {latest}"
        )
    if not summary:
        summary = "No long-term coach notes yet."
    return {"summary": summary[:2_000], "facts": facts[:12]}


def _generate_with_llm(
    payload: CoachMemoryInput,
) -> tuple[LlmMetadata, MemoryFields | None]:
    model = (settings.llm_coach_memory_model or "").strip() or settings.litellm_model
    meta = LlmMetadata(enabled=settings.llm_coach_memory_enabled, model=model)
    if not settings.llm_coach_memory_enabled:
        return meta, None

    started = time.perf_counter()
    try:
        import litellm

        msgs = [
            {"role": m.role, "content": m.content[:1_000]}
            for m in payload.messages[-16]
        ]
        user = (
            "Update durable career-coach memory for this user.\n"
            "Return ONLY JSON with keys:\n"
            "  summary (string): 3-6 sentences of durable context (goals, constraints, progress).\n"
            "  facts (string[]): up to 12 short durable facts (no secrets).\n\n"
            f"FOCUS: {payload.focus}\n"
            f"PRIOR_SUMMARY: {payload.prior_summary}\n"
            f"PRIOR_FACTS: {json.dumps(payload.prior_facts[:12])}\n"
            f"RECENT_MESSAGES: {json.dumps(msgs)}"
        )
        kwargs: dict[str, Any] = {
            "model": model,
            "messages": [
                {"role": "system", "content": "Respond with JSON only."},
                {"role": "user", "content": user},
            ],
            "timeout": settings.llm_coach_memory_timeout_seconds,
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
        return meta, MemoryFields.model_validate(parsed)
    except Exception as exc:  # noqa: BLE001
        meta.error = str(exc)[:400]
        meta.durationMs = int((time.perf_counter() - started) * 1000)
        logger.warning("coach_memory.llm_failed", extra={"error": meta.error})
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
