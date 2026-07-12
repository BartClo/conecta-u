from datetime import date

from sqlalchemy.orm import Session

from app.models.semestre import Semestre
from app.repositories import semestre_repository as repo


class SemestreEnUso(Exception):
    pass


def list_semestres(db: Session, *, user_id: str) -> list[Semestre]:
    return repo.list_semestres(db, user_id=user_id)


def get_semestre(db: Session, *, user_id: str, semestre_id: str) -> Semestre | None:
    return repo.get_semestre(db, user_id=user_id, semestre_id=semestre_id)


def create_semestre(
    db: Session, *, user_id: str, nombre: str, fecha_inicio: date, fecha_fin: date
) -> Semestre:
    return repo.create_semestre(
        db, user_id=user_id, nombre=nombre, fecha_inicio=fecha_inicio, fecha_fin=fecha_fin
    )


def update_semestre(
    db: Session, semestre: Semestre, *, nombre: str, fecha_inicio: date, fecha_fin: date
) -> Semestre:
    return repo.update_semestre(
        db, semestre, nombre=nombre, fecha_inicio=fecha_inicio, fecha_fin=fecha_fin
    )


def delete_semestre(db: Session, semestre: Semestre) -> None:
    if repo.count_cursos_en_semestre(db, semestre_id=semestre.id) > 0:
        raise SemestreEnUso()
    repo.delete_semestre(db, semestre)
