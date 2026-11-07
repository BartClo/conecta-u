from sqlalchemy import exists
from sqlalchemy.orm import Session, selectinload

from app.models.desafio import Desafio, Intento
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
