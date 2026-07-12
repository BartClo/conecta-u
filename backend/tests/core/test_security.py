import time

import jwt
import pytest
from fastapi import HTTPException

from app.core.security import get_current_token

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
    monkeypatch.setattr("app.core.security._decode", lambda token: (_ for _ in ()).throw(ValueError()))
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
