from __future__ import annotations

from app.services.application import (
    ApplicationGenerateInput,
    ApplicationJobInput,
    DEFAULT_QUESTIONS,
    generate_application,
    normalize_questions,
)


def test_normalize_questions_defaults():
    assert normalize_questions([]) == DEFAULT_QUESTIONS
    assert len(normalize_questions(["A", "B", "C", "D"])) == 3


def test_generate_template_without_llm(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "llm_application_enabled", False)

    result = generate_application(
        ApplicationGenerateInput(
            resume_text="Built APIs with TypeScript and React.",
            candidate_name="Alex Example",
            headline="Software Engineer",
            summary="I ship product features end to end.",
            skills=["TypeScript", "React"],
            job=ApplicationJobInput(
                title="Frontend Engineer",
                company_name="Acme",
                description="Need React experience",
                skills=["React", "TypeScript"],
            ),
            questions=[],
        )
    )

    assert result.source == "template"
    assert result.llm.used is False
    assert "Frontend Engineer" in result.coverLetter
    assert "Acme" in result.coverLetter
    assert "Alex Example" in result.coverLetter
    assert len(result.answers) == 3
    assert all(a.answer for a in result.answers)
