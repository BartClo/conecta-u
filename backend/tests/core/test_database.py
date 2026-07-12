import pytest
from sqlalchemy import text

from app.core.database import get_db


def test_get_db_yields_working_session_and_closes_it():
    gen = get_db()
    db = next(gen)
    closed = {"called": False}
    original_close = db.close
    db.close = lambda: (closed.__setitem__("called", True), original_close())

    assert db.execute(text("SELECT 1")).scalar() == 1

    with pytest.raises(StopIteration):
        next(gen)

    assert closed["called"] is True
