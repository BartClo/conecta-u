from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.roles_grupo import ROL_OWNER
from app.models.grupo import Grupo
from app.models.materia import Materia
from app.models.membresia import Membresia
from app.models.user import User


def list_con_materia(db: Session, *, user_id: str) -> list[tuple[Grupo, str]]:
    return (
        db.query(Grupo, Materia.nombre)
        .join(Materia, Materia.id == Grupo.materia_id)
        .join(Membresia, Membresia.grupo_id == Grupo.id)
        .filter(Membresia.user_id == user_id)
        .order_by(Grupo.created_at.desc(), Grupo.id)
        .all()
    )


def get(db: Session, grupo_id: str) -> Grupo | None:
    return db.get(Grupo, grupo_id)


def get_by_codigo(db: Session, codigo: str) -> Grupo | None:
    return db.query(Grupo).filter(Grupo.codigo_invitacion == codigo).first()


def get_membresia(db: Session, *, grupo_id: str, user_id: str) -> Membresia | None:
    return (
        db.query(Membresia)
        .filter(Membresia.grupo_id == grupo_id, Membresia.user_id == user_id)
        .first()
    )


def nombre_materia(db: Session, materia_id: str) -> str:
    return db.query(Materia.nombre).filter(Materia.id == materia_id).scalar()


def contar_miembros(db: Session, grupo_id: str) -> int:
    return db.query(func.count(Membresia.id)).filter(Membresia.grupo_id == grupo_id).scalar()


def list_miembros(db: Session, grupo_id: str) -> list[tuple[Membresia, User]]:
    return (
        db.query(Membresia, User)
        .join(User, User.id == Membresia.user_id)
        .filter(Membresia.grupo_id == grupo_id)
        .order_by(Membresia.created_at, Membresia.id)
        .all()
    )


def create_con_owner(
    db: Session, *, nombre: str, materia_id: str, owner_id: str, codigo: str
) -> Grupo:
    grupo = Grupo(nombre=nombre, materia_id=materia_id, owner_id=owner_id, codigo_invitacion=codigo)
    db.add(grupo)
    db.flush()
    db.add(Membresia(grupo_id=grupo.id, user_id=owner_id, rol=ROL_OWNER))
    db.commit()
    db.refresh(grupo)
    return grupo


def add_miembro(db: Session, *, grupo_id: str, user_id: str, rol: str) -> Membresia:
    membresia = Membresia(grupo_id=grupo_id, user_id=user_id, rol=rol)
    db.add(membresia)
    db.commit()
    return membresia


def guardar(db: Session, grupo: Grupo) -> Grupo:
    db.commit()
    db.refresh(grupo)
    return grupo


def delete(db: Session, grupo: Grupo) -> None:
    db.query(Membresia).filter(Membresia.grupo_id == grupo.id).delete()
    db.delete(grupo)
    db.commit()


def delete_membresia(db: Session, membresia: Membresia) -> None:
    db.delete(membresia)
    db.commit()
