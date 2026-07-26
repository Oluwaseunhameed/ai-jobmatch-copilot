"""Evaluation fixtures for resume parsing.

Deliberately synthetic: no real personal data lives in the repository. Each case
covers a layout or content shape that has broken parsing before, and states what a
correct parse looks like.

`headline_any` lists acceptable headline strings (extraction is legitimately
ambiguous). `skills_expected` drives recall; `skills_forbidden` catches false
positives such as picking up a section heading as a skill.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class EvalCase:
    name: str
    description: str
    text: str
    title_hint: str | None = None
    headline_any: list[str] = field(default_factory=list)
    headline_expected_none: bool = False
    summary_contains: str | None = None
    summary_expected_none: bool = False
    summary_forbidden: list[str] = field(default_factory=list)
    skills_expected: list[str] = field(default_factory=list)
    skills_forbidden: list[str] = field(default_factory=list)
    emails_expected: list[str] = field(default_factory=list)


SINGLE_COLUMN = EvalCase(
    name="single_column_standard",
    description="Conventional one-column CV with explicit Summary and Skills sections",
    text="""
Jane Doe
Senior Full-Stack Engineer
jane.doe@example.com | +1 555-010-9988 | Berlin

Summary
Full-stack engineer with 8 years building React and Node.js platforms for fintech
teams, focused on reliability and developer experience.

Skills
TypeScript, React, Next.js, PostgreSQL, Docker, AWS, GraphQL

Work Experience
Acme Corp - Staff Engineer
2021 - Present
- Led the migration to a service-oriented architecture.
- Reduced p95 latency by 40% through query optimisation.

Education
BSc Computer Science, Example University, 2013
""",
    title_hint="Jane Doe CV",
    headline_any=["Senior Full-Stack Engineer"],
    summary_contains="Full-stack engineer with 8 years",
    summary_forbidden=["Skills", "Work Experience"],
    skills_expected=["TypeScript", "React", "Next.js", "PostgreSQL", "Docker", "AWS", "GraphQL"],
    emails_expected=["jane.doe@example.com"],
)

TWO_COLUMN = EvalCase(
    name="two_column_headings_inline",
    description="Two-column layout where headings share a line with their body",
    text="""
Alex Morgan, FullStack Developer
alex@example.com  |  +44 7700 900123  |  London

SUMMARY   An experienced full-stack developer with 5 years in web application
development. Comfortable across front-end and back-
end technologies, including MongoDB and PostgreSQL.

EXPERIENCE   Software Engineer
Northwind Payments 2021 - present | Remote
- Built payment reconciliation services in Python and FastAPI.

SKILLS   Python, FastAPI, MongoDB, PostgreSQL, React, Docker
""",
    headline_any=["FullStack Developer"],
    summary_contains="An experienced full-stack developer",
    # The next heading must not bleed in, and wrapped words must be rejoined.
    summary_forbidden=["EXPERIENCE", "back- end"],
    skills_expected=["Python", "FastAPI", "MongoDB", "PostgreSQL", "React", "Docker"],
)

NO_SUMMARY_SECTION = EvalCase(
    name="no_summary_section",
    description="No summary section at all — must not promote experience bullets",
    text="""
Priya Nair
priya.nair@example.com | Bangalore

Experience
Globex - Data Engineer
2019 - Present
- Instructed 100+ analysts on SQL and Python best practices across the org.
- Built Kafka pipelines feeding a Spark warehouse.

Education
MSc Statistics, Example Institute, 2018

Skills
Python, SQL, Kafka, Spark, Airflow
""",
    headline_expected_none=True,
    summary_expected_none=True,
    skills_expected=["Python", "SQL", "Kafka", "Spark"],
    emails_expected=["priya.nair@example.com"],
)

HEADLINE_FROM_SUMMARY = EvalCase(
    name="headline_only_in_summary",
    description="Header has a name but no role; the role appears in the summary",
    text="""
Sam Okafor
Lagos, Nigeria | sam.okafor@example.com

Professional Summary
Backend engineer with over 6 years of experience designing distributed systems
and payment infrastructure.

Work Experience
Zenith Pay - Engineer
2020 - Present
- Designed an idempotent ledger service in Go.

Technical Skills
Go, Kubernetes, PostgreSQL, Redis, Terraform
""",
    headline_any=["Backend engineer"],
    summary_contains="Backend engineer with over 6 years",
    skills_expected=["Go", "Kubernetes", "PostgreSQL", "Redis", "Terraform"],
)

OBJECTIVE_INLINE = EvalCase(
    name="objective_inline_colon",
    description="Objective section written inline after a colon",
    text="""
Marta Silva
Product Designer
marta@example.com

Objective: Product designer with a decade of B2B SaaS experience seeking to lead
design systems work at a growth-stage company.

Experience
Figma Fan Co - Designer
- Built and maintained a 200-component design system.

Skills
Figma, Design Systems, Accessibility, Prototyping
""",
    headline_any=["Product Designer"],
    summary_contains="Product designer with a decade",
    skills_expected=["Figma"],
    skills_forbidden=["Experience", "Objective"],
)

TITLE_HINT_IS_FILENAME = EvalCase(
    name="title_hint_is_filename",
    description="A resume titled 'New Resume' must never become the headline",
    text="""
Chris Blake
chris.blake@example.com

Experience
Initech - Analyst
- Produced weekly revenue reporting in SQL and Excel.

Skills
SQL, Excel, Tableau
""",
    title_hint="New Resume",
    headline_expected_none=True,
    skills_expected=["SQL"],
    skills_forbidden=["New Resume"],
)

CASES: list[EvalCase] = [
    SINGLE_COLUMN,
    TWO_COLUMN,
    NO_SUMMARY_SECTION,
    HEADLINE_FROM_SUMMARY,
    OBJECTIVE_INLINE,
    TITLE_HINT_IS_FILENAME,
]
