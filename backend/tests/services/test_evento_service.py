from datetime import date, datetime

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.evento import Evento
from app.services import curso_service, evento_service, semestre_service

engine = create_engine("sqlite:///:memory:")
TestSession = sessionmaker(bind=engine)


def _fresh_db():
    Base.metadata.create_all(engine)
    db = TestSession()
    yield db
    db.close()
    Base.metadata.drop_all(engine)


def _curso(db, user_id="u1"):
    semestre = semestre_service.create_semestre(
        db,
        user_id=user_id,
        nombre="2026-1",
        fecha_inicio=date(2026, 3, 1),
        fecha_fin=date(2026, 7, 15),
    )
    return curso_service.create_curso(
        db,
        user_id=user_id,
        semestre_id=semestre.id,
        nombre="Cálculo",
        codigo="MAT100",
        profesor=None,
        color="blue",
    )


def test_create_evento_rejects_curso_de_otro_usuario():
    db = next(_fresh_db())
    curso_ajeno = _curso(db, user_id="otro")

    with pytest.raises(evento_service.CursoNoEncontrado):
        evento_service.create_evento(
            db,
            user_id="u1",
            titulo="Examen",
            descripcion=None,
            tipo="examen",
            fecha_inicio=datetime(2026, 4, 1, 9, 0),
            fecha_fin=None,
            curso_id=curso_ajeno.id,
            recurrencia_dia_semana=None,
            recurrencia_hasta=None,
        )


def test_create_evento_rejects_recurrencia_sin_hasta():
    db = next(_fresh_db())

    with pytest.raises(evento_service.RecurrenciaInvalida):
        evento_service.create_evento(
            db,
            user_id="u1",
            titulo="Clase",
            descripcion=None,
            tipo="clase",
            fecha_inicio=datetime(2026, 4, 1, 9, 0),
            fecha_fin=None,
            curso_id=None,
            recurrencia_dia_semana=2,
            recurrencia_hasta=None,
        )


def test_create_evento_rejects_recurrencia_hasta_anterior_a_inicio():
    db = next(_fresh_db())

    with pytest.raises(evento_service.RecurrenciaInvalida):
        evento_service.create_evento(
            db,
            user_id="u1",
            titulo="Clase",
            descripcion=None,
            tipo="clase",
            fecha_inicio=datetime(2026, 4, 10, 9, 0),
            fecha_fin=None,
            curso_id=None,
            recurrencia_dia_semana=2,
            recurrencia_hasta=date(2026, 4, 1),
        )


def test_create_evento_rejects_dia_semana_fuera_de_rango():
    db = next(_fresh_db())

    with pytest.raises(evento_service.RecurrenciaInvalida):
        evento_service.create_evento(
            db,
            user_id="u1",
            titulo="Clase",
            descripcion=None,
            tipo="clase",
            fecha_inicio=datetime(2026, 4, 1, 9, 0),
            fecha_fin=None,
            curso_id=None,
            recurrencia_dia_semana=9,
            recurrencia_hasta=date(2026, 5, 1),
        )


def test_create_evento_rejects_tipo_invalido():
    db = next(_fresh_db())

    with pytest.raises(evento_service.TipoInvalido):
        evento_service.create_evento(
            db,
            user_id="u1",
            titulo="Clase",
            descripcion=None,
            tipo="no-valido",
            fecha_inicio=datetime(2026, 4, 1, 9, 0),
            fecha_fin=None,
            curso_id=None,
            recurrencia_dia_semana=None,
            recurrencia_hasta=None,
        )


def test_create_evento_ok_sin_curso_sin_recurrencia():
    db = next(_fresh_db())

    evento = evento_service.create_evento(
        db,
        user_id="u1",
        titulo="Gimnasio",
        descripcion=None,
        tipo="personal",
        fecha_inicio=datetime(2026, 4, 1, 9, 0),
        fecha_fin=None,
        curso_id=None,
        recurrencia_dia_semana=None,
        recurrencia_hasta=None,
    )

    assert evento.id is not None


def test_update_evento_rejects_curso_de_otro_usuario():
    db = next(_fresh_db())
    evento = evento_service.create_evento(
        db,
        user_id="u1",
        titulo="Gimnasio",
        descripcion=None,
        tipo="personal",
        fecha_inicio=datetime(2026, 4, 1, 9, 0),
        fecha_fin=None,
        curso_id=None,
        recurrencia_dia_semana=None,
        recurrencia_hasta=None,
    )
    curso_ajeno = _curso(db, user_id="otro")

    with pytest.raises(evento_service.CursoNoEncontrado):
        evento_service.update_evento(db, evento, curso_id=curso_ajeno.id)


def test_update_and_delete_evento():
    db = next(_fresh_db())
    evento = evento_service.create_evento(
        db,
        user_id="u1",
        titulo="Original",
        descripcion=None,
        tipo="clase",
        fecha_inicio=datetime(2026, 4, 1, 9, 0),
        fecha_fin=None,
        curso_id=None,
        recurrencia_dia_semana=None,
        recurrencia_hasta=None,
    )

    actualizado = evento_service.update_evento(db, evento, titulo="Editado")
    assert actualizado.titulo == "Editado"

    evento_service.delete_evento(db, actualizado)
    assert evento_service.get_evento(db, user_id="u1", evento_id=evento.id) is None


def test_expand_ocurrencias_evento_unico_dentro_del_rango():
    evento = Evento(
        id="e1",
        user_id="u1",
        curso_id=None,
        titulo="Examen",
        descripcion=None,
        tipo="examen",
        fecha_inicio=datetime(2026, 4, 10, 14, 0),
        fecha_fin=datetime(2026, 4, 10, 16, 0),
        recurrencia_dia_semana=None,
        recurrencia_hasta=None,
    )

    ocurrencias = evento_service.expand_ocurrencias(
        evento, desde=date(2026, 4, 1), hasta=date(2026, 4, 30)
    )

    assert len(ocurrencias) == 1
    assert ocurrencias[0]["fecha_inicio"] == datetime(2026, 4, 10, 14, 0)
    assert ocurrencias[0]["fecha_fin"] == datetime(2026, 4, 10, 16, 0)


def test_expand_ocurrencias_evento_unico_fuera_del_rango():
    evento = Evento(
        id="e1",
        user_id="u1",
        curso_id=None,
        titulo="Examen",
        descripcion=None,
        tipo="examen",
        fecha_inicio=datetime(2026, 5, 10, 14, 0),
        fecha_fin=None,
        recurrencia_dia_semana=None,
        recurrencia_hasta=None,
    )

    ocurrencias = evento_service.expand_ocurrencias(
        evento, desde=date(2026, 4, 1), hasta=date(2026, 4, 30)
    )

    assert ocurrencias == []


def test_expand_ocurrencias_recurrente_semanal_cruza_mes():
    # lunes = 0. fecha_inicio es lunes 2026-03-02, se repite hasta 2026-04-15.
    evento = Evento(
        id="e2",
        user_id="u1",
        curso_id=None,
        titulo="Clase de yoga",
        descripcion=None,
        tipo="personal",
        fecha_inicio=datetime(2026, 3, 2, 7, 0),
        fecha_fin=datetime(2026, 3, 2, 8, 0),
        recurrencia_dia_semana=0,
        recurrencia_hasta=date(2026, 4, 15),
    )

    ocurrencias = evento_service.expand_ocurrencias(
        evento, desde=date(2026, 4, 1), hasta=date(2026, 4, 30)
    )

    fechas = [o["fecha_inicio"] for o in ocurrencias]
    assert fechas == [datetime(2026, 4, 6, 7, 0), datetime(2026, 4, 13, 7, 0)]
    assert all(o["id"] == "e2" for o in ocurrencias)
    assert ocurrencias[0]["fecha_fin"] == datetime(2026, 4, 6, 8, 0)


def test_expand_ocurrencias_recurrente_sin_ocurrencias_en_el_rango():
    evento = Evento(
        id="e3",
        user_id="u1",
        curso_id=None,
        titulo="Clase de yoga",
        descripcion=None,
        tipo="personal",
        fecha_inicio=datetime(2026, 3, 2, 7, 0),
        fecha_fin=None,
        recurrencia_dia_semana=0,
        recurrencia_hasta=date(2026, 3, 15),
    )

    ocurrencias = evento_service.expand_ocurrencias(
        evento, desde=date(2026, 4, 1), hasta=date(2026, 4, 30)
    )

    assert ocurrencias == []


def test_list_eventos_en_rango_scoped_by_user():
    db = next(_fresh_db())
    evento_service.create_evento(
        db,
        user_id="user_scoped_owner",
        titulo="Mío",
        descripcion=None,
        tipo="personal",
        fecha_inicio=datetime(2026, 4, 5, 9, 0),
        fecha_fin=None,
        curso_id=None,
        recurrencia_dia_semana=None,
        recurrencia_hasta=None,
    )
    evento_service.create_evento(
        db,
        user_id="user_scoped_other",
        titulo="Ajeno",
        descripcion=None,
        tipo="personal",
        fecha_inicio=datetime(2026, 4, 5, 9, 0),
        fecha_fin=None,
        curso_id=None,
        recurrencia_dia_semana=None,
        recurrencia_hasta=None,
    )

    resultado = evento_service.list_eventos_en_rango(
        db, user_id="user_scoped_owner", desde=date(2026, 4, 1), hasta=date(2026, 4, 30)
    )

    assert [r["titulo"] for r in resultado] == ["Mío"]
