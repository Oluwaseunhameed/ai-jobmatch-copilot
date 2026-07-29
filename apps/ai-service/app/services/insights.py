"""JD narrative insights — LiteLLM overlay on deterministic fit summary."""

from __future__ import annotations

import json
import logging
import re
import time
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.config import settings

logger = logging.getLogger(__name__)

MAX_JD_CHARS = 6_000


class InsightGap(BaseModel):
    skill: str = ""
    priority: str = ""
    reason: str = ""


class InsightFit(BaseModel):
    key: str = ""
    label: str = ""
    level: str = ""
    detail: str = ""


class InsightsNarrativeInput(BaseModel):
    job_title: str = ""
    company_name: str = ""
    description: str = ""
    match_score: int | None = None
    template_summary: str = ""
    skill_gaps: list[InsightGap] = Field(default_factory=list)
    fit_signals: list[InsightFit] = Field(default_factory=list)
    matched_skills: list[str] = Field(default_factory=list)


class LlmMetadata(BaseModel):
    enabled: bool = False
    used: bool = False
    model: str | None = None
    error: str | None = None
    durationMs: int | None = None


class NarrativeFields(BaseModel):
    model_config = ConfigDict(extra="ignore")

    summary: str = ""
    themes: list[str] = Field(default_factory=list)


class InsightsNarrativeResponse(BaseModel):
    summary: str
    themes: list[str] = Field(default_factory=list)
    source: str = "template"
    llm: LlmMetadata = Field(default_factory=LlmMetadata)


def narrative(payload: InsightsNarrativeInput) -> InsightsNarrativeResponse:
    template_summary = (payload.template_summary or "").strip() or (
        "Review skill gaps and fit signals before applying."
    )
    themes = _template_themes(payload)
    meta, fields = _generate_with_llm(payload)

    if fields and fields.summary.strip():
        return InsightsNarrativeResponse(
            summary=fields.summary.strip()[:1_200],
            themes=(fields.themes or themes)[:8],
            source="llm",
            llm=meta,
        )

    return InsightsNarrativeResponse(
        summary=template_summary,
        themes=themes,
        source="template",
        llm=meta,
    )


def _template_themes(payload: InsightsNarrativeInput) -> list[str]:
    out: list[str] = []
    if payload.match_score is not None:
        out.append(f"Skill coverage around {payload.match_score}% vs your profile.")
    high = [g.skill for g in payload.skill_gaps if g.priority == "high"][:3]
    if high:
        out.append("Priority gaps: " + ", ".join(high) + ".")
    strong = [s.label for s in payload.fit_signals if s.level == "strong"][:3]
    if strong:
        out.append("Strong fit on: " + ", ".join(strong) + ".")
    gaps = [s.label for s in payload.fit_signals if s.level == "gap"][:3]
    if gaps:
        out.append("Watch: " + ", ".join(gaps) + ".")
    if not out:
        out.append("Complete your profile for a richer fit narrative.")
    return out


def _generate_with_llm(
    payload: InsightsNarrativeInput,
) -> tuple[LlmMetadata, NarrativeFields | None]:
    model = (settings.llm_insights_model or "").strip() or settings.litellm_model
    meta = LlmMetadata(enabled=settings.llm_insights_enabled, model=model)

    if not settings.llm_insights_enabled:
        return meta, None

    started = time.perf_counter()
    try:
        import litellm

        jd = (payload.description or "")[:MAX_JD_CHARS]
        gaps = [
            {"skill": g.skill, "priority": g.priority, "reason": g.reason}
            for g in payload.skill_gaps[:8]
        ]
        fits = [
            {"label": s.label, "level": s.level, "detail": s.detail}
            for s in payload.fit_signals[:6]
        ]
        user = (
            "Write a concise job-fit narrative for a candidate.\n"
            "Return ONLY JSON with keys:\n"
            '  summary (string): 2-4 sentences, second person ("you"), grounded in the data.\n'
            "  themes (string[]): 3-6 short bullets — must-haves, culture cues, risks, or strengths.\n"
            "Do not invent employers, salary, or skills not implied by the inputs.\n\n"
            f"ROLE: {payload.job_title} at {payload.company_name}\n"
            f"MATCH_SCORE: {payload.match_score}\n"
            f"TEMPLATE_SUMMARY: {payload.template_summary}\n"
            f"MATCHED_SKILLS: {json.dumps(payload.matched_skills[:16])}\n"
            f"SKILL_GAPS: {json.dumps(gaps)}\n"
            f"FIT_SIGNALS: {json.dumps(fits)}\n"
            f"JOB_DESCRIPTION:\n{jd}"
        )

        kwargs: dict[str, Any] = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a career coach. Respond with JSON only.",
                },
                {"role": "user", "content": user},
            ],
            "timeout": settings.llm_insights_timeout_seconds,
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
        return meta, NarrativeFields.model_validate(parsed)
    except Exception as exc:  # noqa: BLE001 — degrade to template
        meta.error = str(exc)[:400]
        meta.durationMs = int((time.perf_counter() - started) * 1000)
        logger.warning("insights.llm_failed", extra={"error": meta.error})
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
