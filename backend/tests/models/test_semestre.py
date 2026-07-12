from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.semestre import Semestre
from app.models.user import User  # noqa: F401 - imported to register model in Base

engine = create_engine("sqlite:///:memory:")
TestSession = sessionmaker(bind=engine)


def test_creates_semestre_with_required_fields():
    Base.metadata.create_all(engine)
    db = TestSession()

    semestre = Semestre(
        user_id="u1",
        nombre="2026-1",
        fecha_inicio=date(2026, 3, 1),
        fecha_fin=date(2026, 7, 15),
    )
    db.add(semestre)
    db.commit()
    db.refresh(semestre)

    assert semestre.id is not None
    assert semestre.nombre == "2026-1"

    db.close()
    Base.metadata.drop_all(engine)
