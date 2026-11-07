from datetime import datetime

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.test import TestAutorOut

MAX_TEMA = 2000
MAX_TEXTO_FUENTE = 50000
MIN_TEXTO_RESUMEN = 50


def _sin_nul(v: str | None) -> str | None:
    if v is not None and "\x00" in v:
        raise ValueError("El texto contiene caracteres no permitidos")
    return v


class GenerarTestIn(BaseModel):
    materia_id: str
    tema: str | None = Field(default=None, max_length=MAX_TEMA)
    texto_fuente: str | None = Field(default=None, max_length=MAX_TEXTO_FUENTE)
    n_preguntas: int = Field(default=10, ge=1, le=20)

    _nul = field_validator("tema", "texto_fuente")(_sin_nul)

    @model_validator(mode="after")
    def _al_menos_una_fuente(self) -> "GenerarTestIn":
        if not (self.tema or "").strip() and not (self.texto_fuente or "").strip():
            raise ValueError("Indica un tema o un texto fuente")
        return self


class GenerarResumenIn(BaseModel):
    texto_fuente: str = Field(max_length=MAX_TEXTO_FUENTE)
    materia_id: str | None = None
    titulo: str | None = Field(default=None, max_length=150)

    _nul = field_validator("texto_fuente", "titulo")(_sin_nul)

    @field_validator("texto_fuente")
    @classmethod
    def _largo_minimo(cls, v: str) -> str:
        if len(v.strip()) < MIN_TEXTO_RESUMEN:
            raise ValueError(f"El texto debe tener al menos {MIN_TEXTO_RESUMEN} caracteres")
        return v


class ResumenOut(BaseModel):
    id: str
    user_id: str
    materia_id: str | None
    titulo: str
    contenido_fuente: str
    contenido_resumen: str
    created_at: datetime


class GeneracionTestOut(BaseModel):
    test: TestAutorOut
    costo_creditos: int
    saldo_restante: int


class GeneracionResumenOut(BaseModel):
    resumen: ResumenOut
    costo_creditos: int
    saldo_restante: int
