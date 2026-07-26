"""Turn resume text into structured fields (heuristic + optional LLM)."""

from __future__ import annotations

import logging
import re
from typing import Any

import app.services.llm as llm

logger = logging.getLogger(__name__)

# Practical keyword bank for MVP matching — not exhaustive, intentionally curated.
KNOWN_SKILLS = [
    "TypeScript",
    "JavaScript",
    "Python",
    "Java",
    "Go",
    "Rust",
    "C#",
    "C++",
    "SQL",
    "PostgreSQL",
    "MySQL",
    "MongoDB",
    "Redis",
    "React",
    "Next.js",
    "Node.js",
    "NestJS",
    "Express",
    "Django",
    "Flask",
    "FastAPI",
    "Spring",
    "Kubernetes",
    "Docker",
    "AWS",
    "GCP",
    "Azure",
    "Terraform",
    "GraphQL",
    "REST",
    "Prisma",
    "Tailwind",
    "Vue",
    "Angular",
    "Swift",
    "Kotlin",
    "PHP",
    "Laravel",
    "Ruby",
    "Rails",
    "Scala",
    "Spark",
    "Pandas",
    "NumPy",
    "TensorFlow",
    "PyTorch",
    "scikit-learn",
    "Hugging Face",
    "OpenAI",
    "LangChain",
    "Elasticsearch",
    "Kafka",
    "RabbitMQ",
    "CI/CD",
    "Git",
    "GitHub Actions",
    "Jest",
    "Cypress",
    "Playwright",
    "Selenium",
    "Figma",
    "Agile",
    "Scrum",
    "Leadership",
    "Communication",
    "Problem Solving",
]


EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I)
PHONE_RE = re.compile(r"(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}")
URL_RE = re.compile(r"https?://[^\s)]+|www\.[^\s)]+", re.I)

# A headline should read like a role, not like a file name or a person's name.
ROLE_WORDS = (
    r"engineer|engineering|developer|programmer|architect|designer|analyst|scientist|"
    r"manager|director|consultant|specialist|administrator|advisor|officer|"
    r"lead|head\s+of|founder|co-founder|intern|technician|marketer|copywriter|writer|"
    r"editor|accountant|recruiter|strategist|researcher|instructor|teacher|lecturer|"
    r"product\s+owner|scrum\s+master|devops|sre|qa|tester|"
    r"full[-\s]?stack|front[-\s]?end|back[-\s]?end"
)
ROLE_RE = re.compile(rf"(?i)\b(?:{ROLE_WORDS})\b")

SUMMARY_WORDS = (
    r"professional\s+summary|executive\s+summary|summary|profile|personal\s+profile|"
    r"about\s+me|about|objective|career\s+objective"
)

SECTION_WORDS = (
    r"work\s+experience|professional\s+experience|experience|employment(?:\s+history)?|"
    r"education|technical\s+skills|additional\s+skills|core\s+competencies|skills|"
    r"projects|certifications?|awards?|publications?|languages?|interests|hobbies|"
    r"references?|volunteer(?:ing)?|achievements?|contact"
)

# Reaching one of these means the header block is over, so stop hunting for a headline.
BODY_WORDS = (
    r"work\s+experience|professional\s+experience|experience|"
    r"employment(?:\s+history)?|education|projects"
)


def _heading_only(words: str) -> re.Pattern[str]:
    """Heading alone on its line: "Summary" / "SUMMARY:"."""
    return re.compile(rf"(?i)^[ ]*(?:{words})[ ]*[:\-–—]?[ ]*$")


def _heading_with_body(words: str) -> re.Pattern[str]:
    """Heading followed by its body on the same line, as two-column PDFs extract."""
    return re.compile(rf"(?i)^[ ]*(?:{words})[ ]*(?:[:\-–—][ ]*|[ ]{{2,}})(?P<body>\S.*)$")


SUMMARY_HEADING_RE = _heading_only(SUMMARY_WORDS)
SUMMARY_INLINE_RE = _heading_with_body(SUMMARY_WORDS)
SECTION_HEADING_RE = _heading_only(SECTION_WORDS)
SECTION_INLINE_RE = _heading_with_body(SECTION_WORDS)
BODY_HEADING_RE = _heading_only(BODY_WORDS)
BODY_INLINE_RE = _heading_with_body(BODY_WORDS)

SECTION_BOUNDARY_RE = re.compile(
    rf"(?im)^[ ]*(?:{SECTION_WORDS})[ ]*(?:[:\-–—]|[ ]{{2,}}|$)"
)

BULLET_RE = re.compile(r"^[ ]*[•·▪◦‣*\-–—]+[ ]*")

# Modifiers that add nothing to a headline derived from summary prose.
FILLER_PREFIX_RE = re.compile(
    r"(?i)^(?:an?|the|highly|very|experienced|seasoned|passionate|motivated|dedicated|"
    r"results[-\s]driven|detail[-\s]oriented|self[-\s]motivated|skilled|proven)\s+"
)


def structure_resume_text(
    text: str,
    title_hint: str | None = None,
    *,
    use_llm: bool = True,
) -> dict[str, Any]:
    """Return structured resume data.

    Heuristics always run and always succeed. LLM enrichment is layered on top when
    available, and its outcome is reported under the ``llm`` key either way.
    """
    heuristic = _heuristic_structure(text, title_hint)

    if not use_llm:
        return {**heuristic, "llm": llm.LlmOutcome(enabled=False).as_metadata()}

    return llm.merge(heuristic, llm.enrich(text))


def _heuristic_structure(text: str, title_hint: str | None = None) -> dict[str, Any]:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    emails = EMAIL_RE.findall(text)
    phones = [p.strip() for p in PHONE_RE.findall(text) if len(re.sub(r"\D", "", p)) >= 7][:3]
    urls = URL_RE.findall(text)[:8]

    summary = _extract_summary(text, lines)
    headline = _extract_headline(lines, title_hint, summary)
    skills = _extract_skills(text)

    return {
        "headline": headline,
        "summary": summary,
        "skills": skills,
        "emails": emails[:3],
        "phones": phones,
        "links": urls,
        "source": "heuristic",
    }


def _extract_headline(
    lines: list[str],
    title_hint: str | None = None,
    summary: str | None = None,
) -> str | None:
    """Pick a role-like headline, preferring the header block of the resume.

    The resume title is only trusted when it reads like a job title — otherwise a
    file name such as "New Resume" would end up as the user's profile headline.
    """
    for line in lines[:15]:
        if BODY_HEADING_RE.match(line) or BODY_INLINE_RE.match(line):
            break
        if SUMMARY_HEADING_RE.match(line) or SUMMARY_INLINE_RE.match(line):
            break
        if SECTION_HEADING_RE.match(line) or SECTION_INLINE_RE.match(line):
            continue
        if EMAIL_RE.search(line) or URL_RE.search(line):
            continue

        candidate = _role_segment(line)
        if candidate:
            return candidate

    if title_hint and ROLE_RE.search(title_hint):
        return title_hint.strip()[:120]

    return _headline_from_summary(summary)


def _role_segment(line: str) -> str | None:
    """Return the role-bearing part of a line, splitting merged header lines."""
    for segment in re.split(r"[|•·]|[ ]{3,}", line):
        cleaned = BULLET_RE.sub("", segment).strip(" ,;·|")
        if not ROLE_RE.search(cleaned):
            continue
        if EMAIL_RE.search(cleaned) or URL_RE.search(cleaned):
            continue

        # "Jane Doe, Full-Stack Developer" — keep the role, drop the name.
        for part in reversed(cleaned.split(",")):
            trimmed = part.strip()
            if 4 <= len(trimmed) <= 120 and ROLE_RE.search(trimmed):
                return trimmed

        if 4 <= len(cleaned) <= 120:
            return cleaned

    return None


def _headline_from_summary(summary: str | None) -> str | None:
    """Last resort: lift the role phrase out of the opening of the summary."""
    if not summary:
        return None

    first_sentence = re.split(r"(?<=[.!?])\s", summary.strip(), maxsplit=1)[0]
    stripped = FILLER_PREFIX_RE.sub("", first_sentence).strip()

    match = re.match(
        rf"(?i)((?:[A-Za-z][A-Za-z./+&-]*[ ]){{0,3}}(?:{ROLE_WORDS}))\b",
        stripped,
    )
    if not match:
        return None

    candidate = FILLER_PREFIX_RE.sub("", match.group(1)).strip(" ,;-")
    return candidate[:120] if len(candidate) >= 4 else None


def _extract_summary(text: str, lines: list[str]) -> str | None:
    explicit = _summary_from_section(lines)
    if explicit:
        return explicit
    return _summary_from_lead_paragraph(text)


def _summary_from_section(lines: list[str]) -> str | None:
    """Read the body of an explicit Summary/Profile/Objective section."""
    for index, line in enumerate(lines):
        inline = SUMMARY_INLINE_RE.match(line)
        if inline:
            body = _collect_body([inline.group("body"), *lines[index + 1 :]])
            if len(body) >= 40:
                return body[:600]
            continue

        if SUMMARY_HEADING_RE.match(line):
            body = _collect_body(lines[index + 1 :])
            if len(body) >= 40:
                return body[:600]

    return None


def _collect_body(candidates: list[str], max_lines: int = 8) -> str:
    """Join lines until the next section heading, stripping bullet markers."""
    collected: list[str] = []
    for line in candidates[:max_lines]:
        if _is_heading(line):
            break

        # In two-column layouts the next section's heading shares the line.
        inline = SECTION_INLINE_RE.match(line) or SUMMARY_INLINE_RE.match(line)
        if inline:
            break

        cleaned = BULLET_RE.sub("", line).strip()
        if cleaned:
            collected.append(cleaned)

    return _join_wrapped_lines(collected)


def _join_wrapped_lines(lines: list[str]) -> str:
    """Join lines, repairing words split across a PDF line break ("back-" + "end")."""
    joined = ""
    for line in lines:
        if not joined:
            joined = line
            continue
        if re.search(r"[A-Za-z]-$", joined):
            joined = joined[:-1] + line.lstrip()
        else:
            joined = f"{joined} {line}"

    return re.sub(r"\s+", " ", joined).strip()


def _is_heading(line: str) -> bool:
    return bool(SECTION_HEADING_RE.match(line) or SUMMARY_HEADING_RE.match(line))


def _summary_from_lead_paragraph(text: str) -> str | None:
    """Fallback: first prose paragraph before any experience/education section.

    Returning None is preferable to returning experience bullets, which read badly
    as a profile summary.
    """
    head = SECTION_BOUNDARY_RE.split(text, maxsplit=1)[0]
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", head) if p.strip()]

    for paragraph in paragraphs[:5]:
        if EMAIL_RE.search(paragraph) or URL_RE.search(paragraph):
            continue
        cleaned = _join_wrapped_lines(
            [BULLET_RE.sub("", line).strip() for line in paragraph.splitlines() if line.strip()]
        )
        if len(cleaned) >= 80:
            return cleaned[:600]

    return None


def _extract_skills(text: str) -> list[str]:
    found: list[str] = []
    lower = text.lower()
    for skill in KNOWN_SKILLS:
        pattern = r"(?<![A-Za-z0-9])" + re.escape(skill.lower()) + r"(?![A-Za-z0-9])"
        if re.search(pattern, lower):
            found.append(skill)

    # Also pull comma/pipe lists under a Skills heading.
    skills_section = re.search(
        r"(?is)skills?\s*[:\-]?\s*(.+?)(?:\n\s*\n|experience|education|projects|work history|$)",
        text,
    )
    if skills_section:
        blob = skills_section.group(1)
        for token in re.split(r"[,|/•·\n]", blob):
            name = token.strip(" -\t")
            if 1 < len(name) <= 40 and name.lower() not in {s.lower() for s in found}:
                if re.fullmatch(r"[A-Za-z0-9.+#\s\-]+", name):
                    found.append(name)

    # Dedupe preserving order
    seen: set[str] = set()
    unique: list[str] = []
    for skill in found:
        key = skill.lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(skill)
    return unique[:40]
