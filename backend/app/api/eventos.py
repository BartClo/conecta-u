from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import TokenPayload, get_current_token
from app.schemas.evento import EventoIn, EventoOut, OcurrenciaOut
from app.services import evento_service

router = APIRouter()


def _get_or_404(db: Session, *, user_id: str, evento_id: str):
    evento = evento_service.get_evento(db, user_id=user_id, evento_id=evento_id)
    if evento is None:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    return evento


@router.get("/eventos", response_model=list[OcurrenciaOut])
def list_eventos(
    desde: date,
    hasta: date,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> list[OcurrenciaOut]:
    ocurrencias = evento_service.list_eventos_en_rango(
        db, user_id=token["sub"], desde=desde, hasta=hasta
    )
    return [OcurrenciaOut.model_validate(o) for o in ocurrencias]


@router.post("/eventos", response_model=EventoOut, status_code=201)
def create_evento(
    body: EventoIn,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> EventoOut:
    try:
        evento = evento_service.create_evento(
            db,
            user_id=token["sub"],
            titulo=body.titulo,
            descripcion=body.descripcion,
            tipo=body.tipo,
            fecha_inicio=body.fecha_inicio,
            fecha_fin=body.fecha_fin,
            curso_id=body.curso_id,
            recurrencia_dia_semana=body.recurrencia_dia_semana,
            recurrencia_hasta=body.recurrencia_hasta,
        )
    except evento_service.CursoNoEncontrado as exc:
        raise HTTPException(status_code=404, detail="Curso no encontrado") from exc
    except (evento_service.TipoInvalido, evento_service.RecurrenciaInvalida) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return EventoOut.model_validate(evento)


@router.get("/eventos/{evento_id}", response_model=EventoOut)
def get_evento(
    evento_id: str,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> EventoOut:
    evento = _get_or_404(db, user_id=token["sub"], evento_id=evento_id)
    return EventoOut.model_validate(evento)


@router.put("/eventos/{evento_id}", response_model=EventoOut)
def update_evento(
    evento_id: str,
    body: EventoIn,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> EventoOut:
    evento = _get_or_404(db, user_id=token["sub"], evento_id=evento_id)
    try:
        evento = evento_service.update_evento(
            db,
            evento,
            titulo=body.titulo,
            descripcion=body.descripcion,
            tipo=body.tipo,
            fecha_inicio=body.fecha_inicio,
            fecha_fin=body.fecha_fin,
            curso_id=body.curso_id,
            recurrencia_dia_semana=body.recurrencia_dia_semana,
            recurrencia_hasta=body.recurrencia_hasta,
        )
    except evento_service.CursoNoEncontrado as exc:
        raise HTTPException(status_code=404, detail="Curso no encontrado") from exc
    except (evento_service.TipoInvalido, evento_service.RecurrenciaInvalida) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return EventoOut.model_validate(evento)


@router.delete("/eventos/{evento_id}", status_code=204)
def delete_evento(
    evento_id: str,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> None:
    evento = _get_or_404(db, user_id=token["sub"], evento_id=evento_id)
    evento_service.delete_evento(db, evento)
