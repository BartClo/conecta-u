from datetime import date

from sqlalchemy.orm import Session

from app.models.curso import Curso
from app.models.semestre import Semestre


def list_semestres(db: Session, *, user_id: str) -> list[Semestre]:
    return (
        db.query(Semestre)
        .filter(Semestre.user_id == user_id)
        .order_by(Semestre.fecha_inicio.desc())
        .all()
    )


def get_semestre(db: Session, *, user_id: str, semestre_id: str) -> Semestre | None:
    return (
        db.query(Semestre).filter(Semestre.id == semestre_id, Semestre.user_id == user_id).first()
    )


def create_semestre(
    db: Session, *, user_id: str, nombre: str, fecha_inicio: date, fecha_fin: date
) -> Semestre:
    semestre = Semestre(
        user_id=user_id, nombre=nombre, fecha_inicio=fecha_inicio, fecha_fin=fecha_fin
    )
    db.add(semestre)
    db.commit()
    db.refresh(semestre)
    return semestre


def update_semestre(
    db: Session, semestre: Semestre, *, nombre: str, fecha_inicio: date, fecha_fin: date
) -> Semestre:
    semestre.nombre = nombre
    semestre.fecha_inicio = fecha_inicio
    semestre.fecha_fin = fecha_fin
    db.commit()
    db.refresh(semestre)
    return semestre


def delete_semestre(db: Session, semestre: Semestre) -> None:
    db.delete(semestre)
    db.commit()


def count_cursos_en_semestre(db: Session, *, semestre_id: str) -> int:
    return db.query(Curso).filter(Curso.semestre_id == semestre_id).count()
