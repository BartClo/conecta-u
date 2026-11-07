import logging
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.economia import (
    COSTO_RESUMEN_IA,
    COSTO_TEST_IA,
    MOTIVO_GENERO_RESUMEN_IA,
    MOTIVO_GENERO_TEST_IA,
)
from app.core.origenes_test import ORIGEN_IA
from app.core.tipos_generacion_ia import ESTADO_ERROR, ESTADO_OK, TIPO_RESUMEN, TIPO_TEST
from app.models.ia import GeneracionIA, Resumen
from app.models.test import Test
from app.repositories import ia_repository as repo
from app.services import creditos_service, materia_service, test_service
from app.services.creditos_service import SaldoInsuficienteError
from app.services.ia.llm_provider import LLMProvider, LLMProviderError, TestGenerado
from app.services.test_service import MAX_OPCION, MAX_TITULO, MateriaNoEncontrada

logger = logging.getLogger(__name__)

__all__ = ["MateriaNoEncontrada", "SaldoInsuficienteError", "LLMProviderError"]


class RespuestaIAInvalidaError(LLMProviderError):
    pass


class ResumenNoEncontrado(Exception):
    pass


@dataclass
class Generado:
    objeto: Test | Resumen
    costo_creditos: int
    saldo_restante: int


def _validar_test(gen: TestGenerado, n_preguntas: int) -> None:
    if "\x00" in gen.titulo or any(
        "\x00" in t for p in gen.preguntas for t in [p.enunciado, *p.opciones]
    ):
        raise RespuestaIAInvalidaError("caracteres inválidos en la respuesta de la IA")
    titulo = gen.titulo.strip()
    if not titulo or len(titulo) > MAX_TITULO:
        raise RespuestaIAInvalidaError("título inválido en la respuesta de la IA")
    if len(gen.preguntas) != n_preguntas:
        raise RespuestaIAInvalidaError("cantidad de preguntas incorrecta")
    for p in gen.preguntas:
        textos = [o.strip() for o in p.opciones]
        if not p.enunciado.strip() or not 2 <= len(textos) <= 6:
            raise RespuestaIAInvalidaError("pregunta inválida en la respuesta de la IA")
        if any(not t or len(t) > MAX_OPCION for t in textos):
            raise RespuestaIAInvalidaError("opción inválida en la respuesta de la IA")
        if not 0 <= p.indice_correcta < len(textos):
            raise RespuestaIAInvalidaError("opción correcta fuera de rango")


def _a_preguntas(gen: TestGenerado) -> list[dict]:
    return [
        {
            "enunciado": p.enunciado,
            "opciones": [
                {"texto": o, "es_correcta": i == p.indice_correcta}
                for i, o in enumerate(p.opciones)
            ],
        }
        for p in gen.preguntas
    ]


def _registrar_error(db: Session, user_id: str, tipo: str, prompt: str, msg: str) -> None:
    """Transaccion propia, tras el rollback: la auditoria no depende del cobro."""
    logger.warning("generacion IA fallida (%s): %s", tipo, msg)
    repo.add(
        db,
        GeneracionIA(
            user_id=user_id,
            tipo=tipo,
            costo_creditos=0,
            prompt_input=prompt,
            estado=ESTADO_ERROR,
            error_msg=msg,
        ),
    )
    db.commit()


def _exigir_saldo(db: Session, user_id: str, costo: int) -> None:
    if not creditos_service.verificar_saldo(db, user_id, costo):
        raise SaldoInsuficienteError()
    db.commit()  # persiste la cuenta lazy y libera la conexion antes de la red


def _llamar(db: Session, user_id: str, tipo: str, prompt: str, fn):
    """Llama al proveedor sin transaccion abierta; un fallo queda auditado y sin cobro."""
    try:
        return fn()
    except LLMProviderError as exc:
        _registrar_error(db, user_id, tipo, prompt, str(exc))
        raise


def _cobrar(db: Session, user_id: str, tipo: str, prompt: str, costo: int, crear) -> Generado:
    """UNA transaccion: contenido + cobro + auditoria, todo o nada."""
    motivo = MOTIVO_GENERO_TEST_IA if tipo == TIPO_TEST else MOTIVO_GENERO_RESUMEN_IA
    try:
        obj = crear()
        mov = creditos_service.gastar(db, user_id, costo, motivo, tipo, obj.id)
        repo.add(
            db,
            GeneracionIA(
                user_id=user_id,
                tipo=tipo,
                costo_creditos=costo,
                prompt_input=prompt,
                resultado_ref_tipo=tipo,
                resultado_ref_id=obj.id,
                estado=ESTADO_OK,
            ),
        )
        db.commit()
    except SaldoInsuficienteError:
        db.rollback()
        _registrar_error(db, user_id, tipo, prompt, "saldo insuficiente")
        raise
    except Exception:
        db.rollback()
        try:
            _registrar_error(db, user_id, tipo, prompt, "error interno al guardar")
        except Exception:
            db.rollback()
            logger.exception("no se pudo auditar el error interno")
        raise
    return Generado(obj, costo, mov.saldo_resultante)


def generar_test_con_ia(
    db: Session,
    provider: LLMProvider,
    *,
    user_id: str,
    materia_id: str,
    tema: str | None,
    texto_fuente: str | None,
    n_preguntas: int,
) -> Generado:
    if materia_service.get_materia(db, materia_id) is None:
        raise MateriaNoEncontrada()
    prompt = "\n\n".join(x.strip() for x in (tema, texto_fuente) if x and x.strip())
    _exigir_saldo(db, user_id, COSTO_TEST_IA)
    gen = _llamar(
        db, user_id, TIPO_TEST, prompt, lambda: provider.generar_test(prompt, n_preguntas)
    )
    try:
        _validar_test(gen, n_preguntas)
    except RespuestaIAInvalidaError as exc:
        _registrar_error(db, user_id, TIPO_TEST, prompt, str(exc))
        raise

    def crear() -> Test:
        return test_service.crear_test_sin_commit(
            db,
            autor_id=user_id,
            materia_id=materia_id,
            titulo=gen.titulo,
            descripcion=None,
            preguntas=_a_preguntas(gen),
            origen=ORIGEN_IA,
        )

    return _cobrar(db, user_id, TIPO_TEST, prompt, COSTO_TEST_IA, crear)


def generar_resumen_con_ia(
    db: Session,
    provider: LLMProvider,
    *,
    user_id: str,
    texto_fuente: str,
    materia_id: str | None,
    titulo: str | None,
) -> Generado:
    if materia_id and materia_service.get_materia(db, materia_id) is None:
        raise MateriaNoEncontrada()
    _exigir_saldo(db, user_id, COSTO_RESUMEN_IA)
    texto = _llamar(
        db,
        user_id,
        TIPO_RESUMEN,
        texto_fuente,
        lambda: provider.generar_resumen(texto_fuente),
    ).strip()
    if not texto or "\x00" in texto:
        msg = "resumen vacío" if not texto else "caracteres inválidos en la respuesta de la IA"
        _registrar_error(db, user_id, TIPO_RESUMEN, texto_fuente, msg)
        raise RespuestaIAInvalidaError(msg)

    def crear() -> Resumen:
        resumen = Resumen(
            user_id=user_id,
            materia_id=materia_id,
            titulo=(titulo or "").strip() or texto_fuente.strip()[:60],
            contenido_fuente=texto_fuente,
            contenido_resumen=texto,
        )
        repo.add(db, resumen)
        return resumen

    return _cobrar(db, user_id, TIPO_RESUMEN, texto_fuente, COSTO_RESUMEN_IA, crear)


def listar_resumenes(db: Session, user_id: str) -> list[Resumen]:
    return repo.listar_resumenes(db, user_id)


def get_resumen(db: Session, user_id: str, resumen_id: str) -> Resumen:
    resumen = repo.get_resumen(db, resumen_id, user_id)
    if resumen is None:
        raise ResumenNoEncontrado()
    return resumen
