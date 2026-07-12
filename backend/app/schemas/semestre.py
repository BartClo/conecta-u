from datetime import date

from pydantic import BaseModel, ConfigDict


class SemestreIn(BaseModel):
    nombre: str
    fecha_inicio: date
    fecha_fin: date


class SemestreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    nombre: str
    fecha_inicio: date
    fecha_fin: date
