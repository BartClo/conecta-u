from sqlalchemy import exists
from sqlalchemy.orm import Session, selectinload

from app.models.desafio import Desafio
from app.models.test import Opcion, Pregunta, Test


def get(db: Session, test_id: str) -> Test | None:
    return db.get(Test, test_id)


def list_by_materia(db: Session, materia_id: str) -> list[Test]:
    return (
        db.query(Test)
        .options(selectinload(Test.preguntas).selectinload(Pregunta.opciones))
        .filter(Test.materia_id == materia_id)
        .order_by(Test.created_at.desc(), Test.id)
        .all()
    )


def build_preguntas(preguntas: list[dict]) -> list[Pregunta]:
    """Arma las filas con `orden` secuencial segun la posicion recibida."""
    return [
        Pregunta(
            enunciado=p["enunciado"],
            orden=i,
            opciones=[
                Opcion(texto=o["texto"], es_correcta=o["es_correcta"], orden=j)
                for j, o in enumerate(p["opciones"])
            ],
        )
        for i, p in enumerate(preguntas)
    ]


def add(db: Session, test: Test) -> Test:
    db.add(test)
    db.flush()
    return test


def delete(db: Session, test: Test) -> None:
    db.delete(test)  # el cascade del ORM borra preguntas y opciones
    db.commit()


def tiene_desafios(db: Session, test_id: str) -> bool:
    return db.query(exists().where(Desafio.test_id == test_id)).scalar()
