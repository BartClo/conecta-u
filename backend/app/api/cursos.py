from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import TokenPayload, get_current_token
from app.schemas.curso import CursoIn, CursoOut
from app.services import curso_service

router = APIRouter()


def _get_or_404(db: Session, *, user_id: str, curso_id: str):
    curso = curso_service.get_curso(db, user_id=user_id, curso_id=curso_id)
    if curso is None:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    return curso


@router.get("/cursos", response_model=list[CursoOut])
def list_cursos(
    semestre_id: str | None = None,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> list[CursoOut]:
    cursos = curso_service.list_cursos(db, user_id=token["sub"], semestre_id=semestre_id)
    return [CursoOut.model_validate(c) for c in cursos]


@router.post("/cursos", response_model=CursoOut, status_code=201)
def create_curso(
    body: CursoIn,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> CursoOut:
    try:
        curso = curso_service.create_curso(
            db,
            user_id=token["sub"],
            semestre_id=body.semestre_id,
            nombre=body.nombre,
            codigo=body.codigo,
            profesor=body.profesor,
            color=body.color,
        )
    except curso_service.SemestreNoEncontrado as exc:
        raise HTTPException(status_code=404, detail="Semestre no encontrado") from exc
    return CursoOut.model_validate(curso)


@router.get("/cursos/{curso_id}", response_model=CursoOut)
def get_curso(
    curso_id: str,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> CursoOut:
    curso = _get_or_404(db, user_id=token["sub"], curso_id=curso_id)
    return CursoOut.model_validate(curso)


@router.put("/cursos/{curso_id}", response_model=CursoOut)
def update_curso(
    curso_id: str,
    body: CursoIn,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> CursoOut:
    curso = _get_or_404(db, user_id=token["sub"], curso_id=curso_id)
    curso = curso_service.update_curso(
        db, curso, nombre=body.nombre, codigo=body.codigo, profesor=body.profesor, color=body.color
    )
    return CursoOut.model_validate(curso)


@router.delete("/cursos/{curso_id}", status_code=204)
def delete_curso(
    curso_id: str,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> None:
    curso = _get_or_404(db, user_id=token["sub"], curso_id=curso_id)
    curso_service.delete_curso(db, curso)
