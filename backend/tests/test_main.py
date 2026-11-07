import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import DataError, IntegrityError, StatementError

from app.main import app, create_app


def test_health_returns_ok():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def _cliente_que_lanza(exc: Exception) -> TestClient:
    nueva = create_app()

    @nueva.get("/boom")
    def boom():
        raise exc

    return TestClient(nueva, raise_server_exceptions=False)


@pytest.mark.parametrize(
    "exc",
    [
        DataError("INSERT secreto", {}, Exception("value too long")),
        StatementError("nul", "INSERT secreto", {}, ValueError("cannot contain NUL")),
    ],
    ids=["texto-largo", "nul"],
)
def test_datos_rechazados_por_la_db_dan_422_sin_filtrar_sql(exc):
    r = _cliente_que_lanza(exc).get("/boom")
    assert r.status_code == 422
    assert "secreto" not in r.text


def test_otros_errores_de_sql_siguen_siendo_500():
    r = _cliente_que_lanza(IntegrityError("INSERT secreto", {}, Exception("x"))).get("/boom")
    assert r.status_code == 500
    assert "secreto" not in r.text
