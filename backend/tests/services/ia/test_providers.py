import json
from types import SimpleNamespace
from unittest.mock import MagicMock

import anthropic
import httpx2 as httpx
import pytest

from app.core.config import Settings
from app.services.ia import factory
from app.services.ia.claude_provider import ClaudeProvider
from app.services.ia.fake_provider import FakeLLMProvider
from app.services.ia.llm_provider import LLMProviderError

REQ = httpx.Request("POST", "http://x")
OK = {
    "titulo": "T",
    "preguntas": [{"enunciado": "q", "opciones": ["a", "b"], "indice_correcta": 1}],
}


def _resp(text, stop="end_turn"):
    return SimpleNamespace(stop_reason=stop, content=[SimpleNamespace(type="text", text=text)])


def _provider(resp=None, exc=None):
    client = MagicMock()
    create = client.with_options.return_value.messages.create
    if exc:
        create.side_effect = exc
    else:
        create.return_value = resp
    return ClaudeProvider(client, "m"), create


def test_generar_test_parsea_json_y_pide_formato_estructurado():
    p, create = _provider(_resp(json.dumps(OK)))
    t = p.generar_test("tema", 1)
    assert t.preguntas[0].indice_correcta == 1
    fmt = create.call_args.kwargs["output_config"]["format"]
    assert fmt["type"] == "json_schema"
    assert create.call_args.kwargs["model"] == "m"


def test_generar_resumen_devuelve_texto():
    p, _ = _provider(_resp("  listo  "))
    assert p.generar_resumen("x") == "listo"


@pytest.mark.parametrize(
    "resp",
    [
        _resp("no es json"),
        _resp('{"titulo": 1}'),
        _resp(""),
        _resp("{}", "refusal"),
        _resp("{}", "max_tokens"),
    ],
)
def test_respuestas_inutilizables_son_error_del_proveedor(resp):
    p, _ = _provider(resp)
    with pytest.raises(LLMProviderError):
        p.generar_test("t", 1)


@pytest.mark.parametrize(
    ("exc", "msg"),
    [
        (anthropic.APITimeoutError(REQ), "timeout"),
        (
            anthropic.APIStatusError(
                "boom secreto", response=httpx.Response(500, request=REQ), body=None
            ),
            "HTTP 500",
        ),
        (anthropic.APIConnectionError(request=REQ), "conectar"),
    ],
)
def test_errores_del_sdk_se_envuelven_sin_filtrar_el_mensaje_crudo(exc, msg):
    p, _ = _provider(exc=exc)
    with pytest.raises(LLMProviderError, match=msg) as e:
        p.generar_resumen("x")
    assert "secreto" not in str(e.value)


def test_fake_es_determinista_y_falla_con_la_marca():
    f = FakeLLMProvider()
    assert f.generar_test("algo", 3) == f.generar_test("algo", 3)
    assert len(f.generar_test("algo", 3).preguntas) == 3
    assert f.generar_resumen("hola").startswith("Resumen")
    with pytest.raises(LLMProviderError):
        f.generar_test("x __fallar__", 1)


def _settings(monkeypatch, **kw):
    monkeypatch.setattr(factory, "get_settings", lambda: Settings(**kw))


def test_factory_fake_claude_y_sin_clave(monkeypatch):
    _settings(monkeypatch, llm_provider="fake")
    assert isinstance(factory.get_llm_provider(), FakeLLMProvider)
    _settings(monkeypatch, llm_provider="claude", anthropic_api_key="sk-x")
    assert isinstance(factory.get_llm_provider(), ClaudeProvider)
    _settings(monkeypatch, llm_provider="claude")
    sin = factory.get_llm_provider()
    with pytest.raises(LLMProviderError, match="IA no configurada"):
        sin.generar_test("t", 1)
    with pytest.raises(LLMProviderError, match="IA no configurada"):
        sin.generar_resumen("t")
