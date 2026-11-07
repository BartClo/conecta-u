from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.ia import GeneracionIA, Resumen


def listar_resumenes(db: Session, user_id: str) -> list[Resumen]:
    stmt = select(Resumen).where(Resumen.user_id == user_id)
    return list(db.scalars(stmt.order_by(Resumen.created_at.desc(), Resumen.id)))


def get_resumen(db: Session, resumen_id: str, user_id: str) -> Resumen | None:
    stmt = select(Resumen).where(Resumen.id == resumen_id, Resumen.user_id == user_id)
    return db.scalars(stmt).first()


def add(db: Session, obj: Resumen | GeneracionIA) -> None:
    db.add(obj)
    db.flush()
