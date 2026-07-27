"""Application materials endpoints — cover letter + short answers."""

from __future__ import annotations

from fastapi import APIRouter

from app.services.application import (
    ApplicationGenerateInput,
    ApplicationGenerateResponse,
    generate_application,
)

router = APIRouter(prefix="/v1/applications", tags=["applications"])


@router.post("/generate", response_model=ApplicationGenerateResponse)
async def generate_application_materials(
    body: ApplicationGenerateInput,
) -> ApplicationGenerateResponse:
    """Generate a cover letter and short answers for a resume + job pair."""
    return generate_application(body)
