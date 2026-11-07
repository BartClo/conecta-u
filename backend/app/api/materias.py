from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import TokenPayload, get_current_token
from app.schemas.materia import MateriaIn, MateriaOut
from app.services import materia_service

router = APIRouter()


@router.get("/materias", response_model=list[MateriaOut])
def list_materias(
    q: str | None = None,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> list[MateriaOut]:
    return [MateriaOut.model_validate(m) for m in materia_service.buscar_materias(db, q=q)]


@router.post("/materias", response_model=MateriaOut, status_code=201)
def create_materia(
    body: MateriaIn,
    response: Response,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> MateriaOut:
    materia, creada = materia_service.obtener_o_crear(db, nombre=body.nombre, user_id=token["sub"])
    if not creada:
        response.status_code = 200
    return MateriaOut.model_validate(materia)
