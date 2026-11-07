from app.services.ia.llm_provider import (
    LLMProvider,
    LLMProviderError,
    PreguntaGenerada,
    TestGenerado,
)

MARCA_FALLO = "__fallar__"


class FakeLLMProvider(LLMProvider):
    """Determinista y sin red (LLM_PROVIDER=fake). Un texto con __fallar__ lanza error."""

    def _revisar(self, texto: str) -> None:
        if MARCA_FALLO in texto:
            raise LLMProviderError("fallo simulado")

    def generar_test(self, tema: str, n_preguntas: int) -> TestGenerado:
        self._revisar(tema)
        preguntas = [
            PreguntaGenerada(
                enunciado=f"Pregunta {i} sobre {tema[:60]}",
                opciones=["Opción A", "Opción B", "Opción C", "Opción D"],
                indice_correcta=i % 4,
            )
            for i in range(1, n_preguntas + 1)
        ]
        return TestGenerado(titulo=f"Test: {tema[:60]}", preguntas=preguntas)

    def generar_resumen(self, texto: str) -> str:
        self._revisar(texto)
        return f"Resumen: {texto[:200]}"
