from sqlalchemy.orm import Session

from app.models.evento import Evento


def list_eventos(db: Session, *, user_id: str) -> list[Evento]:
    return db.query(Evento).filter(Evento.user_id == user_id).all()


def get_evento(db: Session, *, user_id: str, evento_id: str) -> Evento | None:
    return db.query(Evento).filter(Evento.id == evento_id, Evento.user_id == user_id).first()


def create_evento(
    db: Session,
    *,
    user_id: str,
    curso_id: str | None,
    titulo: str,
    descripcion: str | None,
    tipo: str,
    fecha_inicio,
    fecha_fin,
    recurrencia_dia_semana: int | None,
    recurrencia_hasta,
) -> Evento:
    evento = Evento(
        user_id=user_id,
        curso_id=curso_id,
        titulo=titulo,
        descripcion=descripcion,
        tipo=tipo,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        recurrencia_dia_semana=recurrencia_dia_semana,
        recurrencia_hasta=recurrencia_hasta,
    )
    db.add(evento)
    db.commit()
    db.refresh(evento)
    return evento


def update_evento(db: Session, evento: Evento, **campos) -> Evento:
    for campo, valor in campos.items():
        setattr(evento, campo, valor)
    db.commit()
    db.refresh(evento)
    return evento


def delete_evento(db: Session, evento: Evento) -> None:
    db.delete(evento)
    db.commit()
