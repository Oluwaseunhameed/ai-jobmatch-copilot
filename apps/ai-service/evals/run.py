"""Score resume parsing against the eval fixtures.

Usage:
    pnpm eval:ai                 # heuristics only (fast, offline, deterministic)
    pnpm eval:ai -- --llm        # include LLM enrichment
    pnpm eval:ai -- --llm --json # machine-readable output

The point is comparability: run it before and after a prompt or heuristic change and
compare the score. Without this, "the AI got better" is an opinion.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.structure import structure_resume_text  # noqa: E402
from evals.cases import CASES, EvalCase  # noqa: E402


@dataclass
class CaseScore:
    name: str
    checks_passed: int = 0
    checks_total: int = 0
    failures: list[str] = field(default_factory=list)
    duration_ms: int = 0
    llm_used: bool = False
    llm_error: str | None = None

    @property
    def ratio(self) -> float:
        return self.checks_passed / self.checks_total if self.checks_total else 0.0


def _check(score: CaseScore, ok: bool, label: str) -> None:
    score.checks_total += 1
    if ok:
        score.checks_passed += 1
    else:
        score.failures.append(label)


def _norm(value: str) -> str:
    return " ".join(value.lower().split())


def _contains_phrase(haystack: str, needle: str) -> bool:
    """Word-boundary containment.

    Plain substring matching is too loose here: the token "experience" would match
    inside "experienced" and report a leak that does not exist.
    """
    pattern = r"(?<![A-Za-z0-9])" + re.escape(_norm(needle)) + r"(?![A-Za-z0-9])"
    return re.search(pattern, _norm(haystack)) is not None


def score_case(case: EvalCase, *, use_llm: bool) -> CaseScore:
    started = time.monotonic()
    result = structure_resume_text(case.text, case.title_hint, use_llm=use_llm)
    duration_ms = int((time.monotonic() - started) * 1000)

    llm_meta = result.get("llm") or {}
    score = CaseScore(
        name=case.name,
        duration_ms=duration_ms,
        llm_used=bool(llm_meta.get("used")),
        llm_error=llm_meta.get("error"),
    )

    headline = result.get("headline")
    summary = result.get("summary")
    skills = [str(s) for s in (result.get("skills") or [])]
    skills_lower = {_norm(s) for s in skills}
    emails = [str(e) for e in (result.get("emails") or [])]

    if case.headline_expected_none:
        _check(score, headline is None, f"headline should be None, got {headline!r}")
    elif case.headline_any:
        _check(
            score,
            headline is not None and any(_norm(h) == _norm(headline) for h in case.headline_any),
            f"headline {headline!r} not in {case.headline_any}",
        )

    if case.summary_expected_none:
        _check(score, summary is None, f"summary should be None, got {summary!r}")
    elif case.summary_contains:
        _check(
            score,
            summary is not None and _contains_phrase(summary, case.summary_contains),
            f"summary missing {case.summary_contains!r}",
        )

    for forbidden in case.summary_forbidden:
        _check(
            score,
            summary is None or not _contains_phrase(summary, forbidden),
            f"summary must not contain {forbidden!r}",
        )

    for expected in case.skills_expected:
        _check(score, _norm(expected) in skills_lower, f"missing skill {expected!r}")

    for forbidden in case.skills_forbidden:
        _check(score, _norm(forbidden) not in skills_lower, f"unexpected skill {forbidden!r}")

    for expected in case.emails_expected:
        _check(score, expected in emails, f"missing email {expected!r}")

    return score


def main() -> int:
    parser = argparse.ArgumentParser(description="Resume parsing eval harness")
    parser.add_argument("--llm", action="store_true", help="enable LLM enrichment")
    parser.add_argument("--json", action="store_true", help="emit JSON instead of a table")
    args = parser.parse_args()

    scores = [score_case(case, use_llm=args.llm) for case in CASES]

    passed = sum(s.checks_passed for s in scores)
    total = sum(s.checks_total for s in scores)
    overall = passed / total if total else 0.0
    perfect_cases = sum(1 for s in scores if s.ratio == 1.0)

    if args.json:
        print(
            json.dumps(
                {
                    "mode": "heuristic+llm" if args.llm else "heuristic",
                    "checksPassed": passed,
                    "checksTotal": total,
                    "score": round(overall, 4),
                    "casesPerfect": perfect_cases,
                    "casesTotal": len(scores),
                    "cases": [
                        {
                            "name": s.name,
                            "passed": s.checks_passed,
                            "total": s.checks_total,
                            "durationMs": s.duration_ms,
                            "llmUsed": s.llm_used,
                            "llmError": s.llm_error,
                            "failures": s.failures,
                        }
                        for s in scores
                    ],
                },
                indent=2,
            )
        )
        return 0 if passed == total else 1

    mode = "heuristic + LLM" if args.llm else "heuristic only"
    print(f"\nResume parsing eval — {mode}\n")
    print(f"{'case':<32} {'score':>7} {'time':>8}  notes")
    print("-" * 78)

    for s in scores:
        note = "ok" if s.ratio == 1.0 else f"{len(s.failures)} failed"
        if s.llm_error:
            note += f" | llm: {s.llm_error[:40]}"
        print(f"{s.name:<32} {s.checks_passed:>3}/{s.checks_total:<3} {s.duration_ms:>6}ms  {note}")

    print("-" * 78)
    print(f"{'TOTAL':<32} {passed:>3}/{total:<3} {'':>8}  {overall:.1%} of checks, "
          f"{perfect_cases}/{len(scores)} cases clean\n")

    failing = [s for s in scores if s.failures]
    if failing:
        print("Failures:\n")
        for s in failing:
            print(f"  {s.name}")
            for failure in s.failures:
                print(f"    - {failure}")
        print()

    return 0 if passed == total else 1


if __name__ == "__main__":
    raise SystemExit(main())
