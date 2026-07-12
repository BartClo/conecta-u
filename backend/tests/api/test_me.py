from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import get_current_token
from app.main import app

# StaticPool + check_same_thread=False: TestClient runs the app's sync
# dependencies in a worker thread, and sqlite's default per-thread pool
# would otherwise give that thread its own empty :memory: database.
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
    return {"sub": "u1", "email": "a@b.com", "user_metadata": {"full_name": "A B"}}


app.dependency_overrides[get_db] = _override_get_db
app.dependency_overrides[get_current_token] = _override_token

client = TestClient(app)


def test_me_returns_upserted_user():
    response = client.get("/api/me")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == "u1"
    assert body["email"] == "a@b.com"
    assert body["name"] == "A B"


def test_me_without_override_requires_auth():
    app.dependency_overrides.pop(get_current_token)
    response = client.get("/api/me")
    assert response.status_code == 401
    app.dependency_overrides[get_current_token] = _override_token
