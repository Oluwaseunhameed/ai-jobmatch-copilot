"""Resume parsing endpoints — extract text + structure fields."""

from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.services.extract import ExtractionError, extract_text
from app.services.structure import structure_resume_text

router = APIRouter(prefix="/v1/resumes", tags=["resumes"])

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
}
MAX_BYTES = 5 * 1024 * 1024


class LlmMetadata(BaseModel):
    """Why enrichment did or did not happen — surfaced so failures are observable."""

    enabled: bool = False
    used: bool = False
    model: str | None = None
    error: str | None = None
    durationMs: int | None = None


class ParsedResume(BaseModel):
    file_name: str
    mime_type: str
    file_size: int
    text: str = Field(description="Extracted plain text")
    skills: list[str] = Field(default_factory=list)
    headline: str | None = None
    summary: str | None = None
    emails: list[str] = Field(default_factory=list)
    phones: list[str] = Field(default_factory=list)
    links: list[str] = Field(default_factory=list)
    source: str = "heuristic"
    status: str = "ready"
    llm: LlmMetadata = Field(default_factory=LlmMetadata)


@router.post("/parse", response_model=ParsedResume)
async def parse_resume(
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
) -> ParsedResume:
    """Parse a PDF/DOCX resume into text + structured fields."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="File name is required")

    content_type = file.content_type or "application/octet-stream"
    lower = file.filename.lower()
    if content_type not in ALLOWED_CONTENT_TYPES:
        if not (lower.endswith(".pdf") or lower.endswith(".docx") or lower.endswith(".doc")):
            raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")

    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="File is empty")
    if len(payload) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="File must be 5 MB or smaller")

    try:
        text = extract_text(payload, file.filename, content_type)
    except ExtractionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    if not text.strip():
        raise HTTPException(
            status_code=422,
            detail="No readable text found in this file. Try another export or format.",
        )

    structured = structure_resume_text(text, title_hint=title)

    return ParsedResume(
        file_name=file.filename,
        mime_type=content_type,
        file_size=len(payload),
        text=text,
        skills=list(structured.get("skills") or []),
        headline=structured.get("headline"),
        summary=structured.get("summary"),
        emails=list(structured.get("emails") or []),
        phones=list(structured.get("phones") or []),
        links=list(structured.get("links") or []),
        source=str(structured.get("source") or "heuristic"),
        status="ready",
        llm=LlmMetadata(**(structured.get("llm") or {})),
    )
