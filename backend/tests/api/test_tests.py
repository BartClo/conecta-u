import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import get_current_token
from app.main import app
from app.models.materia import Materia
from app.models.test import Opcion, Pregunta, Test
from app.models.user import User

engine = create_engine(
    "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
TestSession = sessionmaker(bind=engine)
client = TestClient(app)
actual = {"sub": "ana"}


def _db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def _overrides():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with TestSession() as db:
        for uid in ("ana", "beto"):
            db.add(User(id=uid, email=f"{uid}@x.com", name=uid.title()))
        db.add(Materia(id="m1", nombre="Física", nombre_normalizado="física", created_by="ana"))
        db.commit()
    previous = dict(app.dependency_overrides)
    app.dependency_overrides[get_db] = _db
    app.dependency_overrides[get_current_token] = lambda: {
        "sub": actual["sub"],
        "email": "x@x.com",
        "user_metadata": {},
    }
    actual["sub"] = "ana"
    yield
    app.dependency_overrides.clear()
    app.dependency_overrides.update(previous)


def _body(**kw):
    base = {
        "materia_id": "m1",
        "titulo": "Parcial 1",
        "descripcion": "desc",
        "preguntas": [
            {
                "enunciado": "¿2+2?",
                "opciones": [
                    {"texto": "3", "es_correcta": False},
                    {"texto": "4", "es_correcta": True},
                ],
            }
        ],
    }
    return {**base, **kw}


def _crear(**kw):
    r = client.post("/api/tests", json=_body(**kw))
    assert r.status_code == 201, r.text
    return r.json()


def test_crear_devuelve_arbol_con_orden_y_es_correcta_para_el_autor():
    t = _crear()

    assert t["autor_id"] == "ana"
    assert t["origen"] == "manual"
    assert t["preguntas"][0]["orden"] == 0
    assert [o["orden"] for o in t["preguntas"][0]["opciones"]] == [0, 1]
    assert [o["es_correcta"] for o in t["preguntas"][0]["opciones"]] == [False, True]


def test_body_no_puede_forzar_origen_ni_autor():
    t = _crear(origen="ia", autor_id="beto")

    assert t["origen"] == "manual"
    assert t["autor_id"] == "ana"


def test_es_correcta_solo_para_el_autor_en_json_crudo():
    t = _crear()

    propio = client.get(f"/api/tests/{t['id']}").text
    assert "es_correcta" in propio

    actual["sub"] = "beto"
    ajeno = client.get(f"/api/tests/{t['id']}")
    assert ajeno.status_code == 200
    assert "es_correcta" not in ajeno.text
    assert ajeno.json()["preguntas"][0]["opciones"][0].keys() == {"id", "texto", "orden"}
    lista = client.get("/api/tests", params={"materia_id": "m1"})
    assert "es_correcta" not in lista.text


def test_listar_por_materia_incluye_preguntas_y_tests_de_todos():
    _crear(titulo="A")
    actual["sub"] = "beto"
    _crear(titulo="B")

    r = client.get("/api/tests", params={"materia_id": "m1"})

    assert r.status_code == 200
    assert {t["titulo"] for t in r.json()} == {"A", "B"}
    assert all(len(t["preguntas"]) == 1 for t in r.json())
    assert "es_correcta" in r.text  # el propio test de beto lo conserva


def test_listar_sin_materia_id_es_400():
    assert client.get("/api/tests").status_code == 400
    assert client.get("/api/tests", params={"materia_id": ""}).status_code == 400


def test_listar_materia_desconocida_es_vacio():
    r = client.get("/api/tests", params={"materia_id": "nope"})

    assert r.status_code == 200
    assert r.json() == []


def test_detalle_inexistente_404():
    assert client.get("/api/tests/nope").status_code == 404


def test_crear_materia_inexistente_404():
    r = client.post("/api/tests", json=_body(materia_id="nope"))

    assert r.status_code == 404


@pytest.mark.parametrize(
    ("preguntas", "mensaje"),
    [
        ([], "al menos una pregunta"),
        ([{"enunciado": "q", "opciones": [{"texto": "a", "es_correcta": True}]}], "al menos 2"),
        (
            [
                {
                    "enunciado": "q",
                    "opciones": [
                        {"texto": "a", "es_correcta": False},
                        {"texto": "b", "es_correcta": False},
                    ],
                }
            ],
            "ninguna opción correcta",
        ),
        (
            [
                {
                    "enunciado": "q",
                    "opciones": [
                        {"texto": "a", "es_correcta": True},
                        {"texto": "b", "es_correcta": True},
                    ],
                }
            ],
            "más de una",
        ),
    ],
)
def test_invariantes_dan_422_con_mensaje(preguntas, mensaje):
    r = client.post("/api/tests", json=_body(preguntas=preguntas))

    assert r.status_code == 422
    assert mensaje in r.json()["detail"]


def test_put_reemplaza_el_arbol():
    t = _crear()
    viejas = t["preguntas"][0]["id"]
    nuevo = _body(
        titulo="Editado",
        preguntas=[
            {
                "enunciado": f"p{i}",
                "opciones": [
                    {"texto": "a", "es_correcta": i == 0},
                    {"texto": "b", "es_correcta": i == 1},
                ],
            }
            for i in range(2)
        ],
    )

    r = client.put(f"/api/tests/{t['id']}", json=nuevo)

    assert r.status_code == 200
    assert r.json()["titulo"] == "Editado"
    assert len(r.json()["preguntas"]) == 2
    with TestSession() as db:
        assert db.get(Pregunta, viejas) is None
        assert db.query(Pregunta).count() == 2
        assert db.query(Opcion).count() == 4


def test_put_y_delete_de_no_autor_403_e_inexistente_404():
    t = _crear()
    actual["sub"] = "beto"

    assert client.put(f"/api/tests/{t['id']}", json=_body()).status_code == 403
    assert client.delete(f"/api/tests/{t['id']}").status_code == 403
    assert client.put("/api/tests/nope", json=_body()).status_code == 404
    assert client.delete("/api/tests/nope").status_code == 404


def test_delete_en_cascada():
    t = _crear()

    assert client.delete(f"/api/tests/{t['id']}").status_code == 204

    with TestSession() as db:
        assert db.query(Test).count() == 0
        assert db.query(Pregunta).count() == 0
        assert db.query(Opcion).count() == 0
