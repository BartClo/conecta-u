from functools import lru_cache
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ENTORNOS_MODO_TEST = ("test", "local")
MIN_LARGO_TEST_SECRET = 32


class Settings(BaseSettings):
    # hide_input_in_errors: un arranque fallido no debe imprimir secretos en el log.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", hide_input_in_errors=True)

    database_url: str

    # "test" reemplaza Supabase por JWT HS256 locales: ver _validar_modo_auth.
    auth_mode: Literal["supabase", "test"] = "supabase"
    # Sin APP_ENV se asume produccion: el modo test debe pedirse explicitamente.
    app_env: str = "production"
    test_auth_secret: str | None = None

    # Obligatorios salvo en modo test (ver _validar_modo_auth).
    supabase_url: str | None = None
    supabase_jwks_url: str | None = None
    supabase_jwt_audience: str = "authenticated"

    # Separados por comas. "*" se rechaza porque CORS usa credenciales.
    cors_origins: str = "http://localhost:3000"

    # IA: la app arranca sin clave; con proveedor "claude" y sin clave la generacion da 502.
    llm_provider: str = "claude"  # "claude" | "fake"
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-opus-5-5"

    @model_validator(mode="after")
    def _validar_modo_auth(self) -> "Settings":
        if self.auth_mode == "test":
            if self.app_env not in ENTORNOS_MODO_TEST:
                raise ValueError("AUTH_MODE=test solo se permite con APP_ENV=test o local")
            if len(self.test_auth_secret or "") < MIN_LARGO_TEST_SECRET:
                raise ValueError(
                    f"AUTH_MODE=test exige TEST_AUTH_SECRET de {MIN_LARGO_TEST_SECRET}+ caracteres"
                )
        elif not self.supabase_url or not self.supabase_jwks_url:
            raise ValueError("AUTH_MODE=supabase exige SUPABASE_URL y SUPABASE_JWKS_URL")
        if "*" in self.cors_origins:
            raise ValueError("CORS_ORIGINS no admite '*'")
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def supabase_issuer(self) -> str:
        return f"{self.supabase_url}/auth/v1"


@lru_cache
def get_settings() -> Settings:
    return Settings()
