from datetime import date

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.services import curso_service, semestre_service

engine = create_engine("sqlite:///:memory:")
TestSession = sessionmaker(bind=engine)


def _fresh_db():
    Base.metadata.create_all(engine)
    db = TestSession()
    yield db
    db.close()
    Base.metadata.drop_all(engine)


def _semestre(db, user_id="u1"):
    return semestre_service.create_semestre(
        db,
        user_id=user_id,
        nombre="2026-1",
        fecha_inicio=date(2026, 3, 1),
        fecha_fin=date(2026, 7, 15),
    )


def test_create_and_list_cursos_scoped_by_user():
    db = next(_fresh_db())
    semestre = _semestre(db)
    curso_service.create_curso(
        db,
        user_id="u1",
        semestre_id=semestre.id,
        nombre="Cálculo II",
        codigo="MAT204",
        profesor="Ana Pérez",
        color="blue",
    )

    resultado = curso_service.list_cursos(db, user_id="u1")

    assert len(resultado) == 1
    assert resultado[0].nombre == "Cálculo II"


def test_list_cursos_filters_by_semestre():
    db = next(_fresh_db())
    semestre1 = _semestre(db)
    semestre2 = semestre_service.create_semestre(
        db,
        user_id="u1",
        nombre="2026-2",
        fecha_inicio=date(2026, 8, 1),
        fecha_fin=date(2026, 12, 15),
    )
    curso_service.create_curso(
        db,
        user_id="u1",
        semestre_id=semestre1.id,
        nombre="A",
        codigo="A1",
        profesor=None,
        color="blue",
    )
    curso_service.create_curso(
        db,
        user_id="u1",
        semestre_id=semestre2.id,
        nombre="B",
        codigo="B1",
        profesor=None,
        color="green",
    )

    resultado = curso_service.list_cursos(db, user_id="u1", semestre_id=semestre1.id)

    assert len(resultado) == 1
    assert resultado[0].nombre == "A"


def test_create_curso_raises_when_semestre_not_owned():
    db = next(_fresh_db())
    semestre = _semestre(db, user_id="otro")

    with pytest.raises(curso_service.SemestreNoEncontrado):
        curso_service.create_curso(
            db,
            user_id="u1",
            semestre_id=semestre.id,
            nombre="Cálculo II",
            codigo="MAT204",
            profesor=None,
            color="blue",
        )


def test_update_and_delete_curso():
    db = next(_fresh_db())
    semestre = _semestre(db)
    curso = curso_service.create_curso(
        db,
        user_id="u1",
        semestre_id=semestre.id,
        nombre="A",
        codigo="A1",
        profesor=None,
        color="blue",
    )

    actualizado = curso_service.update_curso(
        db, curso, nombre="A editado", codigo="A1", profesor="X", color="green"
    )
    assert actualizado.nombre == "A editado"

    curso_service.delete_curso(db, actualizado)
    assert curso_service.get_curso(db, user_id="u1", curso_id=curso.id) is None
