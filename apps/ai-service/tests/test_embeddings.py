"""Unit tests for the embeddings service."""

from __future__ import annotations

from app.services import embeddings as emb


def test_normalise_unit_vector():
    vector = emb._normalise([3.0, 4.0])
    assert abs(vector[0] - 0.6) < 1e-9
    assert abs(vector[1] - 0.8) < 1e-9


def test_normalise_zero_vector():
    assert emb._normalise([0.0, 0.0]) == [0.0, 0.0]


def test_disabled_returns_outcome(monkeypatch):
    monkeypatch.setattr(emb.settings, "embeddings_enabled", False)
    outcome = emb.embed_texts(["anything"])
    assert outcome.enabled is False
    assert outcome.used is False
    assert outcome.vectors == []


def test_empty_text_reports_error(monkeypatch):
    monkeypatch.setattr(emb.settings, "embeddings_enabled", True)
    outcome = emb.embed_texts(["   "])
    assert outcome.enabled is True
    assert outcome.used is False
    assert outcome.error == "no text to embed"


def test_dimension_mismatch_is_rejected(monkeypatch):
    monkeypatch.setattr(emb.settings, "embeddings_enabled", True)
    monkeypatch.setattr(emb.settings, "embedding_dimensions", 768)
    monkeypatch.setattr(emb.settings, "embedding_model", "ollama/nomic-embed-text")

    def fake_embed(_model, texts):
        return [[0.1] * 32 for _ in texts], "test"

    monkeypatch.setattr(emb, "_embed", fake_embed)
    outcome = emb.embed_texts(["hello"])
    assert outcome.used is False
    assert outcome.dimensions == 32
    assert "expects 768" in (outcome.error or "")
