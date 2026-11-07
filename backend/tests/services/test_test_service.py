import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.database import Base
from app.models.materia import Materia
from app.models.test import Test
from app.models.user import User
from app.services import test_service as svc


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        session.add(User(id="u1", email="a@b.com"))
        session.add(
            Materia(id="m1", nombre="Cálculo", nombre_normalizado="cálculo", created_by="u1")
        )
        session.commit()
        yield session


def _op(texto, ok=False):
    return {"texto": texto, "es_correcta": ok}


def _preg(enunciado="¿Q?", opciones=None):
    return {"enunciado": enunciado, "opciones": opciones or [_op("a", True), _op("b")]}


def _args(**kw):
    base = {
        "autor_id": "u1",
        "materia_id": "m1",
        "titulo": "T",
        "descripcion": None,
        "preguntas": [_preg()],
        "origen": "manual",
    }
    return {**base, **kw}


def test_sin_commit_hace_flush_pero_permite_rollback(db):
    test = svc.crear_test_sin_commit(db, **_args())

    assert test.id is not None
    assert test.preguntas[0].opciones[0].id is not None
    db.rollback()
    assert db.query(Test).count() == 0


def test_publica_hace_commit_y_orden_secuencial(db):
    preguntas = [_preg("uno"), _preg("dos", [_op("a"), _op("b"), _op("c", True)])]
    test = svc.crear_test(db, **_args(preguntas=preguntas, descripcion="  "))
    db.rollback()

    assert db.query(Test).count() == 1
    assert test.descripcion is None
    assert [p.orden for p in test.preguntas] == [0, 1]
    assert [o.orden for o in test.preguntas[1].opciones] == [0, 1, 2]


def test_recorta_textos(db):
    test = svc.crear_test(
        db, **_args(titulo="  T  ", preguntas=[_preg(" q ", [_op(" a ", True), _op("b")])])
    )

    assert test.titulo == "T"
    assert test.preguntas[0].enunciado == "q"
    assert test.preguntas[0].opciones[0].texto == "a"


@pytest.mark.parametrize(
    ("kw", "mensaje"),
    [
        ({"origen": "x"}, "origen"),
        ({"titulo": "  "}, "título no puede estar vacío"),
        ({"titulo": "x" * 151}, "150"),
        ({"preguntas": []}, "al menos una pregunta"),
        ({"preguntas": [_preg(), _preg("  ")]}, "pregunta 2 no tiene enunciado"),
        ({"preguntas": [_preg(opciones=[_op("a", True)])]}, "pregunta 1 necesita al menos 2"),
        (
            {"preguntas": [_preg(opciones=[_op("a", True), _op(" ")])]},
            "opción 2 de la pregunta 1 está vacía",
        ),
        ({"preguntas": [_preg(opciones=[_op("a", True), _op("x" * 501)])]}, "500"),
        (
            {"preguntas": [_preg(), _preg(opciones=[_op("a"), _op("b")])]},
            "pregunta 2 no tiene ninguna",
        ),
        ({"preguntas": [_preg(opciones=[_op("a", True), _op("b", True)])]}, "más de una"),
    ],
)
def test_validaciones(db, kw, mensaje):
    with pytest.raises(svc.TestInvalido, match=mensaje):
        svc.crear_test(db, **_args(**kw))
    assert db.query(Test).count() == 0


def test_materia_inexistente(db):
    with pytest.raises(svc.MateriaNoEncontrada):
        svc.crear_test(db, **_args(materia_id="nope"))


def test_actualizar_reemplaza_y_valida_autor(db):
    test = svc.crear_test(db, **_args())
    viejo = test.preguntas[0].id

    nuevo = svc.actualizar(
        db,
        user_id="u1",
        test_id=test.id,
        materia_id="m1",
        titulo="Nuevo",
        descripcion="d",
        preguntas=[_preg("x"), _preg("y")],
    )

    assert nuevo.titulo == "Nuevo"
    assert len(nuevo.preguntas) == 2
    assert viejo not in {p.id for p in nuevo.preguntas}
    with pytest.raises(svc.NoAutorizado):
        svc.borrar(db, user_id="otro", test_id=test.id)
    with pytest.raises(svc.TestNoEncontrado):
        svc.get_test(db, "nope")
