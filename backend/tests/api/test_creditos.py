from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, get_db
from app.core.economia import BONO_INICIAL
from app.core.security import get_current_token
from app.main import app
from app.models.credito import MovimientoCredito
from app.models.user import User
from app.services import creditos_service as svc
from tests.sqlite_savepoint import make_engine

engine = make_engine()
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


def _movs(uid, n):
    """n movimientos con created_at distintos y crecientes (ids al azar)."""
    with TestSession() as db:
        for i in range(n):
            db.add(
                MovimientoCredito(
                    user_id=uid,
                    delta=i + 1,
                    motivo="ajuste",
                    saldo_resultante=i + 1,
                    created_at=datetime(2026, 1, 1 + i, tzinfo=UTC),
                )
            )
        db.commit()


def test_saldo_crea_cuenta_con_bono_y_persiste():
    r = client.get("/api/creditos/saldo")
    assert r.status_code == 200
    assert r.json() == {"saldo": BONO_INICIAL}
    # el commit del router dejó la cuenta persistida (otra sesión la ve)
    with TestSession() as db:
        assert svc.verificar_saldo(db, "ana", BONO_INICIAL)
    assert client.get("/api/creditos/saldo").json() == {"saldo": BONO_INICIAL}


def test_saldo_refleja_ganar_y_gastar_commiteados():
    client.get("/api/creditos/saldo")
    with TestSession() as db:
        svc.gastar(db, "ana", 20, "genero_test_ia")
        db.commit()
    assert client.get("/api/creditos/saldo").json() == {"saldo": BONO_INICIAL - 20}


def test_movimientos_sin_cuenta_lista_vacia_y_no_crea_cuenta():
    r = client.get("/api/creditos/movimientos")
    assert r.json() == {"items": [], "limit": 20, "offset": 0, "total": 0}
    with TestSession() as db:
        from app.repositories import credito_repository as repo

        assert repo.get_cuenta(db, "ana") is None


def test_movimientos_orden_desc_y_paginacion():
    _movs("ana", 5)
    r = client.get("/api/creditos/movimientos", params={"limit": 2, "offset": 1})
    body = r.json()
    assert [m["delta"] for m in body["items"]] == [4, 3]
    assert (body["limit"], body["offset"], body["total"]) == (2, 1, 5)
    assert set(body["items"][0]) == {
        "id",
        "delta",
        "motivo",
        "ref_tipo",
        "ref_id",
        "saldo_resultante",
        "created_at",
    }


def test_movimientos_desempata_por_id_desc():
    ts = datetime(2026, 1, 1, tzinfo=UTC)
    with TestSession() as db:
        for mid in ("a", "c", "b"):
            db.add(
                MovimientoCredito(
                    id=mid,
                    user_id="ana",
                    delta=1,
                    motivo="ajuste",
                    saldo_resultante=1,
                    created_at=ts,
                )
            )
        db.commit()
    ids = [m["id"] for m in client.get("/api/creditos/movimientos").json()["items"]]
    assert ids == ["c", "b", "a"]


@pytest.mark.parametrize(
    "params",
    [{"limit": 0}, {"limit": 101}, {"limit": -1}, {"offset": -1}, {"limit": "x"}],
)
def test_movimientos_parametros_fuera_de_rango_422(params):
    assert client.get("/api/creditos/movimientos", params=params).status_code == 422


def test_movimientos_limite_maximo_100_ok():
    assert client.get("/api/creditos/movimientos", params={"limit": 100}).status_code == 200


def test_scoping_por_token():
    client.get("/api/creditos/saldo")
    with TestSession() as db:
        svc.gastar(db, "ana", 30, "genero_test_ia")
        db.commit()
    actual["sub"] = "beto"
    assert client.get("/api/creditos/saldo").json() == {"saldo": BONO_INICIAL}
    movs = client.get("/api/creditos/movimientos").json()
    assert movs["total"] == 1
    assert movs["items"][0]["motivo"] == "bono_inicial"


def test_movimientos_bono_y_gasto_de_una_transaccion_gasto_primero():
    with TestSession() as db:
        svc.gastar(db, "ana", 5, "genero_test_ia")
        db.commit()
    items = client.get("/api/creditos/movimientos").json()["items"]
    assert [m["motivo"] for m in items] == ["genero_test_ia", "bono_inicial"]
