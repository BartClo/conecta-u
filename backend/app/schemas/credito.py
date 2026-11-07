from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SaldoOut(BaseModel):
    saldo: int


class MovimientoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    delta: int
    motivo: str
    ref_tipo: str | None
    ref_id: str | None
    saldo_resultante: int
    created_at: datetime


class MovimientosOut(BaseModel):
    items: list[MovimientoOut]
    limit: int
    offset: int
    total: int
