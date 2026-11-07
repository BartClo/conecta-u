import logging

import pytest
from fastapi.testclient import TestClient
from psycopg2.extensions import QuotedString
from sqlalchemy.exc import DataError, IntegrityError

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


def _error_real_de_psycopg2_con_nul() -> ValueError:
    with pytest.raises(ValueError) as exc:
        QuotedString("a\x00b").getquoted()
    return exc.value


def test_texto_con_nul_da_422():
    r = _cliente_que_lanza(_error_real_de_psycopg2_con_nul()).get("/boom")
    assert r.status_code == 422


def test_texto_largo_da_422_sin_filtrar_sql(caplog, monkeypatch):
    # fileConfig de alembic (otros tests) puede dejar el logger deshabilitado.
    monkeypatch.setattr(logging.getLogger("app.main"), "disabled", False)
    exc = DataError("INSERT secreto", {"p": "parametro"}, Exception("value too long"))
    with caplog.at_level("WARNING", logger="app.main"):
        r = _cliente_que_lanza(exc).get("/boom")
    assert r.status_code == 422
    assert "secreto" not in r.text
    assert "DataError" in caplog.text
    assert "secreto" not in caplog.text
    assert "parametro" not in caplog.text


@pytest.mark.parametrize(
    "exc",
    [IntegrityError("INSERT secreto", {}, Exception("x")), ValueError("secreto")],
    ids=["integridad", "otro-valueerror"],
)
def test_otros_errores_siguen_siendo_500(exc):
    r = _cliente_que_lanza(exc).get("/boom")
    assert r.status_code == 500
    assert "secreto" not in r.text
