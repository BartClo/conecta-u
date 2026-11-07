from datetime import UTC, datetime, timedelta

import pytest

from app.models.credito import CuentaCredito, MovimientoCredito
from app.models.desafio import Desafio, Intento
from app.services import creditos_service
from tests.api.test_desafios import (  # noqa: F401  (_overrides es autouse)
    TestSession,
    _como,
    _desafio,
    _escenario,
    _overrides,
    _rendir,
    _set_estado,
    client,
)

SI, NO = True, False


def _fijar(user_id, **campos):
    with TestSession() as db:
        db.query(Intento).filter(Intento.user_id == user_id).update(campos)
        db.commit()


def _cerrar(d):
    return client.post(f"/api/desafios/{d['id']}/cerrar")


def _saldo(user_id):
    with TestSession() as db:
        cuenta = db.query(CuentaCredito).filter(CuentaCredito.user_id == user_id).first()
        return cuenta.saldo if cuenta else None


def _movs_premio():
    with TestSession() as db:
        return (
            db.query(MovimientoCredito).filter(MovimientoCredito.motivo == "gano_desafio").count()
        )


# --- ganador y desempates ---


def test_ganador_por_puntaje_y_premio_una_sola_vez():
    _, grupo, test = _escenario()
    d = _desafio(grupo, test)
    _como("beto")
    _rendir(d, test, [SI, NO], segundos=5)
    _como("caro")
    _rendir(d, test, [SI, SI], segundos=99)
    _como("ana")
    r = _cerrar(d)
    assert r.status_code == 200
    assert r.json() == {
        "id": d["id"],
        "estado": "cerrado",
        "ganador_user_id": "caro",
        "ganador_nombre": "caro@x.com",
        "premio_acreditado": True,
        "premio_creditos": 15,
    }
    assert _saldo("caro") == 115
    again = _cerrar(d)
    assert again.status_code == 200 and again.json() == r.json()
    assert _saldo("caro") == 115
    assert _movs_premio() == 1


@pytest.mark.parametrize(
    "beto, caro, ganador",
    [
        ({"segundos": 50}, {"segundos": 40}, "caro"),  # mismo puntaje: menos segundos
        (
            {"segundos": 40, "finalizado_at": datetime(2026, 1, 2)},
            {"segundos": 40, "finalizado_at": datetime(2026, 1, 1)},
            "caro",  # mismos segundos: finalizo antes
        ),
    ],
)
def test_desempates(beto, caro, ganador):
    _, grupo, test = _escenario()
    d = _desafio(grupo, test)
    _como("beto")
    _rendir(d, test, [SI, SI])
    _como("caro")
    _rendir(d, test, [SI, SI])
    _fijar("beto", **beto)
    _fijar("caro", **caro)
    _como("ana")
    assert _cerrar(d).json()["ganador_user_id"] == ganador


def test_empate_total_gana_menor_id():
    _, grupo, test = _escenario()
    d = _desafio(grupo, test)
    _como("beto")
    _rendir(d, test, [SI, SI])
    _como("caro")
    _rendir(d, test, [SI, SI])
    fijo = {"segundos": 7, "finalizado_at": datetime(2026, 1, 1)}
    with TestSession() as db:
        for i, uid in (("00-a", "caro"), ("99-z", "beto")):
            db.query(Intento).filter(Intento.user_id == uid).update({**fijo, "id": i})
        db.commit()
    _como("ana")
    ranking = client.get(f"/api/desafios/{d['id']}/ranking").json()
    assert [e["user_id"] for e in ranking] == ["caro", "beto"]
    assert _cerrar(d).json()["ganador_user_id"] == "caro"


# --- elegibilidad ---


def test_autor_del_test_no_gana_pero_aparece_en_ranking():
    _, grupo, test = _escenario()  # ana es autora del test y owner
    d = _desafio(grupo, test)
    _rendir(d, test, [SI, SI], segundos=1)  # ana: mejor intento
    _como("beto")
    _rendir(d, test, [SI, NO])
    ranking = client.get(f"/api/desafios/{d['id']}/ranking").json()
    assert [(e["user_id"], e["posicion"], e["elegible"]) for e in ranking] == [
        ("ana", 1, False),
        ("beto", 2, True),
    ]
    assert ranking[0]["nombre"] == "Ana"
    _como("ana")
    r = _cerrar(d).json()
    assert r["ganador_user_id"] == "beto" and r["premio_acreditado"] is True
    assert _saldo("ana") is None


def test_expulsado_no_gana():
    _, grupo, test = _escenario()
    d = _desafio(grupo, test)
    _como("beto")
    _rendir(d, test, [SI, SI])
    _como("caro")
    _rendir(d, test, [SI, NO])
    _como("ana")
    assert client.delete(f"/api/grupos/{grupo['id']}/miembros/beto").status_code == 204
    ranking = client.get(f"/api/desafios/{d['id']}/ranking").json()
    assert [(e["user_id"], e["elegible"]) for e in ranking] == [("beto", False), ("caro", True)]
    assert _cerrar(d).json()["ganador_user_id"] == "caro"


def test_sin_elegibles_cierra_sin_ganador_ni_premio():
    _, grupo, test = _escenario()
    d = _desafio(grupo, test)
    _rendir(d, test, [SI, SI])  # solo la autora
    r = _cerrar(d).json()
    assert r["estado"] == "cerrado"
    assert (r["ganador_user_id"], r["ganador_nombre"]) == (None, None)
    assert (r["premio_acreditado"], r["premio_creditos"]) == (False, 0)
    assert _movs_premio() == 0
    assert _cerrar(d).json() == r


def test_sin_intentos_cierra_y_ranking_vacio():
    _, grupo, test = _escenario()
    d = _desafio(grupo, test)
    assert client.get(f"/api/desafios/{d['id']}/ranking").json() == []
    assert _cerrar(d).json()["premio_creditos"] == 0


# --- quien cierra ---


def test_cierra_creador_y_owner_member_no_hasta_vencer():
    _, grupo, test = _escenario()
    _como("beto")
    d1 = _desafio(grupo, test)
    assert _cerrar(d1).status_code == 200  # creador (no owner)
    _como("ana")
    d2 = _desafio(grupo, test)
    _como("beto")
    assert _cerrar(d2).status_code == 403  # otro member, antes de fecha_fin
    _como("ana")
    assert _cerrar(d2).status_code == 200  # creadora y owner


def test_cualquier_miembro_cierra_vencido_y_no_miembro_404():
    _, grupo, test = _escenario()
    d = _desafio(grupo, test, fecha_fin=(datetime.now(UTC) + timedelta(days=1)).isoformat())
    _como("beto")
    assert _cerrar(d).status_code == 403
    _set_estado(d["id"], fecha_fin=datetime.now(UTC) - timedelta(minutes=1))
    assert _cerrar(d).status_code == 200
    _como("intruso")
    assert _cerrar(d).status_code == 404
    assert client.post("/api/desafios/nope/cerrar").status_code == 404


def test_fallo_al_acreditar_deja_el_desafio_abierto(monkeypatch):
    _, grupo, test = _escenario()
    d = _desafio(grupo, test)
    _como("beto")
    _rendir(d, test, [SI, SI])
    _como("ana")

    def boom(*a, **k):
        raise RuntimeError("fallo")

    monkeypatch.setattr(creditos_service, "ganar", boom)
    with pytest.raises(RuntimeError):
        _cerrar(d)
    with TestSession() as db:
        fila = db.get(Desafio, d["id"])
        assert (fila.estado, fila.ganador_user_id, fila.premio_acreditado) == (
            "abierto",
            None,
            False,
        )


# --- detalle ---


def test_detalle_del_desafio_solo_miembros():
    _, grupo, test = _escenario()
    d = _desafio(grupo, test)
    r = client.get(f"/api/desafios/{d['id']}").json()
    assert (r["creado_por"], r["owner_id"], r["estado"]) == ("ana", "ana", "abierto")
    assert (r["ganador_user_id"], r["premio_creditos"], r["test_titulo"]) == (None, 0, "Parcial")
    _como("beto")
    _rendir(d, test, [SI, SI])
    _como("ana")
    _cerrar(d)
    r = client.get(f"/api/desafios/{d['id']}").json()
    assert (r["ganador_nombre"], r["premio_creditos"]) == ("Beto", 15)
    _como("intruso")
    assert client.get(f"/api/desafios/{d['id']}").status_code == 404
    assert client.get(f"/api/desafios/{d['id']}/ranking").status_code == 404


# --- leaderboard de grupo ---


def test_leaderboard_incluye_0_0_y_ordena():
    _, grupo, test = _escenario()
    d1 = _desafio(grupo, test)
    _como("beto")
    _rendir(d1, test, [SI, SI])
    _como("caro")
    _rendir(d1, test, [SI, NO])
    _como("ana")
    _cerrar(d1)  # gana beto
    d2 = _desafio(grupo, test)
    _como("caro")
    _rendir(d2, test, [SI, SI])
    r = client.get(f"/api/grupos/{grupo['id']}/leaderboard")
    assert r.status_code == 200
    assert r.json() == [
        {
            "user_id": "beto",
            "nombre": "Beto",
            "desafios_ganados": 1,
            "suma_puntajes": 2,
            "posicion": 1,
        },
        {
            "user_id": "caro",
            "nombre": "caro@x.com",
            "desafios_ganados": 0,
            "suma_puntajes": 3,
            "posicion": 2,
        },
        {
            "user_id": "ana",
            "nombre": "Ana",
            "desafios_ganados": 0,
            "suma_puntajes": 0,
            "posicion": 3,
        },
    ]
    _como("intruso")
    assert client.get(f"/api/grupos/{grupo['id']}/leaderboard").status_code == 404


def test_leaderboard_grupo_nuevo_orden_estable_por_ingreso():
    _, grupo, _ = _escenario()
    r = client.get(f"/api/grupos/{grupo['id']}/leaderboard").json()
    assert [e["user_id"] for e in r] == ["ana", "beto", "caro"]
    assert {(e["desafios_ganados"], e["suma_puntajes"]) for e in r} == {(0, 0)}


# --- ranking por materia ---


def test_ranking_materia_agrega_grupos_sin_email():
    materia, g1, test = _escenario()
    g2 = client.post("/api/grupos", json={"nombre": "G2", "materia_id": materia["id"]}).json()
    for uid in ("beto", "caro"):
        _como(uid)
        client.post("/api/grupos/unirse", json={"codigo": g2["codigo_invitacion"]})
    _como("ana")
    for grupo in (g1, g2):
        d = _desafio(grupo, test)
        _como("beto")
        _rendir(d, test, [SI, SI])
        _como("caro")
        _rendir(d, test, [SI, NO])
        _como("ana")
        _cerrar(d)
    r = client.get(f"/api/materias/{materia['id']}/ranking")
    assert r.status_code == 200
    assert r.json() == [
        {
            "user_id": "beto",
            "nombre": "Beto",
            "desafios_ganados": 2,
            "suma_puntajes": 4,
            "posicion": 1,
        },
        {
            "user_id": "caro",
            "nombre": "Estudiante",
            "desafios_ganados": 0,
            "suma_puntajes": 2,
            "posicion": 2,
        },
    ]
    assert "@" not in r.text
    otra = client.post("/api/materias", json={"nombre": "Química"}).json()
    assert client.get(f"/api/materias/{otra['id']}/ranking").json() == []
    assert client.get("/api/materias/nope/ranking").status_code == 404
