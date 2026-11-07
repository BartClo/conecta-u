from datetime import UTC, datetime

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.estados_desafio import ESTADO_ABIERTO
from app.core.fechas import aware_utc
from app.models.desafio import Desafio, Intento, RespuestaIntento
from app.models.test import Test
from app.models.user import User
from app.repositories import desafio_repository as repo
from app.repositories import grupo_repository
from app.services import grupo_service


class GrupoNoEncontrado(Exception):
    pass


class DesafioNoEncontrado(Exception):
    pass


class TestNoEncontrado(Exception):
    __test__ = False


class TestOtraMateria(Exception):
    __test__ = False


class DesafioInvalido(Exception):
    pass


class DesafioNoDisponible(Exception):
    pass


class YaRindio(Exception):
    pass


class IntentoNoEncontrado(Exception):
    pass


class RespuestasInvalidas(Exception):
    pass


def _exigir_miembro(db: Session, grupo_id: str, user_id: str) -> None:
    if grupo_service.get_membresia(db, grupo_id, user_id) is None:
        raise GrupoNoEncontrado()


def _desafio_de_miembro(db: Session, desafio_id: str, user_id: str) -> Desafio:
    desafio = repo.get(db, desafio_id)
    if desafio is None or grupo_service.get_membresia(db, desafio.grupo_id, user_id) is None:
        raise DesafioNoEncontrado()
    return desafio


def _exigir_disponible(desafio: Desafio, ahora: datetime) -> None:
    inicio = aware_utc(desafio.fecha_inicio)
    fin = aware_utc(desafio.fecha_fin) if desafio.fecha_fin else None
    if desafio.estado != ESTADO_ABIERTO or ahora < inicio or (fin is not None and ahora > fin):
        raise DesafioNoDisponible()


def _exigir_puede_rendir(db: Session, desafio: Desafio, user_id: str) -> None:
    if repo.get_intento(db, desafio_id=desafio.id, user_id=user_id) is not None:
        raise YaRindio()
    _exigir_disponible(desafio, datetime.now(UTC))


def crear(
    db: Session,
    *,
    user_id: str,
    grupo_id: str,
    test_id: str,
    fecha_inicio: datetime | None,
    fecha_fin: datetime | None,
) -> tuple[Desafio, str]:
    _exigir_miembro(db, grupo_id, user_id)
    test = repo.get_test_completo(db, test_id)
    if test is None:
        raise TestNoEncontrado()
    if test.materia_id != grupo_repository.get(db, grupo_id).materia_id:
        raise TestOtraMateria()
    inicio = fecha_inicio or datetime.now(UTC)
    if fecha_fin is not None and fecha_fin < inicio:
        raise DesafioInvalido("La fecha de fin no puede ser anterior a la de inicio")
    desafio = repo.add(
        db,
        Desafio(
            grupo_id=grupo_id,
            test_id=test_id,
            creado_por=user_id,
            fecha_inicio=inicio,
            fecha_fin=fecha_fin,
            estado=ESTADO_ABIERTO,
        ),
    )
    return desafio, test.titulo


def listar(db: Session, *, user_id: str, grupo_id: str) -> list[tuple[Desafio, str, bool]]:
    _exigir_miembro(db, grupo_id, user_id)
    return repo.list_por_grupo(db, grupo_id=grupo_id, user_id=user_id)


def para_rendir(db: Session, *, user_id: str, desafio_id: str) -> Test:
    desafio = _desafio_de_miembro(db, desafio_id, user_id)
    _exigir_puede_rendir(db, desafio, user_id)
    return repo.get_test_completo(db, desafio.test_id)


def _puntuar(test: Test, respuestas: list[dict]) -> int:
    """Puntaje = respuestas correctas; exige exactamente una respuesta por pregunta."""
    elegidas = {r["pregunta_id"]: r["opcion_id"] for r in respuestas}
    if len(elegidas) != len(respuestas):
        raise RespuestasInvalidas("Hay preguntas respondidas más de una vez")
    if set(elegidas) != {p.id for p in test.preguntas}:
        raise RespuestasInvalidas("Debes responder exactamente todas las preguntas del test")
    puntaje = 0
    for pregunta in test.preguntas:
        opcion = next((o for o in pregunta.opciones if o.id == elegidas[pregunta.id]), None)
        if opcion is None:
            raise RespuestasInvalidas("Una opción no pertenece a su pregunta")
        puntaje += opcion.es_correcta
    return puntaje


def rendir(
    db: Session, *, user_id: str, desafio_id: str, segundos: int, respuestas: list[dict]
) -> Intento:
    desafio = _desafio_de_miembro(db, desafio_id, user_id)
    _exigir_puede_rendir(db, desafio, user_id)
    test = repo.get_test_completo(db, desafio.test_id)
    puntaje = _puntuar(test, respuestas)
    intento = Intento(
        desafio_id=desafio_id,
        user_id=user_id,
        puntaje=puntaje,
        total=len(test.preguntas),
        segundos=segundos,
        finalizado_at=datetime.now(UTC),
        respuestas=[
            RespuestaIntento(pregunta_id=r["pregunta_id"], opcion_id=r["opcion_id"])
            for r in respuestas
        ],
    )
    try:
        return repo.add_intento(db, intento)
    except IntegrityError as exc:  # intento concurrente: gano el unique (desafio, user)
        db.rollback()
        raise YaRindio() from exc


def mi_intento(db: Session, *, user_id: str, desafio_id: str) -> Intento:
    _desafio_de_miembro(db, desafio_id, user_id)
    intento = repo.get_intento(db, desafio_id=desafio_id, user_id=user_id)
    if intento is None:
        raise IntentoNoEncontrado()
    return intento


def resultados(db: Session, *, user_id: str, desafio_id: str) -> list[tuple[Intento, User]]:
    _desafio_de_miembro(db, desafio_id, user_id)
    return repo.list_resultados(db, desafio_id)
