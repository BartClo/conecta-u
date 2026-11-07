from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.estados_desafio import ESTADO_CERRADO
from app.core.fechas import aware_utc
from app.core.security import get_current_token
from app.main import app
from app.models.desafio import Desafio, Intento, RespuestaIntento
from app.models.user import User
from app.repositories import desafio_repository

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
        for uid in ("ana", "beto", "caro", "intruso"):
            db.add(User(id=uid, email=f"{uid}@x.com", name=None if uid == "caro" else uid.title()))
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


def _como(uid):
    actual["sub"] = uid


def _test(materia_id, titulo="Parcial", n=2):
    preguntas = [
        {
            "enunciado": f"P{i}",
            "opciones": [
                {"texto": "mala", "es_correcta": False},
                {"texto": "buena", "es_correcta": True},
            ],
        }
        for i in range(n)
    ]
    r = client.post(
        "/api/tests", json={"materia_id": materia_id, "titulo": titulo, "preguntas": preguntas}
    )
    assert r.status_code == 201, r.text
    return r.json()


def _escenario():
    """ana (owner) y beto/caro (miembros) en un grupo con un test de 2 preguntas."""
    materia = client.post("/api/materias", json={"nombre": "Física"}).json()
    grupo = client.post("/api/grupos", json={"nombre": "G", "materia_id": materia["id"]}).json()
    test = _test(materia["id"])
    for uid in ("beto", "caro"):
        _como(uid)
        assert client.post("/api/grupos/unirse", json={"codigo": grupo["codigo_invitacion"]})
    _como("ana")
    return materia, grupo, test


def _desafio(grupo, test, **kw):
    r = client.post(f"/api/grupos/{grupo['id']}/desafios", json={"test_id": test["id"], **kw})
    assert r.status_code == 201, r.text
    return r.json()


def _respuestas(test, correctas):
    """correctas: lista de bool por pregunta."""
    out = []
    for pregunta, ok in zip(test["preguntas"], correctas, strict=True):
        opcion = next(o for o in pregunta["opciones"] if o["es_correcta"] == ok)
        out.append({"pregunta_id": pregunta["id"], "opcion_id": opcion["id"]})
    return out


def _rendir(desafio, test, correctas, segundos=10):
    return client.post(
        f"/api/desafios/{desafio['id']}/intentos",
        json={"segundos": segundos, "respuestas": _respuestas(test, correctas)},
    )


def _set_estado(desafio_id, **campos):
    with TestSession() as db:
        d = db.get(Desafio, desafio_id)
        for k, v in campos.items():
            setattr(d, k, v)
        db.commit()


# --- crear / listar ---


def test_crear_y_listar_con_test_titulo_y_ya_rindio():
    _, grupo, test = _escenario()
    d = _desafio(grupo, test)
    assert d["test_titulo"] == "Parcial"
    assert d["estado"] == "abierto"
    assert d["ya_rindio"] is False
    assert d["fecha_fin"] is None
    assert d["fecha_inicio"].endswith("Z") or "+00:00" in d["fecha_inicio"]

    assert _rendir(d, test, [True, True]).status_code == 201
    lista = client.get(f"/api/grupos/{grupo['id']}/desafios").json()
    assert [(x["id"], x["ya_rindio"]) for x in lista] == [(d["id"], True)]
    _como("beto")
    assert client.get(f"/api/grupos/{grupo['id']}/desafios").json()[0]["ya_rindio"] is False


def test_crear_miembro_no_owner_puede():
    _, grupo, test = _escenario()
    _como("beto")
    assert _desafio(grupo, test)["creado_por"] == "beto"


def test_crear_test_de_otra_materia_409():
    _, grupo, _ = _escenario()
    otra = client.post("/api/materias", json={"nombre": "Química"}).json()
    ajeno = _test(otra["id"])
    r = client.post(f"/api/grupos/{grupo['id']}/desafios", json={"test_id": ajeno["id"]})
    assert r.status_code == 409


def test_crear_test_inexistente_404():
    _, grupo, _ = _escenario()
    r = client.post(f"/api/grupos/{grupo['id']}/desafios", json={"test_id": "nope"})
    assert r.status_code == 404


def test_crear_fin_antes_de_inicio_422():
    _, grupo, test = _escenario()
    ahora = datetime.now(UTC)
    r = client.post(
        f"/api/grupos/{grupo['id']}/desafios",
        json={
            "test_id": test["id"],
            "fecha_inicio": ahora.isoformat(),
            "fecha_fin": (ahora - timedelta(days=1)).isoformat(),
        },
    )
    assert r.status_code == 422


def test_no_miembro_404_en_todo():
    _, grupo, test = _escenario()
    d = _desafio(grupo, test)
    _como("intruso")
    assert (
        client.post(f"/api/grupos/{grupo['id']}/desafios", json={"test_id": test["id"]}).status_code
        == 404
    )
    assert client.get(f"/api/grupos/{grupo['id']}/desafios").status_code == 404
    assert client.get(f"/api/desafios/{d['id']}/rendir").status_code == 404
    assert _rendir(d, test, [True, True]).status_code == 404
    assert client.get(f"/api/desafios/{d['id']}/intentos/me").status_code == 404
    assert client.get(f"/api/desafios/{d['id']}/resultados").status_code == 404
    assert client.get("/api/desafios/inexistente/rendir").status_code == 404


# --- rendir ---


def test_rendir_no_expone_es_correcta_en_json_crudo():
    _, grupo, test = _escenario()
    d = _desafio(grupo, test)
    r = client.get(f"/api/desafios/{d['id']}/rendir")
    assert r.status_code == 200
    assert "es_correcta" not in r.text
    body = r.json()
    assert body["titulo"] == "Parcial"
    assert len(body["preguntas"]) == 2
    assert set(body["preguntas"][0]["opciones"][0]) == {"id", "texto", "orden"}


def test_rendir_get_ya_rindio_y_no_disponible_detail_estable():
    _, grupo, test = _escenario()
    d = _desafio(grupo, test)
    assert _rendir(d, test, [True, False]).status_code == 201
    r = client.get(f"/api/desafios/{d['id']}/rendir")
    assert (r.status_code, r.json()["detail"]) == (409, "ya_rindio")
    _como("beto")
    _set_estado(d["id"], estado=ESTADO_CERRADO)
    r = client.get(f"/api/desafios/{d['id']}/rendir")
    assert (r.status_code, r.json()["detail"]) == (409, "desafio_no_disponible")


# --- intentos ---


def test_puntaje_server_side_con_mixtas_e_ignora_puntaje_del_cliente():
    _, grupo, test = _escenario()
    d = _desafio(grupo, test)
    r = client.post(
        f"/api/desafios/{d['id']}/intentos",
        json={
            "segundos": 33,
            "puntaje": 99,
            "total": 99,
            "respuestas": [{**x, "es_correcta": True} for x in _respuestas(test, [True, False])],
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert (body["puntaje"], body["total"], body["segundos"]) == (1, 2, 33)
    assert body["user_id"] == "ana"
    with TestSession() as db:
        assert db.query(RespuestaIntento).count() == 2


def test_reintento_409_ya_rindio():
    _, grupo, test = _escenario()
    d = _desafio(grupo, test)
    assert _rendir(d, test, [True, True]).status_code == 201
    r = _rendir(d, test, [False, False])
    assert (r.status_code, r.json()["detail"]) == (409, "ya_rindio")
    assert client.get(f"/api/desafios/{d['id']}/intentos/me").json()["puntaje"] == 2


def test_intento_concurrente_integrity_error_409(monkeypatch):
    _, grupo, test = _escenario()
    d = _desafio(grupo, test)

    def _boom(db, intento):
        raise IntegrityError("x", {}, Exception("dup"))

    monkeypatch.setattr(desafio_repository, "add_intento", _boom)
    r = _rendir(d, test, [True, True])
    assert (r.status_code, r.json()["detail"]) == (409, "ya_rindio")


def test_rendir_cerrado_o_fuera_de_ventana_409_no_disponible():
    _, grupo, test = _escenario()
    ahora = datetime.now(UTC)
    cerrado = _desafio(grupo, test)
    _set_estado(cerrado["id"], estado=ESTADO_CERRADO)
    futuro = _desafio(grupo, test, fecha_inicio=(ahora + timedelta(days=1)).isoformat())
    vencido = _desafio(
        grupo,
        test,
        fecha_inicio=(ahora - timedelta(days=2)).isoformat(),
        fecha_fin=(ahora - timedelta(days=1)).isoformat(),
    )
    for d in (cerrado, futuro, vencido):
        r = _rendir(d, test, [True, True])
        assert (r.status_code, r.json()["detail"]) == (409, "desafio_no_disponible")


def test_ventana_con_datetimes_naive_de_sqlite():
    """SQLite devuelve naive: la comparacion no debe romper con TypeError."""
    _, grupo, test = _escenario()
    ahora = datetime.now(UTC)
    d = _desafio(
        grupo,
        test,
        fecha_inicio=(ahora - timedelta(hours=1)).isoformat(),
        fecha_fin=(ahora + timedelta(hours=1)).isoformat(),
    )
    with TestSession() as db:
        assert db.get(Desafio, d["id"]).fecha_fin.tzinfo is None
    assert _rendir(d, test, [True, True]).status_code == 201


@pytest.mark.parametrize(
    "mutar",
    [
        lambda rs: rs[:1],  # falta una
        lambda rs: rs + rs[:1],  # duplicada
        lambda rs: [rs[0], {**rs[1], "pregunta_id": "ajena"}],  # pregunta ajena
        lambda rs: [rs[0], {**rs[1], "opcion_id": "ajena"}],  # opcion inexistente
        lambda rs: [],
    ],
)
def test_respuestas_invalidas_422(mutar):
    _, grupo, test = _escenario()
    d = _desafio(grupo, test)
    r = client.post(
        f"/api/desafios/{d['id']}/intentos",
        json={"segundos": 5, "respuestas": mutar(_respuestas(test, [True, True]))},
    )
    assert r.status_code == 422
    with TestSession() as db:
        assert db.query(Intento).count() == 0


def test_opcion_de_otra_pregunta_422():
    _, grupo, test = _escenario()
    d = _desafio(grupo, test)
    rs = _respuestas(test, [True, True])
    rs[0]["opcion_id"] = rs[1]["opcion_id"]
    r = client.post(f"/api/desafios/{d['id']}/intentos", json={"segundos": 5, "respuestas": rs})
    assert r.status_code == 422


@pytest.mark.parametrize("segundos", [-1, 1.5, "10", True, None])
def test_segundos_invalidos_422(segundos):
    _, grupo, test = _escenario()
    d = _desafio(grupo, test)
    r = client.post(
        f"/api/desafios/{d['id']}/intentos",
        json={"segundos": segundos, "respuestas": _respuestas(test, [True, True])},
    )
    assert r.status_code == 422


# --- resultados ---


def test_mi_intento_404_si_no_rindio():
    _, grupo, test = _escenario()
    d = _desafio(grupo, test)
    assert client.get(f"/api/desafios/{d['id']}/intentos/me").status_code == 404


def test_resultados_orden_y_sin_es_correcta_ni_respuestas_con_desafio_abierto():
    _, grupo, test = _escenario()
    d = _desafio(grupo, test)
    # ana: 1 punto 20s; beto: 2 puntos 30s; caro: 2 puntos 30s (empate total -> finalizado_at)
    _rendir(d, test, [True, False], segundos=20)
    _como("beto")
    _rendir(d, test, [True, True], segundos=30)
    _como("caro")
    _rendir(d, test, [True, True], segundos=30)
    with TestSession() as db:  # fuerza finalizado_at: caro antes que beto
        base = datetime(2026, 1, 1)
        db.query(Intento).filter(Intento.user_id == "caro").update({"finalizado_at": base})
        db.query(Intento).filter(Intento.user_id == "beto").update(
            {"finalizado_at": base + timedelta(minutes=1)}
        )
        db.commit()
    _como("ana")
    r = client.get(f"/api/desafios/{d['id']}/resultados")
    assert r.status_code == 200
    assert [x["user_id"] for x in r.json()] == ["caro", "beto", "ana"]
    assert r.json()[0]["user_nombre"] == "caro@x.com"  # sin nombre -> email
    assert "es_correcta" not in r.text
    assert "opcion_id" not in r.text
    assert "respuestas" not in r.text


def test_resultados_orden_por_segundos_en_empate_de_puntaje():
    _, grupo, test = _escenario()
    d = _desafio(grupo, test)
    _rendir(d, test, [True, True], segundos=50)
    _como("beto")
    _rendir(d, test, [True, True], segundos=40)
    r = client.get(f"/api/desafios/{d['id']}/resultados").json()
    assert [x["user_id"] for x in r] == ["beto", "ana"]


# --- test en uso / borrar grupo / helper ---


def test_test_con_desafio_no_se_edita_ni_borra_409():
    materia, grupo, test = _escenario()
    _desafio(grupo, test)
    body = {
        "materia_id": materia["id"],
        "titulo": "Nuevo",
        "preguntas": [
            {
                "enunciado": "x",
                "opciones": [
                    {"texto": "a", "es_correcta": True},
                    {"texto": "b", "es_correcta": False},
                ],
            }
        ],
    }
    assert client.put(f"/api/tests/{test['id']}", json=body).status_code == 409
    assert client.delete(f"/api/tests/{test['id']}").status_code == 409
    libre = _test(materia["id"], titulo="Libre")
    assert client.delete(f"/api/tests/{libre['id']}").status_code == 204


def test_borrar_grupo_borra_desafios_intentos_y_respuestas():
    _, grupo, test = _escenario()
    d = _desafio(grupo, test)
    _rendir(d, test, [True, True])
    _como("beto")
    _rendir(d, test, [True, False])
    _como("ana")
    assert client.delete(f"/api/grupos/{grupo['id']}").status_code == 204
    with TestSession() as db:
        assert db.query(Desafio).count() == 0
        assert db.query(Intento).count() == 0
        assert db.query(RespuestaIntento).count() == 0


def test_aware_utc_normaliza_naive_y_con_zona():
    naive = datetime(2026, 1, 1, 12, 0)
    assert aware_utc(naive) == datetime(2026, 1, 1, 12, 0, tzinfo=UTC)
    from datetime import timezone

    gmt3 = datetime(2026, 1, 1, 12, 0, tzinfo=timezone(timedelta(hours=3)))
    assert aware_utc(gmt3) == datetime(2026, 1, 1, 9, 0, tzinfo=UTC)
    assert aware_utc(gmt3).utcoffset() == timedelta(0)
