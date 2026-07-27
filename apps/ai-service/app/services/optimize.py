"""Resume optimization for a target job — keyword-fit score + optional LLM rewrite."""

from __future__ import annotations

import json
import logging
import re
import time
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.config import settings

logger = logging.getLogger(__name__)

MAX_PROMPT_CHARS = 10_000
MAX_SKILLS = 40

SKILL_ALIASES = {
    "js": "javascript",
    "ts": "typescript",
    "node.js": "node",
    "nodejs": "node",
    "react.js": "react",
    "reactjs": "react",
    "next.js": "nextjs",
    "next": "nextjs",
    "postgres": "postgresql",
    "golang": "go",
    "k8s": "kubernetes",
}


class OptimizeJobInput(BaseModel):
    title: str
    description: str = ""
    skills: list[str] = Field(default_factory=list)
    requirements: list[str] = Field(default_factory=list)


class OptimizeResumeInput(BaseModel):
    resume_text: str = ""
    headline: str | None = None
    summary: str | None = None
    skills: list[str] = Field(default_factory=list)
    job: OptimizeJobInput


class ScoreBlock(BaseModel):
    score: int
    matchedKeywords: list[str] = Field(default_factory=list)
    missingKeywords: list[str] = Field(default_factory=list)


class ResumeSnapshot(BaseModel):
    text: str
    headline: str | None = None
    summary: str | None = None
    skills: list[str] = Field(default_factory=list)
    atsScore: ScoreBlock


class LlmMetadata(BaseModel):
    enabled: bool = False
    used: bool = False
    model: str | None = None
    error: str | None = None
    durationMs: int | None = None


class OptimizeResponse(BaseModel):
    before: ResumeSnapshot
    after: ResumeSnapshot
    source: str = "heuristic"
    llm: LlmMetadata = Field(default_factory=LlmMetadata)


class OptimizedFields(BaseModel):
    model_config = ConfigDict(extra="ignore")

    headline: str | None = None
    summary: str | None = None
    skills: list[str] = Field(default_factory=list)


OPTIMIZE_JSON_SCHEMA: dict[str, Any] = {
    "type": "json_schema",
    "json_schema": {
        "name": "optimized_resume",
        "schema": {
            "type": "object",
            "properties": {
                "headline": {"type": ["string", "null"]},
                "summary": {"type": ["string", "null"]},
                "skills": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["headline", "summary", "skills"],
            "additionalProperties": False,
        },
    },
}


def normalize_skill(raw: str) -> str:
    value = raw.strip().lower()
    value = value.replace("c++", "cpp").replace("c#", "csharp")
    value = re.sub(r"[^a-z0-9.]+", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return SKILL_ALIASES.get(value, value)


def job_keywords(job: OptimizeJobInput) -> list[str]:
    """Prefer explicit job.skills; fall back to tokens from requirements."""
    seen: set[str] = set()
    keywords: list[str] = []

    for skill in job.skills:
        key = normalize_skill(skill)
        if key and key not in seen:
            seen.add(key)
            keywords.append(skill.strip())

    if keywords:
        return keywords

    for line in job.requirements:
        for token in re.split(r"[,/;|]", line):
            name = token.strip()
            key = normalize_skill(name)
            if len(key) < 2 or key in seen:
                continue
            seen.add(key)
            keywords.append(name)

    return keywords[:25]


def score_resume(
    *,
    skills: list[str],
    text: str,
    keywords: list[str],
) -> ScoreBlock:
    if not keywords:
        return ScoreBlock(score=0, matchedKeywords=[], missingKeywords=[])

    haystack = " ".join([*skills, text]).lower()
    resume_keys = {normalize_skill(s) for s in skills if s.strip()}
    matched: list[str] = []
    missing: list[str] = []
    seen: set[str] = set()

    for keyword in keywords:
        key = normalize_skill(keyword)
        if not key or key in seen:
            continue
        seen.add(key)
        if key in resume_keys or key in haystack:
            matched.append(keyword)
        else:
            missing.append(keyword)

    compared = len(matched) + len(missing)
    score = round((len(matched) / compared) * 100) if compared else 0
    return ScoreBlock(score=score, matchedKeywords=matched, missingKeywords=missing)


def optimize_resume(payload: OptimizeResumeInput) -> OptimizeResponse:
    keywords = job_keywords(payload.job)
    before_skills = list(payload.skills)
    before_text = payload.resume_text or _compose_text(
        payload.headline, payload.summary, before_skills
    )
    before_score = score_resume(skills=before_skills, text=before_text, keywords=keywords)

    before = ResumeSnapshot(
        text=before_text,
        headline=payload.headline,
        summary=payload.summary,
        skills=before_skills,
        atsScore=before_score,
    )

    llm_meta, rewritten = _rewrite_with_llm(payload, before_score.missingKeywords)

    after_headline = rewritten.get("headline") if rewritten else payload.headline
    after_summary = rewritten.get("summary") if rewritten else payload.summary
    after_skills = list(rewritten.get("skills") or []) if rewritten else list(before_skills)

    if not rewritten:
        # Heuristic: surface missing keywords into the skills list without inventing prose.
        after_skills = _merge_skills(before_skills, before_score.missingKeywords[:8])
        if after_summary and before_score.missingKeywords:
            hint = ", ".join(before_score.missingKeywords[:5])
            if hint.lower() not in after_summary.lower():
                after_summary = f"{after_summary.rstrip()} Keywords to emphasise: {hint}."

    after_text = _compose_text(after_headline, after_summary, after_skills, base=before_text)
    after_score = score_resume(skills=after_skills, text=after_text, keywords=keywords)

    source = "heuristic+llm" if llm_meta.used else "heuristic"
    return OptimizeResponse(
        before=before,
        after=ResumeSnapshot(
            text=after_text,
            headline=after_headline,
            summary=after_summary,
            skills=after_skills[:MAX_SKILLS],
            atsScore=after_score,
        ),
        source=source,
        llm=llm_meta,
    )


def _compose_text(
    headline: str | None,
    summary: str | None,
    skills: list[str],
    *,
    base: str = "",
) -> str:
    parts: list[str] = []
    if headline:
        parts.append(headline.strip())
    if summary:
        parts.append(summary.strip())
    if skills:
        parts.append("Skills: " + ", ".join(skills))
    composed = "\n\n".join(parts).strip()
    if composed:
        return composed
    return base.strip()


def _merge_skills(existing: list[str], extras: list[str]) -> list[str]:
    out = list(existing)
    seen = {normalize_skill(s) for s in out}
    for skill in extras:
        key = normalize_skill(skill)
        if key and key not in seen:
            seen.add(key)
            out.append(skill.strip())
    return out[:MAX_SKILLS]


def _rewrite_with_llm(
    payload: OptimizeResumeInput,
    missing: list[str],
) -> tuple[LlmMetadata, dict[str, Any] | None]:
    if not settings.llm_optimize_enabled:
        return LlmMetadata(enabled=False), None

    model = settings.llm_optimize_model or settings.litellm_model

    try:
        import litellm
    except ImportError:
        return (
            LlmMetadata(
                enabled=True,
                model=model,
                error="litellm is not installed (run: INSTALL_LLM=1 pnpm setup:ai)",
            ),
            None,
        )

    started = time.monotonic()
    try:
        content = _complete_optimize(litellm, model, payload, missing)
        fields = OptimizedFields.model_validate(_parse_json_object(content))
    except Exception as exc:  # noqa: BLE001
        message = _short_error(exc)
        logger.warning("LLM optimize failed for model %s: %s", model, message)
        return (
            LlmMetadata(
                enabled=True,
                model=model,
                error=message,
                durationMs=int((time.monotonic() - started) * 1000),
            ),
            None,
        )

    duration_ms = int((time.monotonic() - started) * 1000)
    skills = _merge_skills(list(payload.skills), list(fields.skills) + missing[:5])
    return (
        LlmMetadata(enabled=True, used=True, model=model, durationMs=duration_ms),
        {
            "headline": (fields.headline or "").strip() or payload.headline,
            "summary": (fields.summary or "").strip() or payload.summary,
            "skills": skills,
        },
    )


def _complete_optimize(litellm: Any, model: str, payload: OptimizeResumeInput, missing: list[str]) -> str:
    job = payload.job
    prompt = (
        "Rewrite this candidate resume summary and skills for the target job.\n"
        "Return ONLY valid JSON with keys headline, summary, skills.\n"
        "Rules:\n"
        "- Do not invent employers, degrees, or dates.\n"
        "- Keep the candidate's voice; emphasise overlapping skills.\n"
        "- Prefer including these missing keywords when truthful: "
        f"{', '.join(missing[:12]) or 'none'}.\n"
        f"- Max {MAX_SKILLS} skills, no duplicates.\n\n"
        f"JOB TITLE: {job.title}\n"
        f"JOB SKILLS: {', '.join(job.skills) or 'n/a'}\n"
        f"JOB DESCRIPTION:\n{job.description[:4000]}\n\n"
        f"CURRENT HEADLINE: {payload.headline or ''}\n"
        f"CURRENT SUMMARY: {payload.summary or ''}\n"
        f"CURRENT SKILLS: {', '.join(payload.skills)}\n\n"
        f"RESUME TEXT:\n{payload.resume_text[:MAX_PROMPT_CHARS]}"
    )

    messages = [
        {
            "role": "system",
            "content": "You optimise resumes for ATS keyword fit. Respond with JSON only.",
        },
        {"role": "user", "content": prompt},
    ]
    kwargs: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": 1200,
        "timeout": settings.llm_optimize_timeout_seconds,
    }
    if model.startswith("ollama/"):
        kwargs["api_base"] = settings.ollama_api_base

    try:
        response = litellm.completion(**kwargs, response_format=OPTIMIZE_JSON_SCHEMA)
    except Exception as exc:  # noqa: BLE001
        text = str(exc).lower()
        if not any(m in text for m in ("response_format", "json_schema", "not supported", "unsupported")):
            raise
        response = litellm.completion(**kwargs)

    choice = response.choices[0]
    message = getattr(choice, "message", None) or (choice.get("message") if isinstance(choice, dict) else None)
    content = getattr(message, "content", None) if message is not None else None
    if content is None and isinstance(message, dict):
        content = message.get("content")
    if not isinstance(content, str) or not content.strip():
        raise ValueError("model returned an empty message")
    return content


def _parse_json_object(content: str) -> Any:
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
    return re.sub(r"\s+", " ", message)[:300]
