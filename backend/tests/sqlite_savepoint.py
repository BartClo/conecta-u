"""Engine SQLite en memoria con SAVEPOINT/rollback reales.

Receta documentada de SQLAlchemy: pysqlite no emite BEGIN por sí solo, así que
se toma el control de la transacción con isolation_level=None + evento begin.
"""

from sqlalchemy import create_engine, event
from sqlalchemy.pool import StaticPool


def make_engine():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )

    @event.listens_for(engine, "connect")
    def _connect(dbapi_conn, _record):
        dbapi_conn.isolation_level = None
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    @event.listens_for(engine, "begin")
    def _begin(conn):
        conn.exec_driver_sql("BEGIN")

    return engine
