import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.economia import BONO_INICIAL
from app.core.security import get_current_token
from app.main import app
from app.models.credito import CuentaCredito, MovimientoCredito
from app.models.ia import GeneracionIA, Resumen
from app.models.materia import Materia
from app.models.test import Test
from app.models.user import User
from app.services import creditos_service, ia_service
from app.services.ia.factory import get_llm_provider
from app.services.ia.llm_provider import (
    LLMProvider,
    LLMProviderError,
    PreguntaGenerada,
    TestGenerado,
)

engine = create_engine(
    "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
TestSession = sessionmaker(bind=engine)
client = TestClient(app)
actual = {"sub": "ana"}
TEXTO = "Texto fuente largo para resumir. " * 5


class Espia(LLMProvider):
    def __init__(self):
        self.llamadas = 0
        self.test = None
        self.resumen = "Un resumen."
        self.error = None

    def generar_test(self, tema, n_preguntas):
        self.llamadas += 1
        if self.error:
            raise self.error
        return self.test or TestGenerado(
            titulo="Test IA",
            preguntas=[
                PreguntaGenerada(enunciado=f"p{i}", opciones=["a", "b", "c"], indice_correcta=2)
                for i in range(n_preguntas)
            ],
        )

    def generar_resumen(self, texto):
        self.llamadas += 1
        if self.error:
            raise self.error
        return self.resumen


prov = Espia()


def _db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def _overrides():
    global prov
    prov = Espia()
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with TestSession() as db:
        for uid in ("ana", "beto"):
            db.add(User(id=uid, email=f"{uid}@x.com", name=uid.title()))
        db.add(Materia(id="m1", nombre="Física", nombre_normalizado="física", created_by="ana"))
        db.commit()
    previous = dict(app.dependency_overrides)
    app.dependency_overrides[get_db] = _db
    app.dependency_overrides[get_llm_provider] = lambda: prov
    app.dependency_overrides[get_current_token] = lambda: {
        "sub": actual["sub"],
        "email": "x@x.com",
        "user_metadata": {},
    }
    actual["sub"] = "ana"
    yield
    app.dependency_overrides.clear()
    app.dependency_overrides.update(previous)


def _saldo(uid="ana"):
    with TestSession() as db:
        c = db.scalar(select(CuentaCredito).where(CuentaCredito.user_id == uid))
        return c.saldo if c else None


def _n(model):
    with TestSession() as db:
        return db.scalar(select(func.count()).select_from(model))


def _gens():
    with TestSession() as db:
        return list(db.scalars(select(GeneracionIA)))


def _post_test(**kw):
    return client.post("/api/ia/tests", json={"materia_id": "m1", "tema": "Cinemática", **kw})


def _vaciar_saldo():
    with TestSession() as db:
        creditos_service.obtener_o_crear_cuenta(db, "ana").saldo = 0
        db.commit()


def test_generar_test_cobra_y_crea_test_de_ia_con_correcta_marcada():
    r = _post_test(n_preguntas=2)
    assert r.status_code == 201, r.text
    d = r.json()
    assert d["costo_creditos"] == 20
    assert d["saldo_restante"] == BONO_INICIAL - 20 == _saldo()
    t = d["test"]
    assert (t["origen"], t["autor_id"], t["materia_id"]) == ("ia", "ana", "m1")
    assert [o["es_correcta"] for o in t["preguntas"][0]["opciones"]] == [False, False, True]
    g = _gens()[0]
    assert (g.estado, g.costo_creditos, g.tipo) == ("ok", 20, "test")
    assert (g.resultado_ref_tipo, g.resultado_ref_id) == ("test", t["id"])
    with TestSession() as db:
        mov = db.scalar(select(MovimientoCredito).where(MovimientoCredito.delta == -20))
        assert (mov.motivo, mov.ref_tipo, mov.ref_id) == ("genero_test_ia", "test", t["id"])


def test_texto_fuente_basta_sin_tema():
    r = client.post("/api/ia/tests", json={"materia_id": "m1", "texto_fuente": TEXTO})
    assert r.status_code == 201


@pytest.mark.parametrize(
    "extra",
    [
        {"tema": None},
        {"tema": "  "},
        {"n_preguntas": 0},
        {"n_preguntas": 21},
        {"tema": "x" * 2001},
        {"texto_fuente": "x" * 50001},
    ],
)
def test_validacion_422_sin_tocar_proveedor(extra):
    r = client.post("/api/ia/tests", json={"materia_id": "m1", "tema": "ok", **extra})
    assert r.status_code == 422
    assert prov.llamadas == 0


def test_materia_inexistente_404():
    r = client.post("/api/ia/tests", json={"materia_id": "nope", "tema": "x"})
    assert r.status_code == 404
    assert prov.llamadas == 0


def test_saldo_insuficiente_402_y_proveedor_no_invocado():
    _vaciar_saldo()
    r = _post_test()
    assert r.status_code == 402
    assert prov.llamadas == 0
    assert _n(Test) == 0 and _saldo() == 0


def test_fallo_del_proveedor_502_sin_cobro_y_audita():
    prov.error = LLMProviderError("timeout al generar")
    r = _post_test()
    assert r.status_code == 502
    assert r.json()["detail"] == "No se pudo generar con IA. Inténtalo de nuevo."
    assert "timeout" not in r.text
    assert _saldo() == BONO_INICIAL and _n(Test) == 0
    g = _gens()[0]
    assert (g.estado, g.costo_creditos, g.error_msg) == ("error", 0, "timeout al generar")
    assert g.resultado_ref_id is None


def _preg(**kw):
    return PreguntaGenerada(
        **{"enunciado": "q", "opciones": ["a", "b"], "indice_correcta": 0, **kw}
    )


@pytest.mark.parametrize(
    "gen",
    [
        TestGenerado(titulo="T", preguntas=[]),
        TestGenerado(titulo="T", preguntas=[_preg(), _preg()]),
        TestGenerado(titulo="  ", preguntas=[_preg()]),
        TestGenerado(titulo="x" * 151, preguntas=[_preg()]),
        TestGenerado(titulo="T", preguntas=[_preg(opciones=["a"])]),
        TestGenerado(titulo="T", preguntas=[_preg(opciones=list("abcdefg"))]),
        TestGenerado(titulo="T", preguntas=[_preg(opciones=["a", " "])]),
        TestGenerado(titulo="T", preguntas=[_preg(opciones=["a", "x" * 501])]),
        TestGenerado(titulo="T", preguntas=[_preg(indice_correcta=2)]),
        TestGenerado(titulo="T", preguntas=[_preg(indice_correcta=-1)]),
        TestGenerado(titulo="T", preguntas=[_preg(enunciado=" ")]),
    ],
)
def test_salida_estructuralmente_invalida_502_sin_cobro(gen):
    prov.test = gen
    r = _post_test(n_preguntas=1)
    assert r.status_code == 502
    assert _saldo() == BONO_INICIAL and _n(Test) == 0
    assert _gens()[0].estado == "error"


def test_rollback_atomico_si_falla_el_cobro(monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("db caida")

    monkeypatch.setattr(creditos_service, "gastar", boom)
    with pytest.raises(RuntimeError):
        _post_test()
    assert _n(Test) == 0 and _saldo() == BONO_INICIAL
    assert [g.estado for g in _gens()] == ["error"]  # solo la auditoria


def test_carrera_de_saldo_en_el_cobro_da_402_sin_test_y_audita(monkeypatch):
    # el saldo pasa el paso 1 pero se agota antes del cobro final
    real = creditos_service.verificar_saldo

    def verificar_y_vaciar(db, uid, monto):
        ok = real(db, uid, monto)
        creditos_service.obtener_o_crear_cuenta(db, uid).saldo = 0
        return ok

    monkeypatch.setattr(creditos_service, "verificar_saldo", verificar_y_vaciar)
    r = _post_test()
    assert r.status_code == 402
    assert _n(Test) == 0
    assert _gens()[0].error_msg == "saldo insuficiente"


def test_resumen_cobra_10_y_titulo_derivado():
    r = client.post("/api/ia/resumenes", json={"texto_fuente": TEXTO})
    assert r.status_code == 201, r.text
    d = r.json()
    assert d["costo_creditos"] == 10 and _saldo() == BONO_INICIAL - 10
    assert d["resumen"]["titulo"] == TEXTO.strip()[:60]
    assert d["resumen"]["contenido_resumen"] == "Un resumen."
    g = _gens()[0]
    assert (g.tipo, g.estado, g.resultado_ref_tipo) == ("resumen", "ok", "resumen")


def test_resumen_con_titulo_y_materia():
    r = client.post(
        "/api/ia/resumenes", json={"texto_fuente": TEXTO, "titulo": "Mío", "materia_id": "m1"}
    )
    assert r.json()["resumen"]["titulo"] == "Mío"
    assert r.json()["resumen"]["materia_id"] == "m1"


@pytest.mark.parametrize(
    "body",
    [
        {"texto_fuente": "corto"},
        {"texto_fuente": "x" * 50001},
        {"texto_fuente": TEXTO, "titulo": "t" * 151},
    ],
)
def test_resumen_422(body):
    assert client.post("/api/ia/resumenes", json=body).status_code == 422


def test_resumen_materia_inexistente_404():
    r = client.post("/api/ia/resumenes", json={"texto_fuente": TEXTO, "materia_id": "nope"})
    assert r.status_code == 404 and prov.llamadas == 0


def test_resumen_saldo_insuficiente_402():
    _vaciar_saldo()
    assert client.post("/api/ia/resumenes", json={"texto_fuente": TEXTO}).status_code == 402
    assert prov.llamadas == 0


def test_resumen_fallo_y_vacio_son_502_sin_cobro():
    prov.error = LLMProviderError("caida")
    assert client.post("/api/ia/resumenes", json={"texto_fuente": TEXTO}).status_code == 502
    prov.error = None
    prov.resumen = "   "
    assert client.post("/api/ia/resumenes", json={"texto_fuente": TEXTO}).status_code == 502
    assert _saldo() == BONO_INICIAL and _n(Resumen) == 0
    assert [g.estado for g in _gens()] == ["error", "error"]


def test_listar_y_detalle_solo_propios():
    rid = client.post("/api/ia/resumenes", json={"texto_fuente": TEXTO}).json()["resumen"]["id"]
    assert [x["id"] for x in client.get("/api/ia/resumenes").json()] == [rid]
    assert client.get(f"/api/ia/resumenes/{rid}").status_code == 200
    actual["sub"] = "beto"
    assert client.get("/api/ia/resumenes").json() == []
    assert client.get(f"/api/ia/resumenes/{rid}").status_code == 404


def test_respuesta_invalida_es_error_de_proveedor():
    assert issubclass(ia_service.RespuestaIAInvalidaError, LLMProviderError)


def test_sin_clave_da_502_ia_no_configurada_sin_cobrar():
    app.dependency_overrides.pop(get_llm_provider)
    r = _post_test()
    assert r.status_code == 502 and "IA no configurada" not in r.text
    assert _gens()[0].error_msg == "IA no configurada"
    assert _saldo() == BONO_INICIAL


def test_fallo_al_persistir_audita_con_texto_fijo(monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("secreto de la db")

    monkeypatch.setattr(creditos_service, "gastar", boom)
    with pytest.raises(RuntimeError):
        _post_test()
    g = _gens()[0]
    assert (g.estado, g.error_msg) == ("error", "error interno al guardar")


def test_fallo_al_auditar_no_tapa_el_error_original(monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("original")

    def boom2(*a, **k):
        raise ValueError("auditoria")

    monkeypatch.setattr(creditos_service, "gastar", boom)
    monkeypatch.setattr(ia_service, "_registrar_error", boom2)
    with pytest.raises(RuntimeError, match="original"):
        _post_test()


def test_nul_en_la_entrada_es_422():
    nul = "a\x00b"
    assert _post_test(tema=nul).status_code == 422
    assert _post_test(texto_fuente=nul).status_code == 422
    assert client.post("/api/ia/resumenes", json={"texto_fuente": TEXTO + nul}).status_code == 422
    assert (
        client.post("/api/ia/resumenes", json={"texto_fuente": TEXTO, "titulo": nul}).status_code
        == 422
    )


def test_texto_corto_o_tema_vacio_se_miden_recortados():
    assert (
        client.post("/api/ia/resumenes", json={"texto_fuente": " " * 60 + "x"}).status_code == 422
    )
    assert _post_test(tema="   ", texto_fuente=None).status_code == 422


def test_nul_en_la_salida_del_proveedor_es_502_sin_cobro():
    prov.test = TestGenerado(titulo="T", preguntas=[_preg(enunciado="a\x00b")])
    assert _post_test(n_preguntas=1).status_code == 502
    prov.resumen = "ho\x00la"
    assert client.post("/api/ia/resumenes", json={"texto_fuente": TEXTO}).status_code == 502
    assert _saldo() == BONO_INICIAL and _n(Test) == 0 and _n(Resumen) == 0
