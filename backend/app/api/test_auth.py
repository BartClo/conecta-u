"""Login de prueba para e2e. main.py solo importa este modulo con AUTH_MODE=test."""

import uuid
from datetime import UTC, datetime, timedelta

import jwt
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import TEST_JWT_AUDIENCE, TEST_JWT_ISSUER, TokenPayload
from app.services.user_service import get_or_create_user

router = APIRouter(prefix="/test")

DURACION_TOKEN = timedelta(hours=12)


class TestLoginIn(BaseModel):
    __test__ = False

    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+$", max_length=255)
    name: str | None = Field(default=None, max_length=255)


class TestLoginOut(BaseModel):
    __test__ = False

    access_token: str
    token_type: str = "bearer"
    user_id: str


@router.post("/login", response_model=TestLoginOut)
def test_login(body: TestLoginIn, db: Session = Depends(get_db)) -> TestLoginOut:
    email = body.email.lower()
    # uuid5: el mismo email reutiliza el mismo usuario.
    user_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, email))
    metadata = {"full_name": body.name} if body.name else {}
    token = TokenPayload(sub=user_id, email=email, user_metadata=metadata)
    get_or_create_user(db, token)
    access_token = jwt.encode(
        {
            **token,
            "iss": TEST_JWT_ISSUER,
            "aud": TEST_JWT_AUDIENCE,
            "exp": datetime.now(UTC) + DURACION_TOKEN,
        },
        get_settings().test_auth_secret,
        algorithm="HS256",
    )
    return TestLoginOut(access_token=access_token, user_id=user_id)
