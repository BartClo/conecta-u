from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.origenes_test import ORIGEN_MANUAL, ORIGENES
from app.models.test import Test
from app.repositories import test_repository as repo
from app.services import materia_service

MAX_TITULO = 150
MAX_OPCION = 500


class TestNoEncontrado(Exception):
    __test__ = False


class MateriaNoEncontrada(Exception):
    pass


class NoAutorizado(Exception):
    pass


class TestEnUso(Exception):
    """El test ya tiene desafios: editarlo o borrarlo rompe las respuestas guardadas."""

    __test__ = False


class TestInvalido(Exception):
    """Primer problema de validacion, con mensaje especifico para el usuario."""

    __test__ = False


def _validar(titulo: str, preguntas: list[dict], origen: str) -> tuple[str, list[dict]]:
    if origen not in ORIGENES:
        raise TestInvalido("El origen del test no es válido")
    titulo = titulo.strip()
    if not titulo:
        raise TestInvalido("El título no puede estar vacío")
    if len(titulo) > MAX_TITULO:
        raise TestInvalido(f"El título no puede superar {MAX_TITULO} caracteres")
    if not preguntas:
        raise TestInvalido("El test necesita al menos una pregunta")
    limpias = []
    for n, p in enumerate(preguntas, start=1):
        enunciado = p["enunciado"].strip()
        if not enunciado:
            raise TestInvalido(f"La pregunta {n} no tiene enunciado")
        if len(p["opciones"]) < 2:
            raise TestInvalido(f"La pregunta {n} necesita al menos 2 opciones")
        opciones = []
        for m, o in enumerate(p["opciones"], start=1):
            texto = o["texto"].strip()
            if not texto:
                raise TestInvalido(f"La opción {m} de la pregunta {n} está vacía")
            if len(texto) > MAX_OPCION:
                raise TestInvalido(
                    f"La opción {m} de la pregunta {n} supera {MAX_OPCION} caracteres"
                )
            opciones.append({"texto": texto, "es_correcta": bool(o["es_correcta"])})
        correctas = sum(o["es_correcta"] for o in opciones)
        if correctas == 0:
            raise TestInvalido(f"La pregunta {n} no tiene ninguna opción correcta")
        if correctas > 1:
            raise TestInvalido(f"La pregunta {n} tiene más de una opción correcta")
        limpias.append({"enunciado": enunciado, "opciones": opciones})
    return titulo, limpias


def _descripcion(valor: str | None) -> str | None:
    return (valor or "").strip() or None


def _exigir_materia(db: Session, materia_id: str) -> None:
    if materia_service.get_materia(db, materia_id) is None:
        raise MateriaNoEncontrada()


def crear_test_sin_commit(
    db: Session,
    *,
    autor_id: str,
    materia_id: str,
    titulo: str,
    descripcion: str | None,
    preguntas: list[dict],
    origen: str,
) -> Test:
    """Crea el arbol completo con flush, sin commit: el llamador controla la transaccion."""
    titulo, preguntas = _validar(titulo, preguntas, origen)
    _exigir_materia(db, materia_id)
    test = Test(
        materia_id=materia_id,
        titulo=titulo,
        descripcion=_descripcion(descripcion),
        autor_id=autor_id,
        origen=origen,
        preguntas=repo.build_preguntas(preguntas),
    )
    return repo.add(db, test)


def crear_test(
    db: Session,
    *,
    autor_id: str,
    materia_id: str,
    titulo: str,
    descripcion: str | None,
    preguntas: list[dict],
    origen: str = ORIGEN_MANUAL,
) -> Test:
    test = crear_test_sin_commit(
        db,
        autor_id=autor_id,
        materia_id=materia_id,
        titulo=titulo,
        descripcion=descripcion,
        preguntas=preguntas,
        origen=origen,
    )
    db.commit()
    db.refresh(test)
    return test


def listar_por_materia(db: Session, *, materia_id: str) -> list[Test]:
    return repo.list_by_materia(db, materia_id)


def get_test(db: Session, test_id: str) -> Test:
    test = repo.get(db, test_id)
    if test is None:
        raise TestNoEncontrado()
    return test


def _test_de_autor(db: Session, test_id: str, user_id: str) -> Test:
    test = get_test(db, test_id)
    if test.autor_id != user_id:
        raise NoAutorizado()
    if repo.tiene_desafios(db, test_id):
        raise TestEnUso()
    return test


def actualizar(
    db: Session,
    *,
    user_id: str,
    test_id: str,
    materia_id: str,
    titulo: str,
    descripcion: str | None,
    preguntas: list[dict],
) -> Test:
    test = _test_de_autor(db, test_id, user_id)
    titulo, preguntas = _validar(titulo, preguntas, test.origen)
    _exigir_materia(db, materia_id)
    test.materia_id = materia_id
    test.titulo = titulo
    test.descripcion = _descripcion(descripcion)
    test.preguntas = repo.build_preguntas(preguntas)  # reemplazo completo (delete-orphan)
    test.updated_at = func.now()  # onupdate no dispara si solo cambian las preguntas
    db.commit()
    db.refresh(test)
    return test


def borrar(db: Session, *, user_id: str, test_id: str) -> None:
    repo.delete(db, _test_de_autor(db, test_id, user_id))
