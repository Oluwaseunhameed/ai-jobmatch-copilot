"""Tests for career coach template path."""

from app.services.coach import CoachChatInput, CoachContext, CoachGap, CoachPromotion, chat


def test_coach_template_skill_gaps():
    result = chat(
        CoachChatInput(
            focus="general",
            user_message="What skill gaps should I close?",
            context=CoachContext(
                summary="Focus on TypeScript",
                topGaps=[
                    CoachGap(skill="TypeScript", priority="high", reason="High demand"),
                ],
                promotion=CoachPromotion(score=50, level="partial", targetSeniority="senior"),
            ),
        )
    )
    assert result.source in {"template", "llm"}
    assert "TypeScript" in result.reply


def test_coach_empty_message():
    result = chat(CoachChatInput(user_message="   "))
    assert "skill gaps" in result.reply.lower()
