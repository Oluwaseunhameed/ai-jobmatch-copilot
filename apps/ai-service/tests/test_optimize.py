from __future__ import annotations

import pytest

from app.services.optimize import OptimizeJobInput, OptimizeResumeInput, optimize_resume, score_resume


def test_score_resume_coverage():
    score = score_resume(
        skills=["TypeScript", "React"],
        text="Built APIs with Node",
        keywords=["TypeScript", "React", "GraphQL", "AWS"],
    )
    assert score.score == 50
    assert score.matchedKeywords == ["TypeScript", "React"]
    assert score.missingKeywords == ["GraphQL", "AWS"]


def test_optimize_degrades_without_llm(monkeypatch: pytest.MonkeyPatch):
    from app.config import settings

    monkeypatch.setattr(settings, "llm_optimize_enabled", False)

    result = optimize_resume(
        OptimizeResumeInput(
            resume_text="Senior engineer focused on React.",
            headline="Frontend Engineer",
            summary="I build product UIs.",
            skills=["React", "CSS"],
            job=OptimizeJobInput(
                title="Frontend Engineer",
                description="Need React and TypeScript",
                skills=["React", "TypeScript", "GraphQL"],
            ),
        )
    )

    assert result.source == "heuristic"
    assert result.llm.used is False
    assert result.before.atsScore.score >= 0
    assert "TypeScript" in result.after.skills or "TypeScript" in (result.after.summary or "")
    assert result.after.atsScore.score >= result.before.atsScore.score
