"""Application configuration loaded from environment variables."""

from __future__ import annotations

from typing import Annotated

from pydantic import BeforeValidator, Field
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


def _parse_cors_origins(value: object) -> list[str]:
    """Accept JSON arrays or comma-separated URLs from .env files."""
    if value is None or value == "":
        return ["http://localhost:3000", "http://localhost:4000"]
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        cleaned = value.strip().strip('"').strip("'")
        if cleaned.startswith("["):
            import json

            parsed = json.loads(cleaned)
            if isinstance(parsed, list):
                return [str(item).strip() for item in parsed if str(item).strip()]
        return [part.strip() for part in cleaned.split(",") if part.strip()]
    raise TypeError(f"Unsupported cors_origins value: {value!r}")


# NoDecode stops pydantic-settings from forcing JSON before our validator runs.
CorsOrigins = Annotated[list[str], NoDecode, BeforeValidator(_parse_cors_origins)]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    port: int = 8000

    # LiteLLM — model string format: "provider/model-name"
    litellm_model: str = "ollama/llama3.2"
    ollama_api_base: str = "http://localhost:11434"

    # Heuristic parsing always runs. LLM enrichment is a best-effort layer on top
    # and is skipped silently when litellm or the model backend is unavailable.
    llm_enrichment_enabled: bool = True
    llm_timeout_seconds: int = 12

    # Resume optimisation (Module 4 full) — longer timeout; degrades to keyword tips.
    # Local Ollama cold-starts often need 2–3 minutes on first request.
    llm_optimize_enabled: bool = True
    llm_optimize_timeout_seconds: int = 180
    # Empty string falls back to litellm_model at runtime.
    llm_optimize_model: str = ""

    # Application assistant (Module 9) — cover letter + short answers; template fallback.
    llm_application_enabled: bool = True
    llm_application_timeout_seconds: int = 180
    llm_application_model: str = ""

    # Wave 4 — JD narrative insights (deterministic base always returned).
    llm_insights_enabled: bool = True
    llm_insights_timeout_seconds: int = 60
    llm_insights_model: str = ""

    # Wave 4 — interview mock turn feedback.
    llm_interview_enabled: bool = True
    llm_interview_timeout_seconds: int = 90
    llm_interview_model: str = ""

    # Wave 4 — coding AI review (no sandbox execution).
    llm_coding_review_enabled: bool = True
    llm_coding_review_timeout_seconds: int = 90
    llm_coding_review_model: str = ""

    # Wave 4 — coach memory summarization.
    llm_coach_memory_enabled: bool = True
    llm_coach_memory_timeout_seconds: int = 60
    llm_coach_memory_model: str = ""

    # Embeddings power semantic job search. Unlike chat completion, a local model
    # is genuinely competitive here, so this defaults on.
    # embedding_dimensions must match the vector(n) column in the jobs table;
    # changing it requires a migration and a re-embed of every job.
    embeddings_enabled: bool = True
    embedding_model: str = "ollama/nomic-embed-text"
    embedding_dimensions: int = 768
    embedding_timeout_seconds: int = 30

    openai_api_key: str = ""
    anthropic_api_key: str = ""

    cors_origins: CorsOrigins = Field(
        default_factory=lambda: ["http://localhost:3000", "http://localhost:4000"]
    )

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"

    @property
    def resolved_embedding_model(self) -> str:
        """Prefer a hosted embedding model in production when Ollama is not available."""
        model = (self.embedding_model or "").strip() or "ollama/nomic-embed-text"
        if (
            not self.is_development
            and self.openai_api_key.strip()
            and model.startswith("ollama/")
        ):
            return "openai/text-embedding-3-small"
        return model


settings = Settings()
