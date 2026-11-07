from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from app.schemas.test import TestAutorOut

MAX_TEMA = 2000
MAX_TEXTO_FUENTE = 50000
MIN_TEXTO_RESUMEN = 50


class GenerarTestIn(BaseModel):
    materia_id: str
    tema: str | None = Field(default=None, max_length=MAX_TEMA)
    texto_fuente: str | None = Field(default=None, max_length=MAX_TEXTO_FUENTE)
    n_preguntas: int = Field(default=10, ge=1, le=20)

    @model_validator(mode="after")
    def _al_menos_una_fuente(self) -> "GenerarTestIn":
        if not (self.tema or "").strip() and not (self.texto_fuente or "").strip():
            raise ValueError("Indica un tema o un texto fuente")
        return self


class GenerarResumenIn(BaseModel):
    texto_fuente: str = Field(min_length=MIN_TEXTO_RESUMEN, max_length=MAX_TEXTO_FUENTE)
    materia_id: str | None = None
    titulo: str | None = Field(default=None, max_length=150)


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
