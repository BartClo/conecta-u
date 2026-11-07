from collections.abc import Iterator
from contextlib import contextmanager

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import TokenPayload, get_current_token
from app.models.grupo import Grupo
from app.schemas.grupo import (
    GrupoDetalleOut,
    GrupoIn,
    GrupoOut,
    GrupoUpdate,
    MiembroOut,
    UnirseIn,
)
from app.services import grupo_service as svc

router = APIRouter()


@contextmanager
def _http_errors() -> Iterator[None]:
    try:
        yield
    except svc.GrupoNoEncontrado as exc:
        raise HTTPException(status_code=404, detail="Grupo no encontrado") from exc
    except svc.MateriaNoEncontrada as exc:
        raise HTTPException(status_code=404, detail="Materia no encontrada") from exc
    except svc.NoAutorizado as exc:
        raise HTTPException(status_code=403, detail="Solo el dueño puede hacer esto") from exc
    except svc.YaEsMiembro as exc:
        raise HTTPException(status_code=409, detail="Ya eres miembro de este grupo") from exc
    except svc.OwnerNoPuedeSalir as exc:
        raise HTTPException(status_code=409, detail="El dueño debe borrar el grupo") from exc


def _out(grupo: Grupo, materia_nombre: str) -> GrupoOut:
    return GrupoOut(
        id=grupo.id,
        nombre=grupo.nombre,
        materia_id=grupo.materia_id,
        owner_id=grupo.owner_id,
        codigo_invitacion=grupo.codigo_invitacion,
        materia_nombre=materia_nombre,
    )


@router.get("/grupos", response_model=list[GrupoOut])
def list_grupos(
    token: TokenPayload = Depends(get_current_token), db: Session = Depends(get_db)
) -> list[GrupoOut]:
    return [_out(g, nombre) for g, nombre in svc.listar(db, user_id=token["sub"])]


@router.post("/grupos", response_model=GrupoOut, status_code=201)
def create_grupo(
    body: GrupoIn,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> GrupoOut:
    with _http_errors():
        return _out(
            *svc.crear(db, user_id=token["sub"], nombre=body.nombre, materia_id=body.materia_id)
        )


@router.post("/grupos/unirse", response_model=GrupoOut, status_code=201)
def unirse(
    body: UnirseIn,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> GrupoOut:
    with _http_errors():
        return _out(*svc.unirse(db, user_id=token["sub"], codigo=body.codigo))


@router.get("/grupos/{grupo_id}", response_model=GrupoDetalleOut)
def get_grupo(
    grupo_id: str,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> GrupoDetalleOut:
    with _http_errors():
        grupo, materia, rol, count = svc.detalle(db, user_id=token["sub"], grupo_id=grupo_id)
    return GrupoDetalleOut(**_out(grupo, materia).model_dump(), rol=rol, miembros_count=count)


@router.put("/grupos/{grupo_id}", response_model=GrupoOut)
def update_grupo(
    grupo_id: str,
    body: GrupoUpdate,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> GrupoOut:
    with _http_errors():
        return _out(*svc.renombrar(db, user_id=token["sub"], grupo_id=grupo_id, nombre=body.nombre))


@router.delete("/grupos/{grupo_id}", status_code=204)
def delete_grupo(
    grupo_id: str,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> None:
    with _http_errors():
        svc.borrar(db, user_id=token["sub"], grupo_id=grupo_id)


@router.post("/grupos/{grupo_id}/codigo", response_model=GrupoOut)
def regenerar_codigo(
    grupo_id: str,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> GrupoOut:
    with _http_errors():
        return _out(*svc.regenerar_codigo(db, user_id=token["sub"], grupo_id=grupo_id))


@router.get("/grupos/{grupo_id}/miembros", response_model=list[MiembroOut])
def list_miembros(
    grupo_id: str,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> list[MiembroOut]:
    with _http_errors():
        filas = svc.listar_miembros(db, user_id=token["sub"], grupo_id=grupo_id)
    return [MiembroOut(user_id=u.id, nombre=u.name, email=u.email, rol=m.rol) for m, u in filas]


@router.delete("/grupos/{grupo_id}/miembros/{user_id}", status_code=204)
def remove_miembro(
    grupo_id: str,
    user_id: str,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> None:
    with _http_errors():
        svc.quitar_miembro(db, user_id=token["sub"], grupo_id=grupo_id, objetivo_id=user_id)
