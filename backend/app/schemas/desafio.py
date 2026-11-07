from datetime import datetime
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, Field

from app.core.fechas import aware_utc
from app.schemas.test import PreguntaOut

FechaUtc = Annotated[datetime, AfterValidator(aware_utc)]


class DesafioIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    test_id: str
    fecha_inicio: FechaUtc | None = None
    fecha_fin: FechaUtc | None = None


class DesafioOut(BaseModel):
    id: str
    grupo_id: str
    test_id: str
    test_titulo: str
    creado_por: str
    fecha_inicio: FechaUtc
    fecha_fin: FechaUtc | None
    estado: str
    ya_rindio: bool


class RendirOut(BaseModel):
    """Test servido para rendir: reutiliza PreguntaOut, que no tiene `es_correcta`."""

    id: str
    titulo: str
    preguntas: list[PreguntaOut]


class RespuestaIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    pregunta_id: str
    opcion_id: str


class IntentoIn(BaseModel):
    """Nunca lee puntaje del cliente: lo que no se declara aqui se ignora."""

    model_config = ConfigDict(extra="ignore")

    segundos: int = Field(strict=True, ge=0, le=2_147_483_647)
    respuestas: list[RespuestaIn]


class IntentoOut(BaseModel):
    id: str
    desafio_id: str
    user_id: str
    puntaje: int
    total: int
    segundos: int
    finalizado_at: FechaUtc


class ResultadoDesafioOut(BaseModel):
    user_id: str
    user_nombre: str
    puntaje: int
    total: int
    segundos: int
    finalizado_at: FechaUtc
