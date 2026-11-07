from collections.abc import Iterator
from contextlib import contextmanager

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import TokenPayload, get_current_token
from app.models.desafio import Desafio
from app.schemas.desafio import (
    DesafioIn,
    DesafioOut,
    IntentoIn,
    IntentoOut,
    RendirOut,
    ResultadoDesafioOut,
)
from app.services import desafio_service as svc

router = APIRouter()


@contextmanager
def _http_errors() -> Iterator[None]:
    try:
        yield
    except (svc.GrupoNoEncontrado, svc.DesafioNoEncontrado) as exc:
        raise HTTPException(status_code=404, detail="Desafío no encontrado") from exc
    except svc.IntentoNoEncontrado as exc:
        raise HTTPException(status_code=404, detail="Aún no has rendido este desafío") from exc
    except svc.TestNoEncontrado as exc:
        raise HTTPException(status_code=404, detail="Test no encontrado") from exc
    except svc.TestOtraMateria as exc:
        raise HTTPException(
            status_code=409, detail="El test no es de la materia de este grupo"
        ) from exc
    except svc.YaRindio as exc:
        raise HTTPException(status_code=409, detail="ya_rindio") from exc
    except svc.DesafioNoDisponible as exc:
        raise HTTPException(status_code=409, detail="desafio_no_disponible") from exc
    except (svc.DesafioInvalido, svc.RespuestasInvalidas) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


def _out(desafio: Desafio, test_titulo: str, ya_rindio: bool) -> DesafioOut:
    return DesafioOut(
        id=desafio.id,
        grupo_id=desafio.grupo_id,
        test_id=desafio.test_id,
        test_titulo=test_titulo,
        creado_por=desafio.creado_por,
        fecha_inicio=desafio.fecha_inicio,
        fecha_fin=desafio.fecha_fin,
        estado=desafio.estado,
        ya_rindio=ya_rindio,
    )


@router.post("/grupos/{grupo_id}/desafios", response_model=DesafioOut, status_code=201)
def create_desafio(
    grupo_id: str,
    body: DesafioIn,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> DesafioOut:
    with _http_errors():
        desafio, titulo = svc.crear(
            db,
            user_id=token["sub"],
            grupo_id=grupo_id,
            test_id=body.test_id,
            fecha_inicio=body.fecha_inicio,
            fecha_fin=body.fecha_fin,
        )
    return _out(desafio, titulo, False)


@router.get("/grupos/{grupo_id}/desafios", response_model=list[DesafioOut])
def list_desafios(
    grupo_id: str,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> list[DesafioOut]:
    with _http_errors():
        filas = svc.listar(db, user_id=token["sub"], grupo_id=grupo_id)
    return [_out(*fila) for fila in filas]


@router.get("/desafios/{desafio_id}/rendir", response_model=RendirOut)
def rendir_desafio(
    desafio_id: str,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> RendirOut:
    with _http_errors():
        test = svc.para_rendir(db, user_id=token["sub"], desafio_id=desafio_id)
    return RendirOut.model_validate(test, from_attributes=True)


@router.post("/desafios/{desafio_id}/intentos", response_model=IntentoOut, status_code=201)
def create_intento(
    desafio_id: str,
    body: IntentoIn,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> IntentoOut:
    with _http_errors():
        intento = svc.rendir(
            db,
            user_id=token["sub"],
            desafio_id=desafio_id,
            segundos=body.segundos,
            respuestas=[r.model_dump() for r in body.respuestas],
        )
    return IntentoOut.model_validate(intento, from_attributes=True)


@router.get("/desafios/{desafio_id}/intentos/me", response_model=IntentoOut)
def mi_intento(
    desafio_id: str,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> IntentoOut:
    with _http_errors():
        intento = svc.mi_intento(db, user_id=token["sub"], desafio_id=desafio_id)
    return IntentoOut.model_validate(intento, from_attributes=True)


@router.get("/desafios/{desafio_id}/resultados", response_model=list[ResultadoDesafioOut])
def resultados(
    desafio_id: str,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> list[ResultadoDesafioOut]:
    with _http_errors():
        filas = svc.resultados(db, user_id=token["sub"], desafio_id=desafio_id)
    return [
        ResultadoDesafioOut(
            user_id=u.id,
            user_nombre=u.name or u.email,
            puntaje=i.puntaje,
            total=i.total,
            segundos=i.segundos,
            finalizado_at=i.finalizado_at,
        )
        for i, u in filas
    ]
