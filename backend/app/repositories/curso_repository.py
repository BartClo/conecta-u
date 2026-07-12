from sqlalchemy.orm import Session

from app.models.curso import Curso


def list_cursos(db: Session, *, user_id: str, semestre_id: str | None = None) -> list[Curso]:
    query = db.query(Curso).filter(Curso.user_id == user_id)
    if semestre_id is not None:
        query = query.filter(Curso.semestre_id == semestre_id)
    return query.order_by(Curso.nombre).all()


def get_curso(db: Session, *, user_id: str, curso_id: str) -> Curso | None:
    return db.query(Curso).filter(Curso.id == curso_id, Curso.user_id == user_id).first()


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
    curso = Curso(
        user_id=user_id,
        semestre_id=semestre_id,
        nombre=nombre,
        codigo=codigo,
        profesor=profesor,
        color=color,
    )
    db.add(curso)
    db.commit()
    db.refresh(curso)
    return curso


def update_curso(
    db: Session, curso: Curso, *, nombre: str, codigo: str, profesor: str | None, color: str
) -> Curso:
    curso.nombre = nombre
    curso.codigo = codigo
    curso.profesor = profesor
    curso.color = color
    db.commit()
    db.refresh(curso)
    return curso


def delete_curso(db: Session, curso: Curso) -> None:
    db.delete(curso)
    db.commit()
