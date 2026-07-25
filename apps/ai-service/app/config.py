"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    port: int = 8000

    # LiteLLM — model string format: "provider/model-name"
    litellm_model: str = "ollama/llama3.2"
    ollama_api_base: str = "http://localhost:11434"

    openai_api_key: str = ""
    anthropic_api_key: str = ""

    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:4000"]

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"


settings = Settings()
