import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import get_current_token
from app.main import app

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSession = sessionmaker(bind=engine)
Base.metadata.create_all(engine)


def _override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


def _override_token():
    return {"sub": "u1", "email": "a@b.com", "user_metadata": {}}


client = TestClient(app)


@pytest.fixture(autouse=True)
def _evento_overrides():
    previous_db = app.dependency_overrides.get(get_db)
    previous_token = app.dependency_overrides.get(get_current_token)
    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_token] = _override_token
    yield
    if previous_db is not None:
        app.dependency_overrides[get_db] = previous_db
    else:
        app.dependency_overrides.pop(get_db, None)
    if previous_token is not None:
        app.dependency_overrides[get_current_token] = previous_token
    else:
        app.dependency_overrides.pop(get_current_token, None)


def _payload(**overrides):
    base = {
        "titulo": "Examen",
        "descripcion": None,
        "tipo": "examen",
        "fecha_inicio": "2026-04-10T14:00:00",
        "fecha_fin": None,
        "curso_id": None,
        "recurrencia_dia_semana": None,
        "recurrencia_hasta": None,
    }
    base.update(overrides)
    return base


def test_crear_y_listar_evento():
    respuesta = client.post("/api/eventos", json=_payload())
    assert respuesta.status_code == 201
    evento_id = respuesta.json()["id"]

    listado = client.get("/api/eventos?desde=2026-04-01&hasta=2026-04-30")
    assert listado.status_code == 200
    assert [e["id"] for e in listado.json()] == [evento_id]


def test_listar_evento_fuera_de_rango_no_aparece():
    client.post("/api/eventos", json=_payload())

    listado = client.get("/api/eventos?desde=2026-05-01&hasta=2026-05-31")
    assert listado.status_code == 200
    assert listado.json() == []


def test_crear_evento_con_curso_inexistente_retorna_404():
    respuesta = client.post("/api/eventos", json=_payload(curso_id="no-existe"))
    assert respuesta.status_code == 404


def test_crear_evento_con_recurrencia_invalida_retorna_422():
    respuesta = client.post("/api/eventos", json=_payload(recurrencia_dia_semana=2))
    assert respuesta.status_code == 422


def test_crear_evento_con_tipo_invalido_retorna_422():
    respuesta = client.post("/api/eventos", json=_payload(tipo="no-valido"))
    assert respuesta.status_code == 422


def test_obtener_evento_inexistente_retorna_404():
    assert client.get("/api/eventos/no-existe").status_code == 404


def test_obtener_evento_ok():
    creado = client.post("/api/eventos", json=_payload(titulo="Detalle")).json()

    detalle = client.get(f"/api/eventos/{creado['id']}")
    assert detalle.status_code == 200
    assert detalle.json()["titulo"] == "Detalle"


def test_editar_evento_con_recurrencia_invalida_retorna_422():
    creado = client.post("/api/eventos", json=_payload()).json()

    editado = client.put(f"/api/eventos/{creado['id']}", json=_payload(recurrencia_dia_semana=3))
    assert editado.status_code == 422


def test_editar_y_borrar_evento():
    creado = client.post("/api/eventos", json=_payload(titulo="Original")).json()

    editado = client.put(f"/api/eventos/{creado['id']}", json=_payload(titulo="Editado"))
    assert editado.status_code == 200
    assert editado.json()["titulo"] == "Editado"

    borrado = client.delete(f"/api/eventos/{creado['id']}")
    assert borrado.status_code == 204

    assert client.get(f"/api/eventos/{creado['id']}").status_code == 404


def test_editar_evento_con_curso_inexistente_retorna_404():
    creado = client.post("/api/eventos", json=_payload()).json()

    editado = client.put(f"/api/eventos/{creado['id']}", json=_payload(curso_id="no-existe"))
    assert editado.status_code == 404


def test_editar_evento_inexistente_retorna_404():
    respuesta = client.put("/api/eventos/no-existe", json=_payload())
    assert respuesta.status_code == 404


def test_borrar_evento_inexistente_retorna_404():
    assert client.delete("/api/eventos/no-existe").status_code == 404
