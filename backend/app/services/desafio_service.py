from datetime import UTC, datetime

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core import economia
from app.core.estados_desafio import ESTADO_ABIERTO, ESTADO_CERRADO
from app.core.fechas import aware_utc
from app.models.desafio import Desafio, Intento, RespuestaIntento
from app.models.test import Test
from app.models.user import User
from app.repositories import desafio_repository as repo
from app.repositories import grupo_repository, materia_repository
from app.services import creditos_service, grupo_service


class NoPuedeCerrar(Exception):
    pass


class MateriaNoEncontrada(Exception):
    pass


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


def premio_creditos(desafio: Desafio) -> int:
    return economia.PREMIO_DESAFIO if desafio.premio_acreditado else 0


def nombre_ganador(db: Session, desafio: Desafio) -> str | None:
    if desafio.ganador_user_id is None:
        return None
    ganador = db.get(User, desafio.ganador_user_id)
    return ganador.name or ganador.email


def detalle(db: Session, *, user_id: str, desafio_id: str) -> tuple[Desafio, str, str, str | None]:
    """(desafio, titulo del test, owner_id del grupo, nombre del ganador)."""
    desafio = _desafio_de_miembro(db, desafio_id, user_id)
    titulo = repo.get_test(db, desafio.test_id).titulo
    owner_id = repo.get_grupo(db, desafio.grupo_id).owner_id
    return desafio, titulo, owner_id, nombre_ganador(db, desafio)


def ranking(db: Session, *, user_id: str, desafio_id: str) -> list[tuple[Intento, User, bool]]:
    desafio = _desafio_de_miembro(db, desafio_id, user_id)
    autor_id = repo.get_test(db, desafio.test_id).autor_id
    return repo.list_ranking(
        db, desafio_id=desafio.id, grupo_id=desafio.grupo_id, autor_id=autor_id
    )


def cerrar(db: Session, *, user_id: str, desafio_id: str) -> tuple[Desafio, str | None]:
    desafio = _desafio_de_miembro(db, desafio_id, user_id)
    vencido = desafio.fecha_fin is not None and datetime.now(UTC) > aware_utc(desafio.fecha_fin)
    responsable = user_id == desafio.creado_por or (
        repo.get_grupo(db, desafio.grupo_id).owner_id == user_id
    )
    if not (vencido or responsable):
        raise NoPuedeCerrar()
    # Fila bloqueada y releida: un cierre concurrente espera y luego ve el estado final.
    desafio = repo.get_for_update(db, desafio_id)
    if desafio.estado != ESTADO_CERRADO:
        autor_id = repo.get_test(db, desafio.test_id).autor_id
        filas = repo.list_ranking(
            db, desafio_id=desafio.id, grupo_id=desafio.grupo_id, autor_id=autor_id
        )
        ganador = next((i for i, _, elegible in filas if elegible), None)
        desafio.estado = ESTADO_CERRADO
        if ganador is not None:
            desafio.ganador_user_id = ganador.user_id
            creditos_service.ganar(
                db,
                user_id=ganador.user_id,
                monto=economia.PREMIO_DESAFIO,
                motivo=economia.MOTIVO_GANO_DESAFIO,
                ref_tipo="desafio",
                ref_id=desafio.id,
            )
            desafio.premio_acreditado = True
    db.commit()  # cierre + premio + flag en una sola transaccion
    db.refresh(desafio)
    return desafio, nombre_ganador(db, desafio)


def leaderboard(db: Session, *, user_id: str, grupo_id: str) -> list[tuple[User, int, int]]:
    _exigir_miembro(db, grupo_id, user_id)
    return repo.leaderboard_grupo(db, grupo_id)


def ranking_materia(db: Session, materia_id: str) -> list[tuple[User, int, int]]:
    if materia_repository.get(db, materia_id) is None:
        raise MateriaNoEncontrada()
    return repo.ranking_materia(db, materia_id)
