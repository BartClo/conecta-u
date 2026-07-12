from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import TokenPayload, get_current_token
from app.schemas.semestre import SemestreIn, SemestreOut
from app.services import semestre_service

router = APIRouter()


def _get_or_404(db: Session, *, user_id: str, semestre_id: str):
    semestre = semestre_service.get_semestre(db, user_id=user_id, semestre_id=semestre_id)
    if semestre is None:
        raise HTTPException(status_code=404, detail="Semestre no encontrado")
    return semestre


@router.get("/semestres", response_model=list[SemestreOut])
def list_semestres(
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> list[SemestreOut]:
    semestres = semestre_service.list_semestres(db, user_id=token["sub"])
    return [SemestreOut.model_validate(s) for s in semestres]


@router.post("/semestres", response_model=SemestreOut, status_code=201)
def create_semestre(
    body: SemestreIn,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> SemestreOut:
    semestre = semestre_service.create_semestre(
        db,
        user_id=token["sub"],
        nombre=body.nombre,
        fecha_inicio=body.fecha_inicio,
        fecha_fin=body.fecha_fin,
    )
    return SemestreOut.model_validate(semestre)


@router.get("/semestres/{semestre_id}", response_model=SemestreOut)
def get_semestre(
    semestre_id: str,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> SemestreOut:
    semestre = _get_or_404(db, user_id=token["sub"], semestre_id=semestre_id)
    return SemestreOut.model_validate(semestre)


@router.put("/semestres/{semestre_id}", response_model=SemestreOut)
def update_semestre(
    semestre_id: str,
    body: SemestreIn,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> SemestreOut:
    semestre = _get_or_404(db, user_id=token["sub"], semestre_id=semestre_id)
    semestre = semestre_service.update_semestre(
        db,
        semestre,
        nombre=body.nombre,
        fecha_inicio=body.fecha_inicio,
        fecha_fin=body.fecha_fin,
    )
    return SemestreOut.model_validate(semestre)


@router.delete("/semestres/{semestre_id}", status_code=204)
def delete_semestre(
    semestre_id: str,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> None:
    semestre = _get_or_404(db, user_id=token["sub"], semestre_id=semestre_id)
    try:
        semestre_service.delete_semestre(db, semestre)
    except semestre_service.SemestreEnUso as exc:
        raise HTTPException(status_code=409, detail="El semestre tiene cursos asociados") from exc
