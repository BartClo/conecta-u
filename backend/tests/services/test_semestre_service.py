from datetime import date

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.curso import Curso
from app.models.user import User  # noqa: F401 - registers users table for FK resolution
from app.services import semestre_service

engine = create_engine("sqlite:///:memory:")
TestSession = sessionmaker(bind=engine)


def _fresh_db():
    Base.metadata.create_all(engine)
    db = TestSession()
    yield db
    db.close()
    Base.metadata.drop_all(engine)


def test_create_and_list_semestres_scoped_by_user():
    db = next(_fresh_db())
    semestre_service.create_semestre(
        db,
        user_id="u1",
        nombre="2026-1",
        fecha_inicio=date(2026, 3, 1),
        fecha_fin=date(2026, 7, 15),
    )
    semestre_service.create_semestre(
        db,
        user_id="u2",
        nombre="2026-1",
        fecha_inicio=date(2026, 3, 1),
        fecha_fin=date(2026, 7, 15),
    )

    resultado = semestre_service.list_semestres(db, user_id="u1")

    assert len(resultado) == 1
    assert resultado[0].user_id == "u1"


def test_get_semestre_returns_none_for_other_user():
    db = next(_fresh_db())
    semestre = semestre_service.create_semestre(
        db,
        user_id="u1",
        nombre="2026-1",
        fecha_inicio=date(2026, 3, 1),
        fecha_fin=date(2026, 7, 15),
    )

    resultado = semestre_service.get_semestre(db, user_id="u2", semestre_id=semestre.id)

    assert resultado is None


def test_update_semestre_changes_fields():
    db = next(_fresh_db())
    semestre = semestre_service.create_semestre(
        db,
        user_id="u1",
        nombre="2026-1",
        fecha_inicio=date(2026, 3, 1),
        fecha_fin=date(2026, 7, 15),
    )

    actualizado = semestre_service.update_semestre(
        db,
        semestre,
        nombre="2026-1 (editado)",
        fecha_inicio=date(2026, 3, 5),
        fecha_fin=date(2026, 7, 20),
    )

    assert actualizado.nombre == "2026-1 (editado)"


def test_delete_semestre_without_cursos_succeeds():
    db = next(_fresh_db())
    semestre = semestre_service.create_semestre(
        db,
        user_id="u1",
        nombre="2026-1",
        fecha_inicio=date(2026, 3, 1),
        fecha_fin=date(2026, 7, 15),
    )

    semestre_service.delete_semestre(db, semestre)

    assert semestre_service.get_semestre(db, user_id="u1", semestre_id=semestre.id) is None


def test_delete_semestre_with_cursos_raises():
    db = next(_fresh_db())
    semestre = semestre_service.create_semestre(
        db,
        user_id="u1",
        nombre="2026-1",
        fecha_inicio=date(2026, 3, 1),
        fecha_fin=date(2026, 7, 15),
    )
    db.add(
        Curso(
            user_id="u1",
            semestre_id=semestre.id,
            nombre="Cálculo II",
            codigo="MAT204",
            color="blue",
        )
    )
    db.commit()

    with pytest.raises(semestre_service.SemestreEnUso):
        semestre_service.delete_semestre(db, semestre)
