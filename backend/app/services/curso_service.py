from sqlalchemy.orm import Session

from app.models.curso import Curso
from app.repositories import curso_repository as repo
from app.services import semestre_service


class SemestreNoEncontrado(Exception):
    pass


def list_cursos(db: Session, *, user_id: str, semestre_id: str | None = None) -> list[Curso]:
    return repo.list_cursos(db, user_id=user_id, semestre_id=semestre_id)


def get_curso(db: Session, *, user_id: str, curso_id: str) -> Curso | None:
    return repo.get_curso(db, user_id=user_id, curso_id=curso_id)


def create_curso(
    db: Session,
    *,
    user_id: str,
    semestre_id: str,
    nombre: str,
    codigo: str,
    profesor: str | None,
    color: str,
) -> Curso:
    if semestre_service.get_semestre(db, user_id=user_id, semestre_id=semestre_id) is None:
        raise SemestreNoEncontrado()
    return repo.create_curso(
        db,
        user_id=user_id,
        semestre_id=semestre_id,
        nombre=nombre,
        codigo=codigo,
        profesor=profesor,
        color=color,
    )


def update_curso(
    db: Session, curso: Curso, *, nombre: str, codigo: str, profesor: str | None, color: str
) -> Curso:
    return repo.update_curso(
        db, curso, nombre=nombre, codigo=codigo, profesor=profesor, color=color
    )


def delete_curso(db: Session, curso: Curso) -> None:
    repo.delete_curso(db, curso)
