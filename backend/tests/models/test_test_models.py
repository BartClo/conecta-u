from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session

from alembic import command
from app.core.config import get_settings
from app.core.database import Base
from app.models.materia import Materia
from app.models.test import Opcion, Pregunta, Test
from app.models.user import User

BACKEND = Path(__file__).resolve().parents[2]


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        session.add(User(id="u1", email="a@b.com"))
        session.add(
            Materia(id="m1", nombre="Cálculo", nombre_normalizado="cálculo", created_by="u1")
        )
        session.commit()
        yield session


def _test() -> Test:
    return Test(
        materia_id="m1",
        titulo="T",
        autor_id="u1",
        origen="manual",
        preguntas=[
            Pregunta(
                enunciado="¿?",
                orden=0,
                opciones=[
                    Opcion(texto="a", es_correcta=True, orden=0),
                    Opcion(texto="b", es_correcta=False, orden=1),
                ],
            )
        ],
    )


def test_borrar_test_borra_preguntas_y_opciones(db):
    db.add(_test())
    db.commit()
    assert db.query(Opcion).count() == 2

    db.delete(db.query(Test).one())
    db.commit()

    assert db.query(Pregunta).count() == 0
    assert db.query(Opcion).count() == 0


def test_borrar_pregunta_borra_sus_opciones(db):
    db.add(_test())
    db.commit()

    db.delete(db.query(Pregunta).one())
    db.commit()

    assert db.query(Opcion).count() == 0


def test_migracion_0005_coincide_con_el_modelo(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path / 'm.db'}"
    monkeypatch.setenv("DATABASE_URL", url)
    get_settings.cache_clear()
    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND / "alembic"))
    try:
        command.upgrade(cfg, "0005")
        insp = inspect(create_engine(url))
        for model in (Test, Pregunta, Opcion):
            table = model.__table__
            cols = {c["name"]: c for c in insp.get_columns(table.name)}
            assert set(cols) == {c.name for c in table.columns}
            for c in table.columns:
                assert cols[c.name]["nullable"] == (c.nullable or c.server_default is not None)
            fks = {
                (fk["constrained_columns"][0], fk["referred_table"], fk["options"].get("ondelete"))
                for fk in insp.get_foreign_keys(table.name)
            }
            assert fks == {
                (fk.parent.name, fk.column.table.name, fk.ondelete) for fk in table.foreign_keys
            }
        command.downgrade(cfg, "0004")
        assert "tests" not in inspect(create_engine(url)).get_table_names()
    finally:
        get_settings.cache_clear()
