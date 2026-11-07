from pydantic import BaseModel, field_validator


class _NombreIn(BaseModel):
    nombre: str

    @field_validator("nombre")
    @classmethod
    def nombre_valido(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 120:
            raise ValueError("nombre debe tener entre 1 y 120 caracteres")
        return v


class GrupoIn(_NombreIn):
    materia_id: str


class GrupoUpdate(_NombreIn):
    pass


class UnirseIn(BaseModel):
    codigo: str


class GrupoOut(BaseModel):
    id: str
    nombre: str
    materia_id: str
    owner_id: str
    codigo_invitacion: str
    materia_nombre: str


class GrupoDetalleOut(GrupoOut):
    rol: str
    miembros_count: int


class MiembroOut(BaseModel):
    user_id: str
    nombre: str | None
    email: str
    rol: str
