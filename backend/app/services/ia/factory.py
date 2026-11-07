import anthropic

from app.core.config import get_settings
from app.services.ia.claude_provider import ClaudeProvider
from app.services.ia.fake_provider import FakeLLMProvider
from app.services.ia.llm_provider import LLMProvider, LLMProviderError, TestGenerado


class _SinConfigurar(LLMProvider):
    """Sin clave: la app arranca igual y cada generacion falla (502) sin cobrar."""

    def generar_test(self, tema: str, n_preguntas: int) -> TestGenerado:
        raise LLMProviderError("IA no configurada")

    def generar_resumen(self, texto: str) -> str:
        raise LLMProviderError("IA no configurada")


def get_llm_provider() -> LLMProvider:
    """Dependency de FastAPI; los tests la sobreescriben."""
    s = get_settings()
    if s.llm_provider == "fake":
        return FakeLLMProvider()
    if s.llm_provider == "claude" and s.anthropic_api_key:
        return ClaudeProvider(anthropic.Anthropic(api_key=s.anthropic_api_key), s.anthropic_model)
    return _SinConfigurar()
