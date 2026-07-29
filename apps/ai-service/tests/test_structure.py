"""Unit tests for resume text structuring heuristics."""

from app.services.structure import structure_resume_text as _structure


def structure_resume_text(text, title_hint=None):
    """Heuristics only: keeps these tests deterministic and offline."""
    return _structure(text, title_hint, use_llm=False)

RESUME = """
Jane Doe
Senior Full-Stack Engineer

jane@example.com
+1 555-010-9988
https://github.com/jane

Summary
Engineer with 8 years building React and Node.js platforms for fintech teams.

Skills
TypeScript, React, Next.js, PostgreSQL, Docker, AWS

Experience
Acme Corp — Staff Engineer
• Led the migration to a service-oriented architecture.
"""


def test_structure_extracts_skills_and_contact():
    result = structure_resume_text(RESUME)
    assert "TypeScript" in result["skills"] or "React" in result["skills"]
    assert "jane@example.com" in result["emails"]
    assert result["source"] in {"heuristic", "heuristic+llm"}


def test_headline_prefers_role_line_over_resume_title():
    result = structure_resume_text(RESUME, title_hint="New Resume")
    assert result["headline"] == "Senior Full-Stack Engineer"


def test_headline_falls_back_to_role_like_title_only():
    text = "Jane Doe\njane@example.com\n\nExperience\nAcme Corp\n"
    assert structure_resume_text(text, title_hint="New Resume")["headline"] is None
    assert (
        structure_resume_text(text, title_hint="Backend Engineer")["headline"]
        == "Backend Engineer"
    )


def test_summary_comes_from_summary_section_without_heading():
    summary = structure_resume_text(RESUME)["summary"]
    assert summary is not None
    assert summary.startswith("Engineer with 8 years")
    assert "Summary" not in summary


def test_summary_reads_inline_heading_form():
    text = "Jane Doe\nProfile: Product designer with a decade of B2B SaaS work.\n"
    summary = structure_resume_text(text)["summary"]
    assert summary == "Product designer with a decade of B2B SaaS work."


def test_summary_is_none_rather_than_experience_bullets():
    text = """
Jane Doe
jane@example.com

Experience
Acme Corp — Instructor
• Instructed 100+ students on core PHP, MySQL, and JavaScript practices daily.
"""
    assert structure_resume_text(text)["summary"] is None


def test_two_column_layout_heading_shares_line_with_body():
    text = (
        "Oluwaseun Hameed, FullStack Developer\n"
        "hameedoluwaseun@example.com | +2348062948801\n"
        "SUMMARY   An experienced Fullstack Developer with 5 years in web application\n"
        "development. Proficient in front-end and back-\n"
        "end technologies.\n"
        "EXPERIENCE   Software Engineer\n"
        "Carbon - FinTech Company 2021 - present\n"
    )
    result = structure_resume_text(text)

    assert result["headline"] == "FullStack Developer"
    assert result["summary"] is not None
    assert result["summary"].startswith("An experienced Fullstack Developer")
    # The next section's heading must not bleed into the summary.
    assert "EXPERIENCE" not in result["summary"]
    # Words split across a line break are rejoined.
    assert "backend technologies" in result["summary"]


def test_headline_derived_from_summary_when_header_has_no_role():
    text = """
Oluwaseun Hameed
lagos, nigeria

Summary
Full-stack software engineer with over 8 years of experience designing scalable apps.

Work Experience
Acme Corp
"""
    assert structure_resume_text(text)["headline"] == "Full-stack software engineer"


def test_summary_strips_bullet_markers():
    text = """
Jane Doe

Summary
• Full-stack engineer focused on developer tooling and platform reliability work.
"""
    summary = structure_resume_text(text)["summary"]
    assert summary is not None
    assert not summary.startswith("•")


def test_extracts_experience_and_education_sections():
    text = """
Jane Doe
Software Engineer

Summary
Backend engineer building APIs.

Experience
Senior Software Engineer | Acme Corp
Jan 2021 – Present
• Built payment APIs in TypeScript.

Software Engineer | Beta LLC
2018 – 2020
• Maintained internal tools.

Education
B.S. Computer Science — MIT
2014 – 2018

Skills
TypeScript, Python, PostgreSQL
"""
    result = structure_resume_text(text)

    assert len(result["experience"]) >= 1
    assert result["experience"][0]["title"]
    assert result["experience"][0]["company"]
    assert len(result["education"]) >= 1
    assert "MIT" in result["education"][0]["school"] or result["education"][0]["school"]


def test_extracts_city_and_country_from_header():
    text = """
Jane Doe
Senior Engineer
Lagos, Nigeria
jane@example.com
+234 806 294 8801

Summary
Engineer based in Lagos building APIs.
"""
    result = structure_resume_text(text)
    assert result["city"] == "Lagos"
    assert result["country"] == "Nigeria"
