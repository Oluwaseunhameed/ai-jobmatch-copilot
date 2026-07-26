"""Unit tests for resume text extraction."""

import pytest

from app.services.extract import ExtractionError, extract_text
from app.services.extract import _normalize


def test_normalize_keeps_column_gaps_but_collapses_small_runs():
    normalized = _normalize("SUMMARY        An engineer\nRole  Title")

    assert "SUMMARY   An engineer" in normalized
    assert "Role Title" in normalized


def test_normalize_trims_trailing_space_and_extra_blank_lines():
    assert _normalize("a   \n\n\n\nb") == "a\n\nb"


def test_legacy_doc_is_rejected_with_actionable_message():
    with pytest.raises(ExtractionError, match="Legacy .doc"):
        extract_text(b"anything", "resume.doc", "application/msword")


def test_unsupported_extension_is_rejected():
    with pytest.raises(ExtractionError, match="PDF and DOCX"):
        extract_text(b"anything", "resume.txt", "text/plain")


def test_corrupt_pdf_raises_extraction_error():
    with pytest.raises(ExtractionError):
        extract_text(b"not really a pdf", "resume.pdf", "application/pdf")
