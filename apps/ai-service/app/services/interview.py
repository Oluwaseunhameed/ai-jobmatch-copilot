"""Interview mock-turn feedback — LiteLLM with template fallback."""

from __future__ import annotations

import json
import logging
import re
import time
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.config import settings

logger = logging.getLogger(__name__)


class InterviewTurnInput(BaseModel):
    question: str
    category: str = "behavioral"
    answer: str
    job_title: str = ""
    company_name: str = ""


class LlmMetadata(BaseModel):
    enabled: bool = False
    used: bool = False
    model: str | None = None
    error: str | None = None
    durationMs: int | None = None


class TurnFields(BaseModel):
    model_config = ConfigDict(extra="ignore")

    feedback: str = ""
    followUp: str = ""


class InterviewTurnResponse(BaseModel):
    feedback: str
    followUp: str
    source: str = "template"
    llm: LlmMetadata = Field(default_factory=LlmMetadata)


def mock_turn(payload: InterviewTurnInput) -> InterviewTurnResponse:
    answer = " ".join(payload.answer.split()).strip()
    template = _template(payload, answer)
    meta, fields = _generate_with_llm(payload, answer)

    if fields and fields.feedback.strip():
        return InterviewTurnResponse(
            feedback=fields.feedback.strip()[:2_000],
            followUp=(fields.followUp or template["followUp"]).strip()[:500],
            source="llm",
            llm=meta,
        )

    return InterviewTurnResponse(
        feedback=template["feedback"],
        followUp=template["followUp"],
        source="template",
        llm=meta,
    )


def _template(payload: InterviewTurnInput, answer: str) -> dict[str, str]:
    words = len(answer.split()) if answer else 0
    if words < 20:
        feedback = (
            "Your answer is quite short. Add a concrete example (situation → action → result) "
            "and tie it to the skills this role needs."
        )
    elif words > 220:
        feedback = (
            "Solid detail, but trim toward a 90–120 second STAR story. Lead with the outcome, "
            "then the actions that drove it."
        )
    else:
        feedback = (
            f"Good length for a {payload.category or 'behavioral'} answer. Strengthen the result "
            "with a metric or stakeholder impact, and name one trade-off you managed."
        )
    follow = (
        f"Follow-up: For {payload.job_title or 'this role'} at {payload.company_name or 'the company'}, "
        "what would you do differently if you faced the same situation again?"
    )
    return {"feedback": feedback, "followUp": follow}


def _generate_with_llm(
    payload: InterviewTurnInput,
    answer: str,
) -> tuple[LlmMetadata, TurnFields | None]:
    model = (settings.llm_interview_model or "").strip() or settings.litellm_model
    meta = LlmMetadata(enabled=settings.llm_interview_enabled, model=model)
    if not settings.llm_interview_enabled or not answer:
        if not answer:
            meta.error = "empty_answer"
        return meta, None

    started = time.perf_counter()
    try:
        import litellm

        user = (
            "You are a mock interviewer. Critique the candidate answer briefly.\n"
            "Return ONLY JSON with keys:\n"
            "  feedback (string): 3-6 sentences, constructive, second person.\n"
            "  followUp (string): one sharp follow-up question.\n\n"
            f"ROLE: {payload.job_title} @ {payload.company_name}\n"
            f"CATEGORY: {payload.category}\n"
            f"QUESTION: {payload.question}\n"
            f"ANSWER: {answer[:3_500]}"
        )
        kwargs: dict[str, Any] = {
            "model": model,
            "messages": [
                {"role": "system", "content": "Respond with JSON only."},
                {"role": "user", "content": user},
            ],
            "timeout": settings.llm_interview_timeout_seconds,
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
        return meta, TurnFields.model_validate(parsed)
    except Exception as exc:  # noqa: BLE001
        meta.error = str(exc)[:400]
        meta.durationMs = int((time.perf_counter() - started) * 1000)
        logger.warning("interview.llm_failed", extra={"error": meta.error})
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
