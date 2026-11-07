from sqlalchemy.orm import Session

from app.models.materia import Materia


def get(db: Session, materia_id: str) -> Materia | None:
    return db.get(Materia, materia_id)


def get_by_normalizado(db: Session, nombre_normalizado: str) -> Materia | None:
    return db.query(Materia).filter(Materia.nombre_normalizado == nombre_normalizado).first()


def buscar(db: Session, *, texto: str | None, limite: int = 20) -> list[Materia]:
    query = db.query(Materia)
    if texto:
        query = query.filter(Materia.nombre_normalizado.contains(texto, autoescape=True))
    return query.order_by(Materia.created_at.desc(), Materia.id).limit(limite).all()


def create(db: Session, *, nombre: str, nombre_normalizado: str, created_by: str) -> Materia:
    materia = Materia(nombre=nombre, nombre_normalizado=nombre_normalizado, created_by=created_by)
    db.add(materia)
    db.commit()
    db.refresh(materia)
    return materia
