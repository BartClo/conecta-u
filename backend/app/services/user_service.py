from sqlalchemy.orm import Session

from app.core.security import TokenPayload
from app.models.user import User
from app.repositories.user_repository import upsert_user


def get_or_create_user(db: Session, token: TokenPayload) -> User:
    metadata = token.get("user_metadata", {})
    return upsert_user(
        db,
        id=token["sub"],
        email=token["email"],
        name=metadata.get("full_name"),
        avatar_url=metadata.get("avatar_url"),
    )
