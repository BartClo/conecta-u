from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from app.core.tipos_evento import DIAS_SEMANA_PERMITIDOS, TIPOS_EVENTO_PERMITIDOS
from app.models.evento import Evento
from app.repositories import evento_repository as repo
from app.services import curso_service


class CursoNoEncontrado(Exception):
    pass


class TipoInvalido(Exception):
    pass


class RecurrenciaInvalida(Exception):
    pass


def _validar_tipo(tipo: str) -> None:
    if tipo not in TIPOS_EVENTO_PERMITIDOS:
        raise TipoInvalido(f"tipo debe ser uno de {TIPOS_EVENTO_PERMITIDOS}")


def _validar_recurrencia(
    recurrencia_dia_semana: int | None, recurrencia_hasta: date | None, fecha_inicio: datetime
) -> None:
    if recurrencia_dia_semana is None:
        return
    if recurrencia_dia_semana not in DIAS_SEMANA_PERMITIDOS:
        raise RecurrenciaInvalida(
            f"recurrencia_dia_semana debe ser uno de {DIAS_SEMANA_PERMITIDOS}"
        )
    if recurrencia_hasta is None:
        raise RecurrenciaInvalida("recurrencia_hasta es requerido si hay recurrencia_dia_semana")
    if recurrencia_hasta < fecha_inicio.date():
        raise RecurrenciaInvalida("recurrencia_hasta no puede ser anterior a fecha_inicio")


def get_evento(db: Session, *, user_id: str, evento_id: str) -> Evento | None:
    return repo.get_evento(db, user_id=user_id, evento_id=evento_id)


def create_evento(
    db: Session,
    *,
    user_id: str,
    titulo: str,
    descripcion: str | None,
    tipo: str,
    fecha_inicio: datetime,
    fecha_fin: datetime | None,
    curso_id: str | None,
    recurrencia_dia_semana: int | None,
    recurrencia_hasta: date | None,
) -> Evento:
    _validar_tipo(tipo)
    _validar_recurrencia(recurrencia_dia_semana, recurrencia_hasta, fecha_inicio)

    if (
        curso_id is not None
        and curso_service.get_curso(db, user_id=user_id, curso_id=curso_id) is None
    ):
        raise CursoNoEncontrado(f"Curso no encontrado: {curso_id}")

    return repo.create_evento(
        db,
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


def update_evento(db: Session, evento: Evento, **campos) -> Evento:
    if "tipo" in campos:
        _validar_tipo(campos["tipo"])
    if "recurrencia_dia_semana" in campos or "recurrencia_hasta" in campos:
        dia = campos.get("recurrencia_dia_semana", evento.recurrencia_dia_semana)
        hasta = campos.get("recurrencia_hasta", evento.recurrencia_hasta)
        fecha_inicio = campos.get("fecha_inicio", evento.fecha_inicio)
        _validar_recurrencia(dia, hasta, fecha_inicio)
    if "curso_id" in campos and campos["curso_id"] is not None:
        curso = curso_service.get_curso(db, user_id=evento.user_id, curso_id=campos["curso_id"])
        if curso is None:
            raise CursoNoEncontrado(f"Curso no encontrado: {campos['curso_id']}")
    return repo.update_evento(db, evento, **campos)


def delete_evento(db: Session, evento: Evento) -> None:
    repo.delete_evento(db, evento)


def expand_ocurrencias(evento: Evento, *, desde: date, hasta: date) -> list[dict]:
    base = {
        "id": evento.id,
        "curso_id": evento.curso_id,
        "titulo": evento.titulo,
        "descripcion": evento.descripcion,
        "tipo": evento.tipo,
    }
    duracion = (evento.fecha_fin - evento.fecha_inicio) if evento.fecha_fin else None

    if evento.recurrencia_dia_semana is None:
        if desde <= evento.fecha_inicio.date() <= hasta:
            return [{**base, "fecha_inicio": evento.fecha_inicio, "fecha_fin": evento.fecha_fin}]
        return []

    ventana_hasta = min(hasta, evento.recurrencia_hasta)
    if ventana_hasta < desde or ventana_hasta < evento.fecha_inicio.date():
        return []

    primera_ocurrencia = evento.fecha_inicio.date()
    dias_hasta_dia_semana = (evento.recurrencia_dia_semana - primera_ocurrencia.weekday()) % 7
    primera_ocurrencia += timedelta(days=dias_hasta_dia_semana)

    if primera_ocurrencia < desde:
        dias_faltantes = (desde - primera_ocurrencia).days
        semanas_a_saltar = -(-dias_faltantes // 7)
        primera_ocurrencia += timedelta(weeks=semanas_a_saltar)

    ocurrencias = []
    cursor = primera_ocurrencia
    while cursor <= ventana_hasta:
        inicio = datetime.combine(cursor, evento.fecha_inicio.time())
        fin = inicio + duracion if duracion is not None else None
        ocurrencias.append({**base, "fecha_inicio": inicio, "fecha_fin": fin})
        cursor += timedelta(weeks=1)

    return ocurrencias


def list_eventos_en_rango(db: Session, *, user_id: str, desde: date, hasta: date) -> list[dict]:
    eventos = repo.list_eventos(db, user_id=user_id)
    resultado: list[dict] = []
    for evento in eventos:
        resultado.extend(expand_ocurrencias(evento, desde=desde, hasta=hasta))
    resultado.sort(key=lambda o: o["fecha_inicio"])
    return resultado
