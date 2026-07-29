"""Career coach chat — LiteLLM with Growth Hub template fallback."""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from pydantic import BaseModel, Field

from app.config import settings

logger = logging.getLogger(__name__)

MAX_MESSAGE_CHARS = 4_000
MAX_HISTORY = 12


class CoachGap(BaseModel):
    skill: str = ""
    priority: str = ""
    reason: str = ""


class CoachRoadmapStep(BaseModel):
    title: str = ""
    skill: str = ""
    estimatedHours: int | None = None


class CoachPath(BaseModel):
    title: str = ""
    readinessPct: int = 0
    detail: str = ""


class CoachPromotion(BaseModel):
    score: int = 0
    level: str = ""
    targetSeniority: str = ""
    detail: str = ""
    checklistOpen: list[str] = Field(default_factory=list)


class CoachMarket(BaseModel):
    activeJobs: int = 0
    skillsAnalyzed: int = 0


class CoachContext(BaseModel):
    summary: str = ""
    topGaps: list[CoachGap] = Field(default_factory=list)
    roadmapSteps: list[CoachRoadmapStep] = Field(default_factory=list)
    certifications: list[dict[str, Any]] = Field(default_factory=list)
    careerPaths: list[CoachPath] = Field(default_factory=list)
    salaryDetail: str | None = None
    promotion: CoachPromotion = Field(default_factory=CoachPromotion)
    market: CoachMarket = Field(default_factory=CoachMarket)
    memorySummary: str = ""
    memoryFacts: list[str] = Field(default_factory=list)


class CoachHistoryMessage(BaseModel):
    role: str
    content: str


class CoachChatInput(BaseModel):
    focus: str = "general"
    user_message: str
    context: CoachContext = Field(default_factory=CoachContext)
    messages: list[CoachHistoryMessage] = Field(default_factory=list)


class LlmMetadata(BaseModel):
    enabled: bool = False
    used: bool = False
    model: str | None = None
    error: str | None = None
    durationMs: int | None = None


class CoachChatResponse(BaseModel):
    reply: str
    source: str = "template"
    llm: LlmMetadata = Field(default_factory=LlmMetadata)


def chat(payload: CoachChatInput) -> CoachChatResponse:
    user_message = " ".join(payload.user_message.split()).strip()[:MAX_MESSAGE_CHARS]
    if not user_message:
        return CoachChatResponse(
            reply="Ask me about skill gaps, your learning roadmap, salary, promotion readiness, or career paths.",
            source="template",
        )

    template = _template_reply(payload, user_message)
    llm_meta, llm_reply = _generate_with_llm(payload, user_message)

    if llm_reply and llm_reply.strip():
        return CoachChatResponse(reply=llm_reply.strip(), source="llm", llm=llm_meta)

    return CoachChatResponse(reply=template, source="template", llm=llm_meta)


def iter_chat_events(payload: CoachChatInput):
    """Yield SSE-ready dict events: meta → token* → done (or error)."""
    user_message = " ".join(payload.user_message.split()).strip()[:MAX_MESSAGE_CHARS]
    if not user_message:
        reply = (
            "Ask me about skill gaps, your learning roadmap, salary, "
            "promotion readiness, or career paths."
        )
        yield {"type": "meta", "source": "template"}
        yield {"type": "token", "text": reply}
        yield {"type": "done", "source": "template", "reply": reply}
        return

    template = _template_reply(payload, user_message)
    model = settings.litellm_model
    meta = LlmMetadata(enabled=True, model=model)
    started = time.perf_counter()

    try:
        import litellm
    except ImportError:
        meta.enabled = False
        meta.error = "litellm is not installed (run: INSTALL_LLM=1 pnpm setup:ai)"
        yield from _yield_template(template, meta)
        return

    assembled: list[str] = []
    try:
        stream = _stream_complete(litellm, model, payload, user_message)
        first = next(stream, None)
        if first is None:
            raise RuntimeError("empty llm stream")

        yield {"type": "meta", "source": "llm", "llm": meta.model_dump()}
        assembled.append(first)
        yield {"type": "token", "text": first}
        for piece in stream:
            assembled.append(piece)
            yield {"type": "token", "text": piece}

        reply = "".join(assembled).strip()
        if not reply:
            raise RuntimeError("empty llm stream")
        meta.used = True
        meta.durationMs = int((time.perf_counter() - started) * 1000)
        yield {"type": "done", "source": "llm", "reply": reply, "llm": meta.model_dump()}
    except Exception as exc:  # noqa: BLE001
        logger.warning("coach llm stream failed: %s", exc)
        meta.error = str(exc)[:300]
        meta.durationMs = int((time.perf_counter() - started) * 1000)
        if assembled:
            reply = "".join(assembled).strip()
            yield {
                "type": "done",
                "source": "llm",
                "reply": reply,
                "llm": meta.model_dump(),
            }
            return
        yield from _yield_template(template, meta)


def _yield_template(template: str, meta: LlmMetadata):
    yield {"type": "meta", "source": "template", "llm": meta.model_dump()}
    for chunk in _chunk_text(template):
        yield {"type": "token", "text": chunk}
    yield {
        "type": "done",
        "source": "template",
        "reply": template,
        "llm": meta.model_dump(),
    }


def _chunk_text(text: str, size: int = 28) -> list[str]:
    if not text:
        return []
    return [text[i : i + size] for i in range(0, len(text), size)]


def _stream_complete(
    litellm: Any,
    model: str,
    payload: CoachChatInput,
    user_message: str,
):
    context_blob = json.dumps(payload.context.model_dump(), ensure_ascii=True)[:6_000]
    history = payload.messages[-MAX_HISTORY:]
    history_lines = "\n".join(f"{m.role}: {m.content[:800]}" for m in history)

    system = (
        "You are a concise career coach for AI JobMatch Copilot. "
        "Ground every recommendation in the provided Growth Hub context. "
        "Honor durable memorySummary/memoryFacts when present. "
        "Do not invent employers, salaries, or credentials not present in context. "
        "Keep replies under 220 words. Use short paragraphs or simple bullets. "
        "You may use light Markdown only (**bold** for short labels, - for lists). "
        "Do not use headings (#), tables, or HTML."
    )
    user = (
        f"Focus area: {payload.focus}\n"
        f"Growth Hub context JSON:\n{context_blob}\n\n"
        f"Recent messages:\n{history_lines or '(none)'}\n\n"
        f"User just said: {user_message}\n\n"
        "Respond as the coach."
    )

    response = litellm.completion(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.4,
        stream=True,
    )
    for chunk in response:
        try:
            delta = chunk.choices[0].delta.content
        except (AttributeError, IndexError, KeyError, TypeError):
            delta = None
        if delta:
            yield delta



def _template_reply(payload: CoachChatInput, user_message: str) -> str:
    ctx = payload.context
    text = user_message.lower()
    focus = payload.focus or "general"

    if any(k in text for k in ("salary", "comp", "pay", "compensation", "raise")):
        focus = "salary"
    elif any(k in text for k in ("promot", "senior", "lead", "staff")):
        focus = "promotion"
    elif any(k in text for k in ("path", "ladder", "career change", "next role")):
        focus = "career_path"
    elif any(k in text for k in ("roadmap", "learn", "course", "study")):
        focus = "roadmap"
    elif any(k in text for k in ("skill", "gap", "missing", "stack")):
        focus = "skill_gaps"

    if focus == "salary":
        body = ctx.salaryDetail or (
            "Salary signals are limited for your current profile mix. "
            "Update desired roles or skills so Growth Hub can compare more catalog roles."
        )
    elif focus == "promotion":
        open_items = "; ".join(ctx.promotion.checklistOpen[:4]) or "checklist looks complete"
        body = (
            f"Promotion readiness is {ctx.promotion.score}% "
            f"({ctx.promotion.level}) toward {ctx.promotion.targetSeniority or 'the next level'}. "
            f"{ctx.promotion.detail} Open items: {open_items}."
        )
    elif focus == "career_path":
        if ctx.careerPaths:
            body = " ".join(
                f"{p.title} ({p.readinessPct}% ready): {p.detail}" for p in ctx.careerPaths[:3]
            )
        else:
            body = "Add desired roles on your profile so I can suggest clearer career ladders."
    elif focus == "roadmap":
        if ctx.roadmapSteps:
            steps = "; ".join(
                f"{i + 1}. {s.title}"
                + (f" (~{s.estimatedHours}h)" if s.estimatedHours else "")
                for i, s in enumerate(ctx.roadmapSteps[:5])
            )
            body = f"Suggested learning sequence: {steps}."
        else:
            body = "No roadmap steps yet — fill skill gaps or wait for more active catalog jobs."
    else:
        if ctx.topGaps:
            gaps = "; ".join(
                f"{g.skill} ({g.priority}) — {g.reason}" for g in ctx.topGaps[:4]
            )
            body = f"Prioritise these skill gaps: {gaps}."
        else:
            body = (
                ctx.summary
                or "Your profile covers most high-demand skills. Stretch into a harder seniority band."
            )

    return f"{body} Ask a follow-up if you want a weekly plan or negotiation framing."


def _generate_with_llm(
    payload: CoachChatInput,
    user_message: str,
) -> tuple[LlmMetadata, str | None]:
    model = settings.litellm_model
    meta = LlmMetadata(enabled=True, model=model)
    started = time.perf_counter()

    try:
        import litellm
    except ImportError:
        meta.enabled = False
        meta.error = "litellm is not installed (run: INSTALL_LLM=1 pnpm setup:ai)"
        return meta, None

    try:
        reply = _complete(litellm, model, payload, user_message)
        meta.used = True
        meta.durationMs = int((time.perf_counter() - started) * 1000)
        return meta, reply
    except Exception as exc:  # noqa: BLE001 — surface as template fallback
        logger.warning("coach llm failed: %s", exc)
        meta.error = str(exc)[:300]
        meta.durationMs = int((time.perf_counter() - started) * 1000)
        return meta, None


def _complete(litellm: Any, model: str, payload: CoachChatInput, user_message: str) -> str:
    context_blob = json.dumps(payload.context.model_dump(), ensure_ascii=True)[:6_000]
    history = payload.messages[-MAX_HISTORY:]
    history_lines = "\n".join(f"{m.role}: {m.content[:800]}" for m in history)

    system = (
        "You are a concise career coach for AI JobMatch Copilot. "
        "Ground every recommendation in the provided Growth Hub context. "
        "Honor durable memorySummary/memoryFacts when present. "
        "Do not invent employers, salaries, or credentials not present in context. "
        "Keep replies under 220 words. Use short paragraphs or simple bullets. "
        "You may use light Markdown only (**bold** for short labels, - for lists). "
        "Do not use headings (#), tables, or HTML."
    )
    user = (
        f"Focus area: {payload.focus}\n"
        f"Growth Hub context JSON:\n{context_blob}\n\n"
        f"Recent messages:\n{history_lines or '(none)'}\n\n"
        f"User just said: {user_message}\n\n"
        "Respond as the coach."
    )

    kwargs: dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.4,
    }
    response = litellm.completion(**kwargs)
    content = response.choices[0].message.content or ""
    return content.strip()
