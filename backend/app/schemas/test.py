from datetime import datetime

from pydantic import BaseModel


class OpcionIn(BaseModel):
    texto: str
    es_correcta: bool


class PreguntaIn(BaseModel):
    enunciado: str
    opciones: list[OpcionIn]


class TestIn(BaseModel):
    __test__ = False

    materia_id: str
    titulo: str
    descripcion: str | None = None
    preguntas: list[PreguntaIn]


class OpcionOut(BaseModel):
    id: str
    texto: str
    orden: int


class OpcionAutorOut(OpcionOut):
    es_correcta: bool


class PreguntaOut(BaseModel):
    id: str
    enunciado: str
    orden: int
    opciones: list[OpcionOut]


class PreguntaAutorOut(PreguntaOut):
    opciones: list[OpcionAutorOut]  # type: ignore[assignment]


class TestOut(BaseModel):
    __test__ = False

    id: str
    materia_id: str
    titulo: str
    descripcion: str | None
    autor_id: str
    origen: str
    created_at: datetime
    preguntas: list[PreguntaOut]


class TestAutorOut(TestOut):
    __test__ = False

    preguntas: list[PreguntaAutorOut]  # type: ignore[assignment]
