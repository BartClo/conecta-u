from pydantic import BaseModel, ConfigDict, field_validator

from app.core.colors import COLORES_PERMITIDOS


class CursoIn(BaseModel):
    semestre_id: str
    nombre: str
    codigo: str
    profesor: str | None = None
    color: str

    @field_validator("color")
    @classmethod
    def color_valido(cls, v: str) -> str:
        if v not in COLORES_PERMITIDOS:
            raise ValueError(f"color debe ser uno de {COLORES_PERMITIDOS}")
        return v


class CursoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    semestre_id: str
    nombre: str
    codigo: str
    profesor: str | None
    color: str
