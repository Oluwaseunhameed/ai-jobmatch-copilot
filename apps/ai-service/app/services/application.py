"""Cover letter + short application answers — LiteLLM with template fallback."""

from __future__ import annotations

import json
import logging
import re
import time
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.config import settings

logger = logging.getLogger(__name__)

MAX_PROMPT_CHARS = 8_000
MAX_QUESTIONS = 3

DEFAULT_QUESTIONS = [
    "Why are you interested in this role?",
    "Why do you want to work at this company?",
    "What relevant experience do you bring?",
]


class ApplicationJobInput(BaseModel):
    title: str
    company_name: str = ""
    description: str = ""
    skills: list[str] = Field(default_factory=list)


class ApplicationGenerateInput(BaseModel):
    resume_text: str = ""
    candidate_name: str | None = None
    headline: str | None = None
    summary: str | None = None
    skills: list[str] = Field(default_factory=list)
    job: ApplicationJobInput
    questions: list[str] = Field(default_factory=list)


class AnswerBlock(BaseModel):
    question: str
    answer: str


class LlmMetadata(BaseModel):
    enabled: bool = False
    used: bool = False
    model: str | None = None
    error: str | None = None
    durationMs: int | None = None


class ApplicationGenerateResponse(BaseModel):
    coverLetter: str
    answers: list[AnswerBlock] = Field(default_factory=list)
    questions: list[str] = Field(default_factory=list)
    source: str = "template"
    llm: LlmMetadata = Field(default_factory=LlmMetadata)


class GeneratedFields(BaseModel):
    model_config = ConfigDict(extra="ignore")

    coverLetter: str = ""
    answers: list[AnswerBlock] = Field(default_factory=list)


APPLICATION_JSON_SCHEMA: dict[str, Any] = {
    "type": "json_schema",
    "json_schema": {
        "name": "application_materials",
        "schema": {
            "type": "object",
            "properties": {
                "coverLetter": {"type": "string"},
                "answers": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "question": {"type": "string"},
                            "answer": {"type": "string"},
                        },
                        "required": ["question", "answer"],
                        "additionalProperties": False,
                    },
                },
            },
            "required": ["coverLetter", "answers"],
            "additionalProperties": False,
        },
        "strict": True,
    },
}


def normalize_questions(raw: list[str] | None) -> list[str]:
    cleaned: list[str] = []
    seen: set[str] = set()
    for item in raw or []:
        q = " ".join(item.split()).strip()
        if not q:
            continue
        key = q.lower()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(q)
        if len(cleaned) >= MAX_QUESTIONS:
            break
    return cleaned or list(DEFAULT_QUESTIONS)


def generate_application(payload: ApplicationGenerateInput) -> ApplicationGenerateResponse:
    questions = normalize_questions(payload.questions)
    template = _template_materials(payload, questions)
    llm_meta, rewritten = _generate_with_llm(payload, questions)

    if rewritten and rewritten.coverLetter.strip():
        answers = _align_answers(questions, rewritten.answers, template.answers)
        return ApplicationGenerateResponse(
            coverLetter=rewritten.coverLetter.strip(),
            answers=answers,
            questions=questions,
            source="llm",
            llm=llm_meta,
        )

    return ApplicationGenerateResponse(
        coverLetter=template.coverLetter,
        answers=template.answers,
        questions=questions,
        source="template",
        llm=llm_meta,
    )


def _template_materials(
    payload: ApplicationGenerateInput,
    questions: list[str],
) -> ApplicationGenerateResponse:
    name = (payload.candidate_name or "the candidate").strip() or "the candidate"
    role = payload.job.title.strip() or "this role"
    company = payload.job.company_name.strip() or "your company"
    headline = (payload.headline or "").strip()
    summary = (payload.summary or "").strip()
    skills = [s.strip() for s in payload.skills if s.strip()][:8]
    skill_line = ", ".join(skills) if skills else "relevant technical skills"

    intro = f"Dear Hiring Manager,\n\nI am writing to express my interest in the {role} position at {company}."
    if headline:
        intro += f" As a {headline}, I am excited about the opportunity to contribute."

    middle_bits: list[str] = []
    if summary:
        middle_bits.append(summary)
    middle_bits.append(
        f"My background includes experience with {skill_line}, which aligns with what {company} is looking for."
    )
    if payload.job.skills:
        overlap = [s for s in payload.job.skills if s.lower() in " ".join(skills).lower()]
        focus = overlap[:4] or payload.job.skills[:4]
        middle_bits.append(
            f"I am particularly motivated by work involving {', '.join(focus)}."
        )

    closing = (
        f"\n\nThank you for considering my application. I would welcome the chance to discuss "
        f"how I can support {company}'s goals.\n\nSincerely,\n{name}"
    )
    cover = intro + "\n\n" + " ".join(middle_bits) + closing

    answers = [
        AnswerBlock(question=q, answer=_template_answer(q, payload, company, role, skill_line))
        for q in questions
    ]
    return ApplicationGenerateResponse(
        coverLetter=cover.strip(),
        answers=answers,
        questions=questions,
        source="template",
    )


def _template_answer(
    question: str,
    payload: ApplicationGenerateInput,
    company: str,
    role: str,
    skill_line: str,
) -> str:
    q = question.lower()
    summary = (payload.summary or "").strip()
    if "company" in q:
        return (
            f"I am drawn to {company} because of its focus and the chance to contribute "
            f"to meaningful work in the {role} space. My experience with {skill_line} "
            f"positions me to add value quickly."
        )
    if "experience" in q or "bring" in q:
        base = summary or f"I bring hands-on experience with {skill_line}."
        return f"{base} That background maps well to the {role} responsibilities."
    # Default: interest in role
    return (
        f"I am interested in the {role} role at {company} because it matches my strengths "
        f"in {skill_line}."
        + (f" {summary}" if summary else "")
    )


def _align_answers(
    questions: list[str],
    generated: list[AnswerBlock],
    fallback: list[AnswerBlock],
) -> list[AnswerBlock]:
    by_q = {a.question.strip().lower(): a.answer.strip() for a in generated if a.answer.strip()}
    out: list[AnswerBlock] = []
    for i, question in enumerate(questions):
        answer = by_q.get(question.lower())
        if not answer and i < len(generated) and generated[i].answer.strip():
            answer = generated[i].answer.strip()
        if not answer and i < len(fallback):
            answer = fallback[i].answer
        out.append(AnswerBlock(question=question, answer=answer or ""))
    return out


def _generate_with_llm(
    payload: ApplicationGenerateInput,
    questions: list[str],
) -> tuple[LlmMetadata, GeneratedFields | None]:
    if not settings.llm_application_enabled:
        return LlmMetadata(enabled=False), None

    model = settings.llm_application_model or settings.litellm_model

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
        content = _complete_application(litellm, model, payload, questions)
        fields = GeneratedFields.model_validate(_parse_json_object(content))
    except Exception as exc:  # noqa: BLE001
        message = _short_error(exc)
        logger.warning("LLM application generate failed for model %s: %s", model, message)
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
    return (
        LlmMetadata(enabled=True, used=True, model=model, durationMs=duration_ms),
        fields,
    )


def _complete_application(
    litellm: Any,
    model: str,
    payload: ApplicationGenerateInput,
    questions: list[str],
) -> str:
    job = payload.job
    questions_block = "\n".join(f"- {q}" for q in questions)
    prompt = (
        "Write application materials for this candidate and job.\n"
        "Return ONLY valid JSON with keys coverLetter and answers.\n"
        "answers must be an array of {question, answer} for EACH listed question.\n"
        "Rules:\n"
        "- Do not invent employers, degrees, or metrics not supported by the resume.\n"
        "- Keep a professional, concise tone (cover letter ~250–400 words).\n"
        "- Short answers: 2–4 sentences each.\n"
        "- Use the exact question text in answers[].question.\n\n"
        f"CANDIDATE NAME: {payload.candidate_name or 'n/a'}\n"
        f"HEADLINE: {payload.headline or ''}\n"
        f"SUMMARY: {payload.summary or ''}\n"
        f"SKILLS: {', '.join(payload.skills)}\n"
        f"JOB TITLE: {job.title}\n"
        f"COMPANY: {job.company_name or 'n/a'}\n"
        f"JOB SKILLS: {', '.join(job.skills) or 'n/a'}\n"
        f"JOB DESCRIPTION:\n{job.description[:3500]}\n\n"
        f"QUESTIONS:\n{questions_block}\n\n"
        f"RESUME TEXT:\n{payload.resume_text[:MAX_PROMPT_CHARS]}"
    )

    messages = [
        {
            "role": "system",
            "content": "You write truthful job application materials. Respond with JSON only.",
        },
        {"role": "user", "content": prompt},
    ]
    kwargs: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": 0.4,
        "max_tokens": 2000,
        "timeout": settings.llm_application_timeout_seconds,
    }
    if model.startswith("ollama/"):
        kwargs["api_base"] = settings.ollama_api_base

    try:
        response = litellm.completion(**kwargs, response_format=APPLICATION_JSON_SCHEMA)
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
