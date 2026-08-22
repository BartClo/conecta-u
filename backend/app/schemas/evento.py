from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, field_validator

from app.core.tipos_evento import DIAS_SEMANA_PERMITIDOS, TIPOS_EVENTO_PERMITIDOS


class EventoIn(BaseModel):
    titulo: str
    descripcion: str | None = None
    tipo: str
    fecha_inicio: datetime
    fecha_fin: datetime | None = None
    curso_id: str | None = None
    recurrencia_dia_semana: int | None = None
    recurrencia_hasta: date | None = None

    @field_validator("tipo")
    @classmethod
    def tipo_valido(cls, v: str) -> str:
        if v not in TIPOS_EVENTO_PERMITIDOS:
            raise ValueError(f"tipo debe ser uno de {TIPOS_EVENTO_PERMITIDOS}")
        return v

    @field_validator("recurrencia_dia_semana")
    @classmethod
    def dia_semana_valido(cls, v: int | None) -> int | None:
        if v is not None and v not in DIAS_SEMANA_PERMITIDOS:
            raise ValueError(f"recurrencia_dia_semana debe ser uno de {DIAS_SEMANA_PERMITIDOS}")
        return v


class EventoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    titulo: str
    descripcion: str | None
    tipo: str
    fecha_inicio: datetime
    fecha_fin: datetime | None
    curso_id: str | None
    recurrencia_dia_semana: int | None
    recurrencia_hasta: date | None


class OcurrenciaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    curso_id: str | None
    titulo: str
    descripcion: str | None
    tipo: str
    fecha_inicio: datetime
    fecha_fin: datetime | None
