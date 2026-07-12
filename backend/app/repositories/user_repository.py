from sqlalchemy.orm import Session

from app.models.user import User


def upsert_user(
    db: Session, *, id: str, email: str, name: str | None, avatar_url: str | None
) -> User:
    user = db.get(User, id)
    if user is None:
        user = User(id=id, email=email, name=name, avatar_url=avatar_url)
        db.add(user)
    else:
        user.email = email
        user.name = name
        user.avatar_url = avatar_url
    db.commit()
    db.refresh(user)
    return user
