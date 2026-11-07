import secrets

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.roles_grupo import ROL_MEMBER, ROL_OWNER
from app.models.grupo import Grupo
from app.models.membresia import Membresia
from app.models.user import User
from app.repositories import grupo_repository as repo
from app.services import materia_service

_ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # sin O/0, I/1, L


class GrupoNoEncontrado(Exception):
    pass


class MateriaNoEncontrada(Exception):
    pass


class NoAutorizado(Exception):
    pass


class YaEsMiembro(Exception):
    pass


class OwnerNoPuedeSalir(Exception):
    pass


def _codigo_aleatorio() -> str:
    return "".join(secrets.choice(_ALFABETO) for _ in range(6))


def _codigo_libre(db: Session) -> str:
    while True:
        codigo = _codigo_aleatorio()
        if repo.get_by_codigo(db, codigo) is None:
            return codigo


def get_membresia(db: Session, grupo_id: str, user_id: str) -> Membresia | None:
    return repo.get_membresia(db, grupo_id=grupo_id, user_id=user_id)


def _grupo_de_miembro(db: Session, grupo_id: str, user_id: str) -> tuple[Grupo, Membresia]:
    membresia = get_membresia(db, grupo_id, user_id)
    if membresia is None:
        raise GrupoNoEncontrado()
    return repo.get(db, grupo_id), membresia


def _grupo_de_owner(db: Session, grupo_id: str, user_id: str) -> Grupo:
    grupo, membresia = _grupo_de_miembro(db, grupo_id, user_id)
    if membresia.rol != ROL_OWNER:
        raise NoAutorizado()
    return grupo


def listar(db: Session, *, user_id: str) -> list[tuple[Grupo, str]]:
    return repo.list_con_materia(db, user_id=user_id)


def crear(db: Session, *, user_id: str, nombre: str, materia_id: str) -> tuple[Grupo, str]:
    materia = materia_service.get_materia(db, materia_id)
    if materia is None:
        raise MateriaNoEncontrada()
    grupo = repo.create_con_owner(
        db, nombre=nombre, materia_id=materia_id, owner_id=user_id, codigo=_codigo_libre(db)
    )
    return grupo, materia.nombre


def detalle(db: Session, *, user_id: str, grupo_id: str) -> tuple[Grupo, str, str, int]:
    grupo, membresia = _grupo_de_miembro(db, grupo_id, user_id)
    return (
        grupo,
        repo.nombre_materia(db, grupo.materia_id),
        membresia.rol,
        repo.contar_miembros(db, grupo_id),
    )


def renombrar(db: Session, *, user_id: str, grupo_id: str, nombre: str) -> tuple[Grupo, str]:
    grupo = _grupo_de_owner(db, grupo_id, user_id)
    grupo.nombre = nombre
    repo.guardar(db, grupo)
    return grupo, repo.nombre_materia(db, grupo.materia_id)


def regenerar_codigo(db: Session, *, user_id: str, grupo_id: str) -> tuple[Grupo, str]:
    grupo = _grupo_de_owner(db, grupo_id, user_id)
    grupo.codigo_invitacion = _codigo_libre(db)
    repo.guardar(db, grupo)
    return grupo, repo.nombre_materia(db, grupo.materia_id)


def borrar(db: Session, *, user_id: str, grupo_id: str) -> None:
    repo.delete(db, _grupo_de_owner(db, grupo_id, user_id))


def unirse(db: Session, *, user_id: str, codigo: str) -> tuple[Grupo, str]:
    grupo = repo.get_by_codigo(db, codigo.strip().upper())
    if grupo is None:
        raise GrupoNoEncontrado()
    if get_membresia(db, grupo.id, user_id) is not None:
        raise YaEsMiembro()
    try:
        repo.add_miembro(db, grupo_id=grupo.id, user_id=user_id, rol=ROL_MEMBER)
    except IntegrityError as exc:  # doble click concurrente
        db.rollback()
        raise YaEsMiembro() from exc
    return grupo, repo.nombre_materia(db, grupo.materia_id)


def listar_miembros(db: Session, *, user_id: str, grupo_id: str) -> list[tuple[Membresia, User]]:
    _grupo_de_miembro(db, grupo_id, user_id)
    return repo.list_miembros(db, grupo_id)


def quitar_miembro(db: Session, *, user_id: str, grupo_id: str, objetivo_id: str) -> None:
    _, propia = _grupo_de_miembro(db, grupo_id, user_id)
    if propia.rol != ROL_OWNER and objetivo_id != user_id:
        raise NoAutorizado()
    if propia.rol == ROL_OWNER and objetivo_id == user_id:
        raise OwnerNoPuedeSalir()
    objetivo = get_membresia(db, grupo_id, objetivo_id)
    if objetivo is None:
        raise GrupoNoEncontrado()
    repo.delete_membresia(db, objetivo)
