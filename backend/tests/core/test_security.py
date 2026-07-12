import jwt
import pytest
from fastapi import HTTPException

import app.core.security as security_module
from app.core.security import _decode, _get_jwks_client, get_current_token

PRIVATE_KEY = """-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAwJqfrhAsWlNPCbrmYVWr8v8+xZ39QwZUVjb1EA6qGqFvXvZq
-----END RSA PRIVATE KEY-----"""


def _make_token(payload: dict, secret: str = "test-secret") -> str:
    return jwt.encode(payload, secret, algorithm="HS256")


@pytest.mark.asyncio
async def test_missing_authorization_header_raises_401():
    with pytest.raises(HTTPException) as exc:
        await get_current_token(authorization=None)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_malformed_token_raises_401(monkeypatch):
    def _raise_value_error(token):
        raise ValueError()

    monkeypatch.setattr("app.core.security._decode", _raise_value_error)
    with pytest.raises(HTTPException) as exc:
        await get_current_token(authorization="Bearer not-a-jwt")
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_expired_token_raises_401(monkeypatch):
    def _raise_expired(token):
        raise jwt.ExpiredSignatureError()

    monkeypatch.setattr("app.core.security._decode", _raise_expired)
    with pytest.raises(HTTPException) as exc:
        await get_current_token(authorization="Bearer expired")
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_valid_token_returns_payload(monkeypatch):
    payload = {"sub": "user-123", "email": "a@b.com", "user_metadata": {"full_name": "A B"}}
    monkeypatch.setattr("app.core.security._decode", lambda token: payload)
    result = await get_current_token(authorization="Bearer valid")
    assert result["sub"] == "user-123"
    assert result["email"] == "a@b.com"


def test_get_jwks_client_is_cached_across_calls(monkeypatch):
    monkeypatch.setattr(security_module, "_jwks_client", None)
    first = _get_jwks_client()
    second = _get_jwks_client()
    assert first is second


def test_decode_uses_jwks_client_signing_key(monkeypatch):
    class FakeSigningKey:
        key = "shared-secret"

    class FakeJwksClient:
        def get_signing_key_from_jwt(self, token):
            return FakeSigningKey()

    monkeypatch.setattr(security_module, "_get_jwks_client", lambda: FakeJwksClient())

    captured = {}

    def fake_jwt_decode(token, key, algorithms, audience):
        captured["key"] = key
        captured["algorithms"] = algorithms
        return {"sub": "u1", "email": "a@b.com"}

    monkeypatch.setattr(security_module.jwt, "decode", fake_jwt_decode)

    payload = _decode("some-token")

    assert captured["key"] == "shared-secret"
    assert captured["algorithms"] == ["RS256"]
    assert payload["sub"] == "u1"
