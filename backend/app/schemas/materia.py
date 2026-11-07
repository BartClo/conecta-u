from pydantic import BaseModel, ConfigDict, field_validator


class MateriaIn(BaseModel):
    nombre: str

    @field_validator("nombre")
    @classmethod
    def nombre_valido(cls, v: str) -> str:
        v = " ".join(v.split())
        if not v or len(v) > 120:
            raise ValueError("nombre debe tener entre 1 y 120 caracteres")
        return v


class MateriaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    nombre: str
    nombre_normalizado: str
    created_by: str
