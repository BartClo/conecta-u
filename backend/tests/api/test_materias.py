import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import get_current_token
from app.main import app
from app.models.user import User
from app.repositories import materia_repository
from app.services.materia_service import normalizar

engine = create_engine(
    "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
TestSession = sessionmaker(bind=engine)
client = TestClient(app)


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
        db.add(User(id="u1", email="a@b.com"))
        db.commit()
    previous = dict(app.dependency_overrides)
    app.dependency_overrides[get_db] = _db
    app.dependency_overrides[get_current_token] = lambda: {
        "sub": "u1",
        "email": "a@b.com",
        "user_metadata": {},
    }
    yield
    app.dependency_overrides.clear()
    app.dependency_overrides.update(previous)


def test_normalizar():
    assert normalizar("  Cálculo   II ") == "cálculo ii"


def test_crear_y_deduplicar():
    primera = client.post("/api/materias", json={"nombre": "Cálculo  II"})
    assert primera.status_code == 201
    segunda = client.post("/api/materias", json={"nombre": " cálculo ii "})
    assert segunda.status_code == 200
    assert segunda.json()["id"] == primera.json()["id"]


def test_nombre_vacio_422():
    assert client.post("/api/materias", json={"nombre": "   "}).status_code == 422


def test_busqueda_contiene_y_escapa_comodines():
    client.post("/api/materias", json={"nombre": "Física"})
    client.post("/api/materias", json={"nombre": "Química"})
    nombres = [m["nombre"] for m in client.get("/api/materias", params={"q": "FÍS"}).json()]
    assert nombres == ["Física"]
    assert client.get("/api/materias", params={"q": "%"}).json() == []


def test_sin_q_limite_20():
    for i in range(25):
        client.post("/api/materias", json={"nombre": f"M{i}"})
    assert len(client.get("/api/materias").json()) == 20


def test_carrera_de_creacion_devuelve_existente(monkeypatch):
    client.post("/api/materias", json={"nombre": "Redes"})
    real = materia_repository.get_by_normalizado
    llamadas = {"n": 0}

    def primera_none(db, nombre_normalizado):
        llamadas["n"] += 1
        return None if llamadas["n"] == 1 else real(db, nombre_normalizado)

    monkeypatch.setattr(materia_repository, "get_by_normalizado", primera_none)
    respuesta = client.post("/api/materias", json={"nombre": "redes"})
    assert respuesta.status_code == 200
