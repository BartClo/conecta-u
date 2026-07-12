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
def _curso_overrides():
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


def _crear_semestre():
    response = client.post(
        "/api/semestres",
        json={"nombre": "2026-1", "fecha_inicio": "2026-03-01", "fecha_fin": "2026-07-15"},
    )
    return response.json()["id"]


def test_create_and_list_cursos():
    semestre_id = _crear_semestre()

    response = client.post(
        "/api/cursos",
        json={
            "semestre_id": semestre_id,
            "nombre": "Cálculo II",
            "codigo": "MAT204",
            "profesor": "Ana Pérez",
            "color": "blue",
        },
    )
    assert response.status_code == 201

    listado = client.get(f"/api/cursos?semestre_id={semestre_id}")
    assert listado.status_code == 200
    assert len(listado.json()) == 1


def test_create_curso_with_invalid_color_returns_422():
    semestre_id = _crear_semestre()

    response = client.post(
        "/api/cursos",
        json={
            "semestre_id": semestre_id,
            "nombre": "Cálculo II",
            "codigo": "MAT204",
            "profesor": None,
            "color": "no-es-un-color",
        },
    )

    assert response.status_code == 422


def test_create_curso_with_unowned_semestre_returns_404():
    response = client.post(
        "/api/cursos",
        json={
            "semestre_id": "no-existe",
            "nombre": "Cálculo II",
            "codigo": "MAT204",
            "profesor": None,
            "color": "blue",
        },
    )

    assert response.status_code == 404


def test_get_update_delete_curso():
    semestre_id = _crear_semestre()
    curso_id = client.post(
        "/api/cursos",
        json={
            "semestre_id": semestre_id,
            "nombre": "Cálculo II",
            "codigo": "MAT204",
            "profesor": None,
            "color": "blue",
        },
    ).json()["id"]

    detalle = client.get(f"/api/cursos/{curso_id}")
    assert detalle.status_code == 200

    editado = client.put(
        f"/api/cursos/{curso_id}",
        json={
            "semestre_id": semestre_id,
            "nombre": "Cálculo II (editado)",
            "codigo": "MAT204",
            "profesor": "Ana Pérez",
            "color": "green",
        },
    )
    assert editado.status_code == 200
    assert editado.json()["color"] == "green"

    borrado = client.delete(f"/api/cursos/{curso_id}")
    assert borrado.status_code == 204
    assert client.get(f"/api/cursos/{curso_id}").status_code == 404
