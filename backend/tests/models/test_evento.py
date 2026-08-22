from datetime import date, datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.curso import Curso
from app.models.evento import Evento
from app.models.semestre import Semestre
from app.models.user import User

engine = create_engine("sqlite:///:memory:")
TestSession = sessionmaker(bind=engine)


def _fresh_db():
    Base.metadata.create_all(engine)
    db = TestSession()
    yield db
    db.close()
    Base.metadata.drop_all(engine)


def test_evento_persists_with_curso_sin_recurrencia():
    db = next(_fresh_db())
    user = User(email="a@a.com", name="A", avatar_url=None)
    db.add(user)
    db.commit()
    semestre = Semestre(
        user_id=user.id, nombre="2026-1", fecha_inicio=date(2026, 3, 1), fecha_fin=date(2026, 7, 1)
    )
    db.add(semestre)
    db.commit()
    curso = Curso(
        user_id=user.id,
        semestre_id=semestre.id,
        nombre="Cálculo",
        codigo="MAT100",
        profesor=None,
        color="red",
    )
    db.add(curso)
    db.commit()

    evento = Evento(
        user_id=user.id,
        curso_id=curso.id,
        titulo="Examen parcial",
        descripcion=None,
        tipo="examen",
        fecha_inicio=datetime(2026, 4, 10, 14, 0),
        fecha_fin=datetime(2026, 4, 10, 16, 0),
        recurrencia_dia_semana=None,
        recurrencia_hasta=None,
    )
    db.add(evento)
    db.commit()
    db.refresh(evento)

    assert evento.id is not None
    assert evento.curso_id == curso.id
    assert evento.tipo == "examen"


def test_evento_persists_sin_curso_con_recurrencia_semanal():
    db = next(_fresh_db())
    user = User(email="b@b.com", name="B", avatar_url=None)
    db.add(user)
    db.commit()

    evento = Evento(
        user_id=user.id,
        curso_id=None,
        titulo="Gimnasio",
        descripcion="Rutina de piernas",
        tipo="personal",
        fecha_inicio=datetime(2026, 3, 2, 7, 0),
        fecha_fin=None,
        recurrencia_dia_semana=0,
        recurrencia_hasta=date(2026, 6, 1),
    )
    db.add(evento)
    db.commit()
    db.refresh(evento)

    assert evento.curso_id is None
    assert evento.recurrencia_dia_semana == 0
    assert evento.recurrencia_hasta == date(2026, 6, 1)
