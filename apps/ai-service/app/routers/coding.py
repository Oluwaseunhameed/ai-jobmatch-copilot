"""Coding review endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.services.coding import CodingReviewInput, CodingReviewResponse, review_code

router = APIRouter(prefix="/v1/coding", tags=["coding"])


@router.post("/review", response_model=CodingReviewResponse)
async def coding_review(body: CodingReviewInput) -> CodingReviewResponse:
    return review_code(body)
