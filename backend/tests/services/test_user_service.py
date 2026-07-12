from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.user import User
from app.services.user_service import get_or_create_user

engine = create_engine("sqlite:///:memory:")
TestSession = sessionmaker(bind=engine)


def _fresh_db():
    Base.metadata.create_all(engine)
    db = TestSession()
    yield db
    db.close()
    Base.metadata.drop_all(engine)


def test_creates_user_on_first_login():
    db = next(_fresh_db())
    token = {
        "sub": "u1",
        "email": "a@b.com",
        "user_metadata": {"full_name": "A B", "avatar_url": "http://x/a.png"},
    }

    user = get_or_create_user(db, token)

    assert user.id == "u1"
    assert user.email == "a@b.com"
    assert user.name == "A B"
    assert user.avatar_url == "http://x/a.png"
    assert db.query(User).count() == 1


def test_updates_existing_user_on_subsequent_login():
    db = next(_fresh_db())
    token = {"sub": "u1", "email": "a@b.com", "user_metadata": {"full_name": "Old Name"}}
    get_or_create_user(db, token)

    token["user_metadata"]["full_name"] = "New Name"
    user = get_or_create_user(db, token)

    assert user.name == "New Name"
    assert db.query(User).count() == 1
