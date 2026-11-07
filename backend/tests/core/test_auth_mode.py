"""Guardas no negociables del modo de auth de prueba (spec fase E)."""

import os
import subprocess
import sys
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.core.security as security
from app.core.config import Settings
from app.core.database import Base, get_db
from app.core.security import TEST_JWT_AUDIENCE, TEST_JWT_ISSUER
from app.main import create_app

SECRET = "s" * 40
SUPABASE = {
    "supabase_url": "https://example.supabase.co",
    "supabase_jwks_url": "https://example.supabase.co/jwks",
}


def settings(**kw) -> Settings:
    return Settings(_env_file=None, database_url="sqlite://", **kw)


def modo_test(**kw) -> Settings:
    return settings(auth_mode="test", app_env="test", test_auth_secret=SECRET, **kw)


@pytest.fixture(autouse=True)
def _sin_env_de_supabase(monkeypatch):
    # conftest define estas variables; aqui cada test declara lo que usa.
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_JWKS_URL", raising=False)


def cliente(monkeypatch, cfg: Settings) -> TestClient:
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)

    def _db():
        db = session()
        try:
            yield db
        finally:
            db.close()

    monkeypatch.setattr(security, "get_settings", lambda: cfg)
    app = create_app(cfg)
    if cfg.auth_mode == "test":
        monkeypatch.setattr("app.api.test_auth.get_settings", lambda: cfg)
    app.dependency_overrides[get_db] = _db
    return TestClient(app)


def hs256(secret: str = SECRET, **claims) -> str:
    payload = {
        "sub": "u1",
        "email": "a@b.co",
        "iss": TEST_JWT_ISSUER,
        "aud": TEST_JWT_AUDIENCE,
        "exp": datetime.now(UTC) + timedelta(minutes=5),
        **claims,
    }
    return jwt.encode({k: v for k, v in payload.items() if v is not None}, secret, "HS256")


def bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.parametrize("env", ["production", "staging", "", "TEST"])
def test_modo_test_aborta_fuera_de_test_o_local(env):
    with pytest.raises(ValidationError):
        settings(auth_mode="test", app_env=env, test_auth_secret=SECRET)


def test_modo_test_aborta_si_app_env_no_esta_definido(monkeypatch):
    monkeypatch.delenv("APP_ENV", raising=False)
    with pytest.raises(ValidationError):
        settings(auth_mode="test", test_auth_secret=SECRET)


def test_arranque_real_del_proceso_aborta_en_produccion():
    env = {
        **os.environ,
        "AUTH_MODE": "test",
        "APP_ENV": "production",
        "TEST_AUTH_SECRET": SECRET,
        "DATABASE_URL": "sqlite:///:memory:",
    }
    r = subprocess.run(
        [sys.executable, "-c", "import app.main"], env=env, capture_output=True, text=True
    )
    assert r.returncode != 0
    assert "AUTH_MODE=test" in r.stderr
    assert SECRET not in r.stderr  # el secreto no llega al log


@pytest.mark.parametrize("secret", [None, "", "corto"])
def test_modo_test_exige_secreto_largo(secret, monkeypatch):
    monkeypatch.delenv("TEST_AUTH_SECRET", raising=False)
    with pytest.raises(ValidationError):
        settings(auth_mode="test", app_env="test", test_auth_secret=secret)


def test_auth_mode_por_defecto_es_supabase_y_desconocido_falla(monkeypatch):
    monkeypatch.delenv("AUTH_MODE", raising=False)
    assert settings(**SUPABASE).auth_mode == "supabase"
    with pytest.raises(ValidationError):
        settings(auth_mode="none", **SUPABASE)


def test_supabase_exige_sus_variables_pero_modo_test_no():
    with pytest.raises(ValidationError):
        settings()
    assert modo_test().supabase_url is None


def test_cors_rechaza_comodin_y_parte_por_comas():
    with pytest.raises(ValidationError):
        settings(cors_origins="*", **SUPABASE)
    cfg = settings(cors_origins="http://a:1, http://b:2", **SUPABASE)
    assert cfg.cors_origins_list == ["http://a:1", "http://b:2"]
    assert settings(**SUPABASE).cors_origins_list == ["http://localhost:3000"]


def test_supabase_no_tiene_ruta_de_login_y_rechaza_hs256(monkeypatch):
    client_cfg = settings(**SUPABASE)
    client = cliente(monkeypatch, client_cfg)
    assert client.post("/api/test/login", json={"email": "a@b.co"}).status_code == 404
    assert not [r for r in client.app.routes if "/api/test" in getattr(r, "path", "")]

    # Confusion de algoritmo: el token cumple aud, iss, exp y claims, y el JWKS devuelve el
    # secreto como clave; solo el algoritmo (HS256) puede causar el rechazo.
    class Jwks:
        def get_signing_key_from_jwt(self, token):
            return type("K", (), {"key": SECRET})()

    monkeypatch.setattr(security, "_get_jwks_client", lambda: Jwks())
    token = hs256(aud="authenticated", iss=client_cfg.supabase_issuer)
    assert client.get("/api/me", headers=bearer(token)).status_code == 401


def test_supabase_hs256_con_jwks_inalcanzable_da_401(monkeypatch):
    monkeypatch.setattr(security, "_jwks_client", None)
    cfg = settings(
        supabase_url="http://supabase.invalid", supabase_jwks_url="http://supabase.invalid/jwks"
    )
    client = cliente(monkeypatch, cfg)
    assert client.get("/api/me", headers=bearer(hs256())).status_code == 401


def test_modo_test_login_crea_y_reutiliza_usuario_sin_jwks(monkeypatch):
    def _prohibido():
        raise AssertionError("el modo test no debe consultar el JWKS")

    monkeypatch.setattr(security, "_get_jwks_client", _prohibido)
    client = cliente(monkeypatch, modo_test())

    uno = client.post("/api/test/login", json={"email": "Ana@x.co", "name": "Ana"}).json()
    dos = client.post("/api/test/login", json={"email": "ana@x.co", "name": "Ana"}).json()
    assert uno["user_id"] == dos["user_id"]
    assert SECRET not in str(uno)

    me = client.get("/api/me", headers=bearer(uno["access_token"]))
    assert me.status_code == 200
    assert me.json()["email"] == "ana@x.co"
    assert me.json()["name"] == "Ana"
    assert client.post("/api/test/login", json={"email": "sin-arroba"}).status_code == 422


@pytest.mark.parametrize(
    "token",
    [
        hs256(secret="x" * 40),
        hs256(aud="otra"),
        hs256(iss="otro"),
        hs256(exp=datetime.now(UTC) - timedelta(minutes=1)),
        hs256(exp=None),
        hs256(email=None),
        jwt.encode({"sub": "u1", "email": "a@b.co"}, None, algorithm="none"),
        jwt.encode(
            {
                "sub": "u1",
                "email": "a@b.co",
                "iss": TEST_JWT_ISSUER,
                "aud": TEST_JWT_AUDIENCE,
                "exp": datetime.now(UTC) + timedelta(minutes=5),
            },
            SECRET * 2,
            algorithm="HS512",
        ),
    ],
    ids=["secreto", "aud", "iss", "expirado", "sin-exp", "sin-email", "alg-none", "hs512"],
)
def test_modo_test_rechaza_tokens_invalidos(monkeypatch, token):
    client = cliente(monkeypatch, modo_test())
    assert client.get("/api/me", headers=bearer(token)).status_code == 401
