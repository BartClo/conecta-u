from datetime import datetime

import pytest
from pydantic import ValidationError

from app.schemas.evento import EventoIn


def test_evento_in_rejects_tipo_invalido():
    with pytest.raises(ValidationError):
        EventoIn(
            titulo="Examen",
            descripcion=None,
            tipo="invalido",
            fecha_inicio=datetime(2026, 4, 1, 9, 0),
            fecha_fin=None,
            curso_id=None,
            recurrencia_dia_semana=None,
            recurrencia_hasta=None,
        )


def test_evento_in_accepts_tipo_valido():
    evento = EventoIn(
        titulo="Examen",
        descripcion=None,
        tipo="examen",
        fecha_inicio=datetime(2026, 4, 1, 9, 0),
        fecha_fin=None,
        curso_id=None,
        recurrencia_dia_semana=None,
        recurrencia_hasta=None,
    )
    assert evento.tipo == "examen"


def test_evento_in_rejects_dia_semana_invalido():
    with pytest.raises(ValidationError):
        EventoIn(
            titulo="Clase",
            descripcion=None,
            tipo="clase",
            fecha_inicio=datetime(2026, 4, 1, 9, 0),
            fecha_fin=None,
            curso_id=None,
            recurrencia_dia_semana=9,
            recurrencia_hasta=None,
        )
