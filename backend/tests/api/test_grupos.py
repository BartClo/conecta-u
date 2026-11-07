import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import get_current_token
from app.main import app
from app.models.membresia import Membresia
from app.models.user import User
from app.services import grupo_service

engine = create_engine(
    "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
TestSession = sessionmaker(bind=engine)
client = TestClient(app)
actual = {"sub": "owner"}


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
        for uid in ("owner", "ana", "beto"):
            db.add(User(id=uid, email=f"{uid}@x.com", name=uid.title()))
        db.commit()
    previous = dict(app.dependency_overrides)
    app.dependency_overrides[get_db] = _db
    app.dependency_overrides[get_current_token] = lambda: {
        "sub": actual["sub"],
        "email": "x@x.com",
        "user_metadata": {},
    }
    actual["sub"] = "owner"
    yield
    app.dependency_overrides.clear()
    app.dependency_overrides.update(previous)


def _como(uid):
    actual["sub"] = uid


def _grupo():
    materia = client.post("/api/materias", json={"nombre": "Física"}).json()
    r = client.post("/api/grupos", json={"nombre": "Los F", "materia_id": materia["id"]})
    assert r.status_code == 201
    return r.json()


def _unir(uid, grupo):
    _como(uid)
    r = client.post("/api/grupos/unirse", json={"codigo": grupo["codigo_invitacion"]})
    assert r.status_code == 201
    _como("owner")


def test_crear_genera_codigo_y_membresia_owner():
    g = _grupo()
    assert len(g["codigo_invitacion"]) == 6
    assert not set(g["codigo_invitacion"]) & set("O0I1L")
    assert g["materia_nombre"] == "Física"
    detalle = client.get(f"/api/grupos/{g['id']}").json()
    assert detalle["rol"] == "owner"
    assert detalle["miembros_count"] == 1


def test_crear_materia_inexistente_404():
    assert client.post("/api/grupos", json={"nombre": "X", "materia_id": "no"}).status_code == 404


def test_nombre_vacio_422():
    assert client.post("/api/grupos", json={"nombre": " ", "materia_id": "m"}).status_code == 422


def test_lista_solo_propios():
    _grupo()
    assert len(client.get("/api/grupos").json()) == 1
    _como("ana")
    assert client.get("/api/grupos").json() == []


def test_no_miembro_recibe_404_en_todo():
    g = _grupo()
    _como("ana")
    base = f"/api/grupos/{g['id']}"
    assert client.get(base).status_code == 404
    assert client.get(f"{base}/miembros").status_code == 404
    assert client.put(base, json={"nombre": "Z"}).status_code == 404
    assert client.delete(base).status_code == 404
    assert client.post(f"{base}/codigo").status_code == 404
    assert client.delete(f"{base}/miembros/owner").status_code == 404


def test_member_recibe_403_en_acciones_de_owner():
    g = _grupo()
    _unir("ana", g)
    _unir("beto", g)
    _como("ana")
    base = f"/api/grupos/{g['id']}"
    assert client.put(base, json={"nombre": "Z"}).status_code == 403
    assert client.delete(base).status_code == 403
    assert client.post(f"{base}/codigo").status_code == 403
    assert client.delete(f"{base}/miembros/beto").status_code == 403


def test_unirse_invalido_404_y_repetido_409():
    g = _grupo()
    assert client.post("/api/grupos/unirse", json={"codigo": "NOPE22"}).status_code == 404
    r = client.post("/api/grupos/unirse", json={"codigo": g["codigo_invitacion"]})
    assert r.status_code == 409


def test_unirse_acepta_minusculas():
    g = _grupo()
    _como("ana")
    r = client.post("/api/grupos/unirse", json={"codigo": g["codigo_invitacion"].lower()})
    assert r.status_code == 201
    assert r.json()["id"] == g["id"]


def test_editar_y_regenerar():
    g = _grupo()
    base = f"/api/grupos/{g['id']}"
    assert client.put(base, json={"nombre": "Nuevo"}).json()["nombre"] == "Nuevo"
    nuevo = client.post(f"{base}/codigo").json()["codigo_invitacion"]
    assert nuevo != g["codigo_invitacion"]
    viejo = {"codigo": g["codigo_invitacion"]}
    assert client.post("/api/grupos/unirse", json=viejo).status_code == 404


def test_generar_codigo_reintenta_si_colisiona(monkeypatch):
    g = _grupo()
    secuencia = iter([g["codigo_invitacion"], "ZZZZZ2"])
    monkeypatch.setattr(grupo_service, "_codigo_aleatorio", lambda: next(secuencia))
    assert client.post(f"/api/grupos/{g['id']}/codigo").json()["codigo_invitacion"] == "ZZZZZ2"


def test_miembros_incluye_datos_de_usuario():
    g = _grupo()
    _unir("ana", g)
    miembros = client.get(f"/api/grupos/{g['id']}/miembros").json()
    assert {(m["user_id"], m["rol"], m["email"]) for m in miembros} == {
        ("owner", "owner", "owner@x.com"),
        ("ana", "member", "ana@x.com"),
    }


def test_expulsar_salir_y_owner_no_puede_salir():
    g = _grupo()
    _unir("ana", g)
    _unir("beto", g)
    base = f"/api/grupos/{g['id']}/miembros"
    assert client.delete(f"{base}/ana").status_code == 204
    assert client.delete(f"{base}/ana").status_code == 404
    assert client.delete(f"{base}/owner").status_code == 409
    _como("beto")
    assert client.delete(f"{base}/beto").status_code == 204
    assert client.get(f"/api/grupos/{g['id']}").status_code == 404


def test_borrar_grupo_borra_membresias():
    g = _grupo()
    _unir("ana", g)
    assert client.delete(f"/api/grupos/{g['id']}").status_code == 204
    with TestSession() as db:
        assert db.query(Membresia).count() == 0


def test_unirse_carrera_integrityerror_409(monkeypatch):
    g = _grupo()
    _como("ana")
    with TestSession() as db:
        db.add(Membresia(grupo_id=g["id"], user_id="ana", rol="member"))
        db.commit()
    real = grupo_service.get_membresia
    llamadas = {"n": 0}

    def primera_none(db, grupo_id, user_id):
        llamadas["n"] += 1
        return None if llamadas["n"] == 1 else real(db, grupo_id, user_id)

    monkeypatch.setattr(grupo_service, "get_membresia", primera_none)
    r = client.post("/api/grupos/unirse", json={"codigo": g["codigo_invitacion"]})
    assert r.status_code == 409
