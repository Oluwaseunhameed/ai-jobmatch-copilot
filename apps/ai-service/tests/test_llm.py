"""Unit tests for the LLM enrichment layer.

These cover the failure modes that matter in production: the model being absent,
the model erroring, and the model returning output we must not trust.
"""

from app.services import llm
from app.services.llm import LlmOutcome, LlmResumeFields


BASE = {
    "headline": "Backend Engineer",
    "summary": "Heuristic summary.",
    "skills": ["Python", "PostgreSQL"],
    "source": "heuristic",
}


class _FakeMessage:
    def __init__(self, content):
        self.content = content


class _FakeChoice:
    def __init__(self, content):
        self.message = _FakeMessage(content)


class _FakeResponse:
    def __init__(self, content):
        self.choices = [_FakeChoice(content)]


class _FakeLitellm:
    """Stand-in for the litellm module."""

    def __init__(self, content=None, error=None, reject_schema=False):
        self.content = content
        self.error = error
        self.reject_schema = reject_schema
        self.calls: list[dict] = []

    def completion(self, **kwargs):
        self.calls.append(kwargs)
        if self.reject_schema and "response_format" in kwargs:
            raise RuntimeError("response_format is not supported by this model")
        if self.error:
            raise self.error
        return _FakeResponse(self.content)


def _run(monkeypatch, fake, *, enabled=True):
    monkeypatch.setattr(llm.settings, "llm_enrichment_enabled", enabled)
    monkeypatch.setitem(__import__("sys").modules, "litellm", fake)
    return llm.enrich("Jane Doe\nBackend Engineer\nSummary\nBuilds APIs.")


def test_disabled_by_config_reports_not_enabled(monkeypatch):
    outcome = _run(monkeypatch, _FakeLitellm(content="{}"), enabled=False)

    assert outcome.enabled is False
    assert outcome.used is False
    assert outcome.error is None


def test_missing_litellm_is_reported_not_swallowed(monkeypatch):
    import builtins
    import sys

    monkeypatch.setattr(llm.settings, "llm_enrichment_enabled", True)
    monkeypatch.delitem(sys.modules, "litellm", raising=False)

    real_import = builtins.__import__

    def fake_import(name, *args, **kwargs):
        if name == "litellm":
            raise ImportError("No module named 'litellm'")
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", fake_import)

    outcome = llm.enrich("some text")

    assert outcome.enabled is True
    assert outcome.used is False
    assert outcome.error is not None
    assert "litellm is not installed" in outcome.error


def test_provider_error_is_captured_with_reason(monkeypatch):
    outcome = _run(monkeypatch, _FakeLitellm(error=RuntimeError("connection refused")))

    assert outcome.used is False
    assert outcome.error is not None
    assert "connection refused" in outcome.error
    assert outcome.duration_ms is not None


def test_unusable_json_is_discarded(monkeypatch):
    outcome = _run(monkeypatch, _FakeLitellm(content="I cannot help with that."))

    assert outcome.used is False
    assert outcome.error is not None
    assert "unusable JSON" in outcome.error


def test_chatty_output_with_code_fence_is_recovered(monkeypatch):
    content = (
        "Here is the extracted JSON:\n\n```json\n"
        '{"headline": "Staff Engineer", "summary": "Builds platforms.", '
        '"skills": ["Go", "Kubernetes"]}\n```'
    )
    outcome = _run(monkeypatch, _FakeLitellm(content=content))

    assert outcome.used is True
    assert outcome.fields is not None
    assert outcome.fields.headline == "Staff Engineer"
    assert outcome.fields.skills == ["Go", "Kubernetes"]


def test_json_schema_mode_is_requested_first_then_retried_without(monkeypatch):
    fake = _FakeLitellm(
        content='{"headline": null, "summary": null, "skills": []}',
        reject_schema=True,
    )
    outcome = _run(monkeypatch, fake)

    assert outcome.used is True
    assert "response_format" in fake.calls[0]
    assert "response_format" not in fake.calls[1]


def test_merge_keeps_heuristics_when_llm_unused():
    merged = llm.merge(BASE, LlmOutcome(enabled=True, error="boom"))

    assert merged["headline"] == "Backend Engineer"
    assert merged["source"] == "heuristic"
    assert merged["llm"]["error"] == "boom"


def test_merge_overlays_and_dedupes_skills():
    outcome = LlmOutcome(
        enabled=True,
        used=True,
        model="test/model",
        fields=LlmResumeFields(
            headline="Staff Backend Engineer",
            summary="Model summary.",
            skills=["python", "Kafka"],
        ),
    )
    merged = llm.merge(BASE, outcome)

    assert merged["headline"] == "Staff Backend Engineer"
    assert merged["summary"] == "Model summary."
    assert merged["source"] == "heuristic+llm"
    # "python" duplicates the existing "Python" and must not be added twice.
    assert merged["skills"] == ["Python", "PostgreSQL", "Kafka"]


def test_merge_falls_back_to_heuristic_fields_when_model_returns_blanks():
    outcome = LlmOutcome(
        enabled=True,
        used=True,
        fields=LlmResumeFields(headline="  ", summary=None, skills=[]),
    )
    merged = llm.merge(BASE, outcome)

    assert merged["headline"] == "Backend Engineer"
    assert merged["summary"] == "Heuristic summary."
