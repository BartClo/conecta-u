from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.materia import Materia
from app.repositories import materia_repository as repo


def normalizar(nombre: str) -> str:
    return " ".join(nombre.split()).lower()


def get_materia(db: Session, materia_id: str) -> Materia | None:
    return repo.get(db, materia_id)


def buscar_materias(db: Session, *, q: str | None) -> list[Materia]:
    return repo.buscar(db, texto=normalizar(q) if q else None)


def obtener_o_crear(db: Session, *, nombre: str, user_id: str) -> tuple[Materia, bool]:
    """Devuelve (materia, creada). Idempotente por nombre normalizado, también bajo carrera."""
    normalizado = normalizar(nombre)
    existente = repo.get_by_normalizado(db, normalizado)
    if existente is not None:
        return existente, False
    try:
        limpio = " ".join(nombre.split())
        return (
            repo.create(db, nombre=limpio, nombre_normalizado=normalizado, created_by=user_id),
            True,
        )
    except IntegrityError:
        db.rollback()
        return repo.get_by_normalizado(db, normalizado), False
