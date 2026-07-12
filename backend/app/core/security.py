from typing import TypedDict

import jwt
from fastapi import Header, HTTPException

from app.core.config import get_settings


class TokenPayload(TypedDict):
    sub: str
    email: str
    user_metadata: dict


_jwks_client: jwt.PyJWKClient | None = None


def _get_jwks_client() -> jwt.PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = jwt.PyJWKClient(get_settings().supabase_jwks_url)
    return _jwks_client


def _decode(token: str) -> dict:
    signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        audience=get_settings().supabase_jwt_audience,
    )


async def get_current_token(authorization: str | None = Header(default=None)) -> TokenPayload:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.removeprefix("Bearer ")
    try:
        payload = _decode(token)
    except (jwt.PyJWTError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc

    return TokenPayload(
        sub=payload["sub"],
        email=payload["email"],
        user_metadata=payload.get("user_metadata", {}),
    )
