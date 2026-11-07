import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import Base
from app.core.roles_grupo import ROL_OWNER
from app.models.grupo import Grupo
from app.models.materia import Materia
from app.models.membresia import Membresia
from app.models.user import User


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        session.add(User(id="u1", email="a@b.com"))
        session.add(
            Materia(id="m1", nombre="Cálculo", nombre_normalizado="cálculo", created_by="u1")
        )
        session.add(
            Grupo(id="g1", nombre="G", materia_id="m1", owner_id="u1", codigo_invitacion="ABC234")
        )
        session.commit()
        yield session


def test_materia_normalizado_unico(db):
    db.add(Materia(nombre="CALCULO", nombre_normalizado="cálculo", created_by="u1"))
    with pytest.raises(IntegrityError):
        db.commit()


def test_codigo_unico(db):
    db.add(Grupo(nombre="H", materia_id="m1", owner_id="u1", codigo_invitacion="ABC234"))
    with pytest.raises(IntegrityError):
        db.commit()


def test_membresia_unica(db):
    db.add(Membresia(grupo_id="g1", user_id="u1", rol=ROL_OWNER))
    db.commit()
    db.add(Membresia(grupo_id="g1", user_id="u1", rol=ROL_OWNER))
    with pytest.raises(IntegrityError):
        db.commit()
