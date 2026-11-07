from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    supabase_url: str
    supabase_jwks_url: str
    supabase_jwt_audience: str = "authenticated"

    # IA: la app arranca sin clave; con proveedor "claude" y sin clave la generacion da 502.
    llm_provider: str = "claude"  # "claude" | "fake"
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-opus-5-5"

    @property
    def supabase_issuer(self) -> str:
        return f"{self.supabase_url}/auth/v1"


@lru_cache
def get_settings() -> Settings:
    return Settings()
