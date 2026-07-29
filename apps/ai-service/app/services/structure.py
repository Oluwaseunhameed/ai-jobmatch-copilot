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
    experience = _extract_experience(lines)
    education = _extract_education(lines)
    location = _extract_location(lines)

    return {
        "headline": headline,
        "summary": summary,
        "skills": skills,
        "emails": emails[:3],
        "phones": phones,
        "links": urls,
        "city": location.get("city"),
        "country": location.get("country"),
        "experience": experience,
        "education": education,
        "source": "heuristic",
    }


_US_STATES = (
    "AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|"
    "NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC"
)
_COUNTRIES = (
    "United States|USA|U\\.S\\.A\\.|U\\.S\\.|United Kingdom|UK|Canada|Australia|Germany|"
    "France|Netherlands|Spain|Italy|Ireland|India|Nigeria|Kenya|Ghana|South Africa|"
    "Brazil|Mexico|Singapore|Japan|China|UAE|United Arab Emirates|Saudi Arabia|Poland|"
    "Sweden|Norway|Denmark|Finland|Switzerland|Portugal|Belgium|Austria|New Zealand|"
    "Philippines|Indonesia|Malaysia|Pakistan|Bangladesh|Egypt|Israel|Turkey|Argentina|"
    "Chile|Colombia|Romania|Czech Republic|Czechia"
)
_CITY_COUNTRY_RE = re.compile(
    rf"\b([A-Z][A-Za-z.'\- ]{{1,40}}),\s*({_COUNTRIES}|{_US_STATES})\b"
)
_COUNTRY_ONLY_RE = re.compile(rf"\b({_COUNTRIES})\b", re.I)
_LOCATION_LABEL_RE = re.compile(
    r"(?i)^(?:location|based\s+in|residing\s+in|lives?\s+in)\s*[:\-]?\s*(.+)$"
)


def _normalize_country(token: str) -> str:
    t = token.strip()
    if re.fullmatch(r"(?i)usa|u\.s\.a\.|u\.s\.", t) or re.fullmatch(_US_STATES, t, re.I):
        return "United States"
    if re.fullmatch(r"(?i)uk|u\.k\.", t):
        return "United Kingdom"
    if re.fullmatch(r"(?i)uae", t):
        return "United Arab Emirates"
    if re.fullmatch(r"(?i)czechia", t):
        return "Czech Republic"
    return t[:80]


def _extract_location(lines: list[str]) -> dict[str, str | None]:
    """Best-effort city/country from the resume header."""
    for line in lines[:15]:
        if BODY_HEADING_RE.match(line) or BODY_INLINE_RE.match(line):
            break
        if EMAIL_RE.search(line) or URL_RE.search(line):
            continue
        labeled = _LOCATION_LABEL_RE.match(line)
        candidate = labeled.group(1).strip() if labeled else line
        match = _CITY_COUNTRY_RE.search(candidate)
        if match:
            return {
                "city": re.sub(r"\s+", " ", match.group(1).strip())[:80],
                "country": _normalize_country(match.group(2)),
            }
        country_only = _COUNTRY_ONLY_RE.search(candidate)
        if country_only and len(candidate) <= 60:
            before = candidate[: country_only.start()].rstrip(" ,-|•").strip()
            return {
                "city": before[:80] if 2 <= len(before) <= 40 else None,
                "country": _normalize_country(country_only.group(1)),
            }
    return {"city": None, "country": None}


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


DATE_RANGE_RE = re.compile(
    r"(?i)\b("
    r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}"
    r"|\d{4}"
    r")\s*[–\-—to]+\s*("
    r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}"
    r"|\d{4}"
    r"|present|current|now"
    r")\b"
)

YEAR_RE = re.compile(r"\b((?:19|20)\d{2})\b")


def _section_lines(lines: list[str], start_words: str) -> list[str]:
    """Collect body lines under a section heading until the next major heading."""
    start_only = _heading_only(start_words)
    start_inline = _heading_with_body(start_words)
    collecting = False
    collected: list[str] = []

    for line in lines:
        if collecting:
            if SECTION_HEADING_RE.match(line) or SECTION_INLINE_RE.match(line):
                # Another section started.
                if not start_only.match(line) and not start_inline.match(line):
                    break
            collected.append(BULLET_RE.sub("", line).strip())
            continue

        if start_only.match(line):
            collecting = True
            continue

        inline = start_inline.match(line)
        if inline:
            collecting = True
            body = (inline.group("body") or "").strip()
            if body:
                collected.append(BULLET_RE.sub("", body).strip())

    return [ln for ln in collected if ln]


def _split_entries(section: list[str]) -> list[list[str]]:
    """Split a section into entry blocks on blank-ish separators / date headers."""
    if not section:
        return []

    entries: list[list[str]] = []
    current: list[str] = []

    for line in section:
        looks_like_new = bool(DATE_RANGE_RE.search(line)) and current
        # New block when we hit a short header-like line after bullets/description.
        if looks_like_new and current and not DATE_RANGE_RE.search(current[0]):
            # Date on its own line often follows a title/company header — keep attached.
            current.append(line)
            continue

        if (
            current
            and len(line) <= 90
            and not BULLET_RE.match(line)
            and not line.startswith(("•", "-", "*"))
            and DATE_RANGE_RE.search(current[-1] if current else "")
            and not DATE_RANGE_RE.search(line)
        ):
            entries.append(current)
            current = [line]
            continue

        if (
            current
            and len(current) >= 2
            and len(line) <= 80
            and ROLE_RE.search(line)
            and not DATE_RANGE_RE.search(line)
            and DATE_RANGE_RE.search(" ".join(current[:3]))
        ):
            entries.append(current)
            current = [line]
            continue

        current.append(line)

    if current:
        entries.append(current)
    return entries[:12]


def _normalize_month(token: str) -> str | None:
    token = token.strip()
    if re.fullmatch(r"(?i)present|current|now", token):
        return "Present"
    if re.fullmatch(r"\d{4}", token):
        return token
    match = re.match(
        r"(?i)(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{4})",
        token,
    )
    if not match:
        return token[:32] if token else None
    months = {
        "jan": "Jan",
        "feb": "Feb",
        "mar": "Mar",
        "apr": "Apr",
        "may": "May",
        "jun": "Jun",
        "jul": "Jul",
        "aug": "Aug",
        "sep": "Sep",
        "sept": "Sep",
        "oct": "Oct",
        "nov": "Nov",
        "dec": "Dec",
    }
    return f"{months[match.group(1).lower()]} {match.group(2)}"


def _date_range(text: str) -> tuple[str | None, str | None, bool]:
    match = DATE_RANGE_RE.search(text)
    if not match:
        return None, None, False
    start = _normalize_month(match.group(1))
    end_raw = match.group(2)
    is_current = bool(re.fullmatch(r"(?i)present|current|now", end_raw.strip()))
    end = "Present" if is_current else _normalize_month(end_raw)
    return start, end, is_current


def _extract_experience(lines: list[str]) -> list[dict[str, Any]]:
    section = _section_lines(
        lines,
        r"work\s+experience|professional\s+experience|experience|employment(?:\s+history)?",
    )
    if not section:
        return []

    entries: list[dict[str, Any]] = []
    for block in _split_entries(section):
        if not block:
            continue
        joined = " | ".join(block[:4])
        start, end, is_current = _date_range(joined)
        header = block[0]
        # Common patterns: "Title — Company", "Title | Company", "Company — Title"
        parts = re.split(r"\s*[|•·/–—\-]\s*", header, maxsplit=1)
        title = parts[0].strip()
        company = parts[1].strip() if len(parts) > 1 else ""

        if not company and len(block) > 1 and not DATE_RANGE_RE.search(block[1]):
            company = block[1].strip()

        # If header looks like a company (no role words) and next line is a role, swap.
        if company and ROLE_RE.search(company) and not ROLE_RE.search(title):
            title, company = company, title
        elif not ROLE_RE.search(title) and company and ROLE_RE.search(title) is None:
            # Prefer role-like string as title when possible.
            if ROLE_RE.search(company):
                title, company = company, title

        if not title or len(title) < 2:
            continue
        if not company:
            # Skip untitled companies — too noisy for profile apply.
            if not start:
                continue
            company = "Unknown"

        description_lines = [
            ln
            for ln in block[1:]
            if ln != company and not DATE_RANGE_RE.fullmatch(ln.strip())
        ]
        description = "\n".join(description_lines[:8]).strip() or None

        entries.append(
            {
                "title": title[:120],
                "company": company[:120],
                "location": None,
                "startMonth": start,
                "endMonth": end,
                "isCurrent": is_current,
                "description": (description[:2000] if description else None),
                "highlights": [],
            }
        )

    return entries[:8]


DEGREE_RE = re.compile(
    r"(?i)\b(ph\.?d\.?|m\.?s\.?|m\.?eng\.?|m\.?b\.?a\.?|b\.?s\.?|b\.?a\.?|b\.?eng\.?|"
    r"bachelor(?:'s)?|master(?:'s)?|doctorate|associate(?:'s)?|diploma|certificate)\b"
)


def _extract_education(lines: list[str]) -> list[dict[str, Any]]:
    section = _section_lines(lines, r"education")
    if not section:
        return []

    entries: list[dict[str, Any]] = []
    for block in _split_entries(section):
        if not block:
            continue
        header = block[0]
        years = YEAR_RE.findall(" ".join(block))
        start_year = int(years[0]) if years else None
        end_year = int(years[-1]) if len(years) > 1 else (int(years[0]) if years else None)

        degree = None
        field = None
        school = header
        degree_match = DEGREE_RE.search(header)
        if degree_match:
            degree = degree_match.group(0)
            # "B.S. in Computer Science — MIT" style
            rest = header[degree_match.end() :].strip(" ,-|–—:in")
            if " at " in rest.lower():
                field_part, school_part = re.split(r"(?i)\s+at\s+", rest, maxsplit=1)
                field = field_part.strip(" ,-|–—") or None
                school = school_part.strip(" ,-|–—") or header
            elif " - " in rest or " – " in rest or " — " in rest or "|" in rest:
                bits = re.split(r"\s*[|–—\-]\s*", rest, maxsplit=1)
                field = bits[0].strip(" ,") or None
                school = bits[1].strip(" ,") if len(bits) > 1 else header
            else:
                field = rest or None
                school = block[1] if len(block) > 1 else header

        if len(block) > 1 and school == header and not degree_match:
            # "MIT" then "B.S. Computer Science"
            if DEGREE_RE.search(block[1]):
                school = header
                degree_line = block[1]
                degree_match = DEGREE_RE.search(degree_line)
                degree = degree_match.group(0) if degree_match else degree_line
                field = degree_line[degree_match.end() :].strip(" ,-|–—:in") if degree_match else None

        school = (school or "").strip()
        if len(school) < 2:
            continue

        entries.append(
            {
                "school": school[:160],
                "degree": (degree[:120] if degree else None),
                "field": (field[:160] if field else None),
                "startYear": start_year,
                "endYear": end_year,
                "description": None,
            }
        )

    return entries[:6]
