from sqlalchemy import exists, func, select
from sqlalchemy.orm import Session, selectinload

from app.models.desafio import Desafio, Intento
from app.models.grupo import Grupo
from app.models.membresia import Membresia
from app.models.test import Pregunta, Test
from app.models.user import User


def get(db: Session, desafio_id: str) -> Desafio | None:
    return db.get(Desafio, desafio_id)


def get_test_completo(db: Session, test_id: str) -> Test | None:
    return (
        db.query(Test)
        .options(selectinload(Test.preguntas).selectinload(Pregunta.opciones))
        .filter(Test.id == test_id)
        .first()
    )


def add(db: Session, desafio: Desafio) -> Desafio:
    db.add(desafio)
    db.commit()
    db.refresh(desafio)
    return desafio


def list_por_grupo(db: Session, *, grupo_id: str, user_id: str) -> list[tuple[Desafio, str, bool]]:
    """Desafios del grupo con titulo del test y `ya_rindio`, en una sola consulta."""
    ya_rindio = exists().where(Intento.desafio_id == Desafio.id, Intento.user_id == user_id)
    return (
        db.query(Desafio, Test.titulo, ya_rindio)
        .join(Test, Test.id == Desafio.test_id)
        .filter(Desafio.grupo_id == grupo_id)
        .order_by(Desafio.created_at.desc(), Desafio.id)
        .all()
    )


def get_intento(db: Session, *, desafio_id: str, user_id: str) -> Intento | None:
    return (
        db.query(Intento)
        .filter(Intento.desafio_id == desafio_id, Intento.user_id == user_id)
        .first()
    )


def add_intento(db: Session, intento: Intento) -> Intento:
    db.add(intento)
    db.commit()  # una transaccion: intento + respuestas
    db.refresh(intento)
    return intento


def list_resultados(db: Session, desafio_id: str) -> list[tuple[Intento, User]]:
    return (
        db.query(Intento, User)
        .join(User, User.id == Intento.user_id)
        .filter(Intento.desafio_id == desafio_id)
        .order_by(Intento.puntaje.desc(), Intento.segundos, Intento.finalizado_at, Intento.id)
        .all()
    )


def get_for_update(db: Session, desafio_id: str) -> Desafio | None:
    """Fila del desafio con FOR UPDATE, releida (otro cierre concurrente pudo cambiarla)."""
    stmt = (
        select(Desafio)
        .where(Desafio.id == desafio_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    return db.scalar(stmt)


def list_ranking(
    db: Session, *, desafio_id: str, grupo_id: str, autor_id: str
) -> list[tuple[Intento, User, bool]]:
    """Intentos en orden de ranking; `elegible` = sigue en el grupo y no es el autor."""
    es_miembro = exists().where(
        Membresia.grupo_id == grupo_id, Membresia.user_id == Intento.user_id
    )
    return (
        db.query(Intento, User, es_miembro & (Intento.user_id != autor_id))
        .join(User, User.id == Intento.user_id)
        .filter(Intento.desafio_id == desafio_id)
        .order_by(Intento.puntaje.desc(), Intento.segundos, Intento.finalizado_at, Intento.id)
        .all()
    )


def get_test(db: Session, test_id: str) -> Test | None:
    return db.get(Test, test_id)


def get_grupo(db: Session, grupo_id: str) -> Grupo | None:
    return db.get(Grupo, grupo_id)


def _leaderboard(db: Session, filtro_desafio, base, user_col):
    """Filas (User, ganados, suma) ordenadas; `base` aporta los usuarios a listar."""
    ganados = (
        select(Desafio.ganador_user_id.label("uid"), func.count().label("n"))
        .join(Grupo, Grupo.id == Desafio.grupo_id)
        .where(filtro_desafio, Desafio.ganador_user_id.is_not(None))
        .group_by(Desafio.ganador_user_id)
        .subquery()
    )
    suma = (
        select(Intento.user_id.label("uid"), func.sum(Intento.puntaje).label("s"))
        .join(Desafio, Desafio.id == Intento.desafio_id)
        .join(Grupo, Grupo.id == Desafio.grupo_id)
        .where(filtro_desafio)
        .group_by(Intento.user_id)
        .subquery()
    )
    n = func.coalesce(ganados.c.n, 0)
    s = func.coalesce(suma.c.s, 0)
    return (
        base(db.query(User, n, s))
        .outerjoin(ganados, ganados.c.uid == user_col)
        .outerjoin(suma, suma.c.uid == user_col)
        .order_by(n.desc(), s.desc())
    )


def leaderboard_grupo(db: Session, grupo_id: str) -> list[tuple[User, int, int]]:
    """Parte de las membresias actuales (incluye 0/0)."""
    q = _leaderboard(
        db,
        Desafio.grupo_id == grupo_id,
        lambda q: q.select_from(Membresia)
        .join(User, User.id == Membresia.user_id)
        .filter(Membresia.grupo_id == grupo_id),
        Membresia.user_id,
    )
    return q.order_by(Membresia.created_at, Membresia.user_id).all()


def ranking_materia(db: Session, materia_id: str) -> list[tuple[User, int, int]]:
    """Usuarios con al menos un intento en grupos de la materia."""
    jugaron = (
        select(Intento.user_id)
        .join(Desafio, Desafio.id == Intento.desafio_id)
        .join(Grupo, Grupo.id == Desafio.grupo_id)
        .where(Grupo.materia_id == materia_id)
    )
    q = _leaderboard(
        db,
        Grupo.materia_id == materia_id,
        lambda q: q.select_from(User).filter(User.id.in_(jugaron)),
        User.id,
    )
    return q.order_by(User.id).all()
