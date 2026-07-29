"""LLM enrichment for resume parsing.

Design notes:

* Heuristic extraction is the source of truth; this layer only fills gaps and adds
  skills. A model failure must never fail a parse.
* Every attempt reports an :class:`LlmOutcome`, so "not installed", "model
  unreachable" and "returned garbage" are distinguishable in logs and in the
  database. Silently swallowing these is how quality regressions go unnoticed.
* Output is validated against a schema before it is trusted, and providers that
  support native JSON schema mode are asked to use it.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.config import settings

logger = logging.getLogger(__name__)

MAX_PROMPT_CHARS = 8000
MAX_SKILLS = 40

SYSTEM_PROMPT = "You extract structured resume data. Respond with JSON only."

USER_PROMPT = (
    "Extract structured fields from this resume text.\n"
    "Return ONLY valid JSON with keys:\n"
    '  headline (string|null): the candidate\'s professional title, e.g. "Senior Backend Engineer". '
    "Never the candidate's name, never a file name.\n"
    "  summary (string|null): 1-3 sentences in the candidate's own voice. Do not invent facts.\n"
    "  skills (string[]): concrete technologies and competencies, max 25, no duplicates.\n"
    "  experience (object[]): work history entries with keys "
    "title, company, location, startMonth, endMonth, isCurrent, description. "
    "Use nulls when unknown. Do not invent employers.\n"
    "  education (object[]): education entries with keys "
    "school, degree, field, startYear, endYear, description. "
    "Years are integers or null. Do not invent schools.\n"
    "Do not invent employers, dates or achievements.\n\n"
    "RESUME:\n{text}"
)

RESUME_JSON_SCHEMA: dict[str, Any] = {
    "type": "json_schema",
    "json_schema": {
        "name": "resume_fields",
        "schema": {
            "type": "object",
            "properties": {
                "headline": {"type": ["string", "null"]},
                "summary": {"type": ["string", "null"]},
                "skills": {"type": "array", "items": {"type": "string"}},
                "experience": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                            "company": {"type": "string"},
                            "location": {"type": ["string", "null"]},
                            "startMonth": {"type": ["string", "null"]},
                            "endMonth": {"type": ["string", "null"]},
                            "isCurrent": {"type": "boolean"},
                            "description": {"type": ["string", "null"]},
                        },
                        "required": [
                            "title",
                            "company",
                            "location",
                            "startMonth",
                            "endMonth",
                            "isCurrent",
                            "description",
                        ],
                        "additionalProperties": False,
                    },
                },
                "education": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "school": {"type": "string"},
                            "degree": {"type": ["string", "null"]},
                            "field": {"type": ["string", "null"]},
                            "startYear": {"type": ["integer", "null"]},
                            "endYear": {"type": ["integer", "null"]},
                            "description": {"type": ["string", "null"]},
                        },
                        "required": [
                            "school",
                            "degree",
                            "field",
                            "startYear",
                            "endYear",
                            "description",
                        ],
                        "additionalProperties": False,
                    },
                },
            },
            "required": ["headline", "summary", "skills", "experience", "education"],
            "additionalProperties": False,
        },
    },
}


class LlmExperience(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str = ""
    company: str = ""
    location: str | None = None
    startMonth: str | None = None
    endMonth: str | None = None
    isCurrent: bool = False
    description: str | None = None


class LlmEducation(BaseModel):
    model_config = ConfigDict(extra="ignore")

    school: str = ""
    degree: str | None = None
    field: str | None = None
    startYear: int | None = None
    endYear: int | None = None
    description: str | None = None


class LlmResumeFields(BaseModel):
    """Schema the model output must satisfy before we trust it."""

    model_config = ConfigDict(extra="ignore")

    headline: str | None = None
    summary: str | None = None
    skills: list[str] = Field(default_factory=list)
    experience: list[LlmExperience] = Field(default_factory=list)
    education: list[LlmEducation] = Field(default_factory=list)


@dataclass
class LlmOutcome:
    """Observable record of what the LLM layer did, and why it did not do more."""

    enabled: bool
    used: bool = False
    model: str | None = None
    error: str | None = None
    duration_ms: int | None = None
    fields: LlmResumeFields | None = field(default=None, repr=False)

    def as_metadata(self) -> dict[str, Any]:
        return {
            "enabled": self.enabled,
            "used": self.used,
            "model": self.model,
            "error": self.error,
            "durationMs": self.duration_ms,
        }


def enrich(text: str) -> LlmOutcome:
    """Ask the model for structured fields. Never raises."""
    if not settings.llm_enrichment_enabled:
        return LlmOutcome(enabled=False, error=None)

    if not text.strip():
        return LlmOutcome(enabled=True, error="empty resume text")

    model = settings.litellm_model

    try:
        import litellm
    except ImportError:
        return LlmOutcome(
            enabled=True,
            model=model,
            error="litellm is not installed (run: INSTALL_LLM=1 pnpm setup:ai)",
        )

    import time

    started = time.monotonic()
    try:
        content = _complete(litellm, model, text)
    except Exception as exc:  # noqa: BLE001 — any provider error degrades to heuristics
        message = _short_error(exc)
        logger.warning("LLM enrichment failed for model %s: %s", model, message)
        return LlmOutcome(
            enabled=True,
            model=model,
            error=message,
            duration_ms=int((time.monotonic() - started) * 1000),
        )

    duration_ms = int((time.monotonic() - started) * 1000)

    try:
        fields = _validate(content)
    except (ValidationError, ValueError, json.JSONDecodeError) as exc:
        message = f"model returned unusable JSON: {_short_error(exc)}"
        logger.warning("LLM enrichment discarded for model %s: %s", model, message)
        return LlmOutcome(enabled=True, model=model, error=message, duration_ms=duration_ms)

    return LlmOutcome(
        enabled=True,
        used=True,
        model=model,
        duration_ms=duration_ms,
        fields=fields,
    )


def _complete(litellm: Any, model: str, text: str) -> str:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": USER_PROMPT.format(text=text[:MAX_PROMPT_CHARS])},
    ]
    kwargs: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": 0.1,
        "max_tokens": 1800,
        "timeout": settings.llm_timeout_seconds,
    }

    if model.startswith("ollama/"):
        kwargs["api_base"] = settings.ollama_api_base

    # Prefer native structured output; fall back for providers that reject it.
    try:
        response = litellm.completion(**kwargs, response_format=RESUME_JSON_SCHEMA)
    except Exception as exc:  # noqa: BLE001
        if not _is_unsupported_response_format(exc):
            raise
        logger.info("Model %s rejected json_schema mode; retrying without it", model)
        response = litellm.completion(**kwargs)

    return _content_of(response)


def _is_unsupported_response_format(exc: Exception) -> bool:
    text = str(exc).lower()
    markers = ("response_format", "json_schema", "not supported", "unsupported")
    return any(marker in text for marker in markers)


def _content_of(response: Any) -> str:
    choice = response.choices[0]
    message = getattr(choice, "message", None)

    if message is None and isinstance(choice, dict):
        message = choice.get("message")

    content = getattr(message, "content", None)
    if content is None and isinstance(message, dict):
        content = message.get("content")

    if not isinstance(content, str) or not content.strip():
        raise ValueError("model returned an empty message")

    return content


def _validate(content: str) -> LlmResumeFields:
    payload = _parse_json_object(content)
    if not isinstance(payload, dict):
        raise ValueError("expected a JSON object")
    return LlmResumeFields.model_validate(payload)


def _parse_json_object(content: str) -> Any:
    """Recover JSON from chatty output: small models add prose and code fences."""
    cleaned = content.strip()

    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", cleaned)
    if fence:
        cleaned = fence.group(1).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start >= 0 and end > start:
            return json.loads(cleaned[start : end + 1])
        raise


def _short_error(exc: Exception) -> str:
    message = str(exc).strip() or exc.__class__.__name__
    collapsed = re.sub(r"\s+", " ", message)
    return collapsed[:300]


def merge(base: dict[str, Any], outcome: LlmOutcome) -> dict[str, Any]:
    """Overlay validated model output on the heuristic result."""
    merged = {**base, "llm": outcome.as_metadata()}

    if not outcome.used or outcome.fields is None:
        return merged

    fields = outcome.fields
    skills: list[str] = list(base.get("skills") or [])
    seen = {skill.lower() for skill in skills}

    for skill in fields.skills:
        name = skill.strip()
        if name and name.lower() not in seen:
            seen.add(name.lower())
            skills.append(name)

    headline = (fields.headline or "").strip() or base.get("headline")
    summary = (fields.summary or "").strip() or base.get("summary")

    experience = list(base.get("experience") or [])
    if fields.experience:
        llm_experience: list[dict[str, Any]] = []
        for item in fields.experience:
            title = (item.title or "").strip()
            company = (item.company or "").strip()
            if not title or not company:
                continue
            llm_experience.append(
                {
                    "title": title[:120],
                    "company": company[:120],
                    "location": (item.location or None),
                    "startMonth": (item.startMonth or None),
                    "endMonth": (item.endMonth or None),
                    "isCurrent": bool(item.isCurrent),
                    "description": (item.description or None),
                    "highlights": [],
                }
            )
        if llm_experience:
            experience = llm_experience[:8]

    education = list(base.get("education") or [])
    if fields.education:
        llm_education: list[dict[str, Any]] = []
        for item in fields.education:
            school = (item.school or "").strip()
            if not school:
                continue
            llm_education.append(
                {
                    "school": school[:160],
                    "degree": (item.degree or None),
                    "field": (item.field or None),
                    "startYear": item.startYear,
                    "endYear": item.endYear,
                    "description": (item.description or None),
                }
            )
        if llm_education:
            education = llm_education[:6]

    merged.update(
        {
            "headline": headline,
            "summary": summary,
            "skills": skills[:MAX_SKILLS],
            "experience": experience,
            "education": education,
            "source": "heuristic+llm",
        }
    )
    return merged
