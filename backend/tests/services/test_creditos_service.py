import pytest
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.core.economia import BONO_INICIAL
from app.models.credito import CuentaCredito, MovimientoCredito
from app.models.user import User
from app.repositories import credito_repository as repo
from app.services import creditos_service as svc
from tests.sqlite_savepoint import make_engine

engine = make_engine()
Session = sessionmaker(bind=engine)


@pytest.fixture
def db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with Session() as s:
        s.add(User(id="u1", email="u1@x.com", name="U1"))
        s.commit()
        yield s


def _count_movs(db):
    return db.scalar(select(func.count()).select_from(MovimientoCredito))


def test_crea_cuenta_con_bono_exacto(db):
    cuenta = svc.obtener_o_crear_cuenta(db, "u1")
    assert cuenta.saldo == BONO_INICIAL
    movs = db.scalars(select(MovimientoCredito)).all()
    assert [(m.delta, m.motivo, m.saldo_resultante) for m in movs] == [
        (BONO_INICIAL, "bono_inicial", BONO_INICIAL)
    ]


def test_obtener_dos_veces_no_duplica(db):
    a = svc.obtener_o_crear_cuenta(db, "u1")
    b = svc.obtener_o_crear_cuenta(db, "u1")
    assert a.id == b.id
    assert _count_movs(db) == 1


def test_carrera_de_creacion_converge_a_la_cuenta_existente(db, monkeypatch):
    existente = svc.obtener_o_crear_cuenta(db, "u1")
    db.commit()
    original = repo.get_cuenta
    llamadas = []

    def get_cuenta_ciego_la_primera_vez(*a, **kw):
        llamadas.append(1)
        return None if len(llamadas) == 1 else original(*a, **kw)

    monkeypatch.setattr(repo, "get_cuenta", get_cuenta_ciego_la_primera_vez)
    cuenta = svc.obtener_o_crear_cuenta(db, "u1")
    assert cuenta.id == existente.id
    assert _count_movs(db) == 1  # el savepoint revirtió el bono duplicado
    db.commit()  # la transacción externa sigue viva


def test_error_de_integridad_que_no_es_carrera_se_propaga(db):
    with pytest.raises(IntegrityError):
        svc.obtener_o_crear_cuenta(db, "no-existe")  # FK a users activa en este engine


def test_ganar_suma_y_registra(db):
    mov = svc.ganar(db, "u1", 15, "gano_desafio")
    assert (mov.delta, mov.saldo_resultante) == (15, BONO_INICIAL + 15)
    assert svc.obtener_o_crear_cuenta(db, "u1").saldo == BONO_INICIAL + 15


def test_gastar_resta_y_registra(db):
    mov = svc.gastar(db, "u1", 20, "genero_test_ia", "generacion_ia", "g1")
    assert (mov.delta, mov.saldo_resultante) == (-20, BONO_INICIAL - 20)
    assert (mov.ref_tipo, mov.ref_id) == ("generacion_ia", "g1")


def test_gastar_insuficiente_no_mueve_nada(db):
    svc.obtener_o_crear_cuenta(db, "u1")
    antes = _count_movs(db)
    with pytest.raises(svc.SaldoInsuficienteError):
        svc.gastar(db, "u1", BONO_INICIAL + 1, "genero_test_ia")
    assert _count_movs(db) == antes
    assert svc.obtener_o_crear_cuenta(db, "u1").saldo == BONO_INICIAL


def test_gastar_todo_el_saldo_es_valido(db):
    assert svc.gastar(db, "u1", BONO_INICIAL, "ajuste").saldo_resultante == 0


def test_ganar_idempotente_por_ref(db):
    a = svc.ganar(db, "u1", 15, "gano_desafio", "desafio", "d1")
    b = svc.ganar(db, "u1", 15, "gano_desafio", "desafio", "d1")
    assert a.id == b.id
    assert svc.obtener_o_crear_cuenta(db, "u1").saldo == BONO_INICIAL + 15
    assert _count_movs(db) == 2  # bono + un premio


def test_gastar_idempotente_aunque_ya_no_alcance_el_saldo(db):
    a = svc.gastar(db, "u1", BONO_INICIAL, "genero_test_ia", "generacion_ia", "g1")
    b = svc.gastar(db, "u1", BONO_INICIAL, "genero_test_ia", "generacion_ia", "g1")
    assert a.id == b.id


def test_misma_ref_con_otro_motivo_es_otro_movimiento(db):
    svc.ganar(db, "u1", 5, "gano_desafio", "desafio", "d1")
    svc.ganar(db, "u1", 5, "ajuste", "desafio", "d1")
    assert _count_movs(db) == 3


def test_violacion_del_indice_unico_dentro_del_savepoint_es_noop(db, monkeypatch):
    ya = svc.ganar(db, "u1", 15, "gano_desafio", "desafio", "d1")
    db.commit()
    original = svc._existente
    llamadas = []

    def ciego_la_primera_vez(*a, **kw):
        llamadas.append(1)
        return None if len(llamadas) == 1 else original(*a, **kw)

    monkeypatch.setattr(svc, "_existente", ciego_la_primera_vez)
    mov = svc.ganar(db, "u1", 15, "gano_desafio", "desafio", "d1")
    assert mov.id == ya.id
    # el savepoint revirtió el saldo local; sigue habiendo un solo premio
    assert svc.obtener_o_crear_cuenta(db, "u1").saldo == BONO_INICIAL + 15
    assert _count_movs(db) == 2


def test_integridad_distinta_a_duplicado_se_propaga(db, monkeypatch):
    svc.obtener_o_crear_cuenta(db, "u1")
    monkeypatch.setattr(svc, "_existente", lambda *a, **kw: None)
    svc.ganar(db, "u1", 1, "gano_desafio", "desafio", "d1")
    with pytest.raises(IntegrityError):
        svc.ganar(db, "u1", 1, "gano_desafio", "desafio", "d1")


@pytest.mark.parametrize("monto", [0, -5])
@pytest.mark.parametrize("fn", ["ganar", "gastar"])
def test_monto_no_positivo_es_value_error(db, fn, monto):
    with pytest.raises(ValueError):
        getattr(svc, fn)(db, "u1", monto, "ajuste")


@pytest.mark.parametrize("fn", ["ganar", "gastar"])
def test_motivo_invalido_es_value_error(db, fn):
    with pytest.raises(ValueError):
        getattr(svc, fn)(db, "u1", 5, "inventado")


def test_verificar_saldo(db):
    assert svc.verificar_saldo(db, "u1", BONO_INICIAL) is True
    assert svc.verificar_saldo(db, "u1", BONO_INICIAL + 1) is False


def test_rollback_externo_deshace_saldo_y_movimiento(db):
    svc.obtener_o_crear_cuenta(db, "u1")
    db.commit()
    svc.ganar(db, "u1", 15, "gano_desafio", "desafio", "d1")
    db.flush()
    assert repo.get_cuenta(db, "u1").saldo == BONO_INICIAL + 15
    db.rollback()
    assert repo.get_cuenta(db, "u1").saldo == BONO_INICIAL
    assert _count_movs(db) == 1
    assert repo.get_por_ref(db, "desafio", "d1", "gano_desafio") is None


def test_rollback_externo_deshace_tambien_la_cuenta_nueva(db):
    svc.gastar(db, "u1", 10, "ajuste")
    db.rollback()
    assert repo.get_cuenta(db, "u1") is None
    assert _count_movs(db) == 0


def test_savepoint_fallido_no_tira_la_transaccion_externa(db):
    svc.ganar(db, "u1", 15, "gano_desafio", "desafio", "d1")
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            db.add(MovimientoCredito(user_id="u1", delta=1, motivo="ajuste", saldo_resultante=1))
            db.add(
                MovimientoCredito(
                    user_id="u1",
                    delta=1,
                    motivo="gano_desafio",
                    ref_tipo="desafio",
                    ref_id="d1",
                    saldo_resultante=1,
                )
            )
            db.flush()
    db.commit()
    assert _count_movs(db) == 2  # bono + premio; nada del savepoint fallido


def test_check_constraint_rechaza_saldo_negativo(db):
    cuenta = svc.obtener_o_crear_cuenta(db, "u1")
    db.commit()
    with pytest.raises(IntegrityError):
        db.execute(text("UPDATE cuentas_credito SET saldo = -1 WHERE id = :i"), {"i": cuenta.id})
    db.rollback()
    assert isinstance(db.get(CuentaCredito, cuenta.id).saldo, int)
