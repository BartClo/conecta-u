from abc import ABC, abstractmethod

from pydantic import BaseModel


class PreguntaGenerada(BaseModel):
    enunciado: str
    opciones: list[str]
    indice_correcta: int


class TestGenerado(BaseModel):
    __test__ = False

    titulo: str
    preguntas: list[PreguntaGenerada]


class LLMProviderError(Exception):
    """Cualquier fallo del proveedor; el mensaje es legible y sin secretos."""


# Interfaz sincrona: la sesion SQLAlchemy es sincrona y los endpoints son `def`
# (FastAPI los corre en threadpool), asi que no hay event loop que bloquear.
class LLMProvider(ABC):
    @abstractmethod
    def generar_test(self, tema: str, n_preguntas: int) -> TestGenerado: ...

    @abstractmethod
    def generar_resumen(self, texto: str) -> str: ...
