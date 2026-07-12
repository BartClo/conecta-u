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

PAYLOAD = {"nombre": "2026-1", "fecha_inicio": "2026-03-01", "fecha_fin": "2026-07-15"}


@pytest.fixture(autouse=True)
def _semestre_overrides():
    # app.dependency_overrides is shared global state on the app singleton.
    # Scope our overrides to this file's tests only, restoring whatever was
    # there before so we don't leak into other test modules (e.g. test_me.py)
    # that override the same dependencies with different fake tokens.
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


def test_create_and_list_semestres():
    response = client.post("/api/semestres", json=PAYLOAD)
    assert response.status_code == 201
    created = response.json()
    assert created["nombre"] == "2026-1"

    listado = client.get("/api/semestres")
    assert listado.status_code == 200
    assert len(listado.json()) == 1


def test_get_update_delete_semestre():
    created = client.post("/api/semestres", json=PAYLOAD).json()
    semestre_id = created["id"]

    detalle = client.get(f"/api/semestres/{semestre_id}")
    assert detalle.status_code == 200

    editado = client.put(
        f"/api/semestres/{semestre_id}",
        json={"nombre": "2026-1 editado", "fecha_inicio": "2026-03-01", "fecha_fin": "2026-07-15"},
    )
    assert editado.status_code == 200
    assert editado.json()["nombre"] == "2026-1 editado"

    borrado = client.delete(f"/api/semestres/{semestre_id}")
    assert borrado.status_code == 204

    assert client.get(f"/api/semestres/{semestre_id}").status_code == 404


def test_get_semestre_not_found_returns_404():
    response = client.get("/api/semestres/no-existe")
    assert response.status_code == 404


def test_delete_semestre_with_cursos_returns_409():
    created = client.post("/api/semestres", json=PAYLOAD).json()
    semestre_id = created["id"]
    client.post(
        "/api/cursos",
        json={
            "semestre_id": semestre_id,
            "nombre": "Cálculo II",
            "codigo": "MAT204",
            "profesor": None,
            "color": "blue",
        },
    )

    response = client.delete(f"/api/semestres/{semestre_id}")

    assert response.status_code == 409
