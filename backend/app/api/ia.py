from collections.abc import Iterator
from contextlib import contextmanager

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import TokenPayload, get_current_token
from app.schemas.ia import (
    GeneracionResumenOut,
    GeneracionTestOut,
    GenerarResumenIn,
    GenerarTestIn,
    ResumenOut,
)
from app.services import ia_service as svc
from app.services.ia.factory import get_llm_provider
from app.services.ia.llm_provider import LLMProvider

router = APIRouter()


@contextmanager
def _http_errors() -> Iterator[None]:
    try:
        yield
    except svc.MateriaNoEncontrada as exc:
        raise HTTPException(status_code=404, detail="Materia no encontrada") from exc
    except svc.ResumenNoEncontrado as exc:
        raise HTTPException(status_code=404, detail="Resumen no encontrado") from exc
    except svc.SaldoInsuficienteError as exc:
        raise HTTPException(status_code=402, detail="Créditos insuficientes") from exc
    except svc.LLMProviderError as exc:
        raise HTTPException(status_code=502, detail=f"No se pudo generar: {exc}") from exc


# `def` (no `async def`): provider y sesion SQLAlchemy son sincronos y FastAPI corre
# estos endpoints en threadpool, asi que la red/DB no bloquea el event loop.
@router.post("/ia/tests", response_model=GeneracionTestOut, status_code=201)
def generar_test(
    body: GenerarTestIn,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
    provider: LLMProvider = Depends(get_llm_provider),
) -> GeneracionTestOut:
    with _http_errors():
        r = svc.generar_test_con_ia(
            db,
            provider,
            user_id=token["sub"],
            materia_id=body.materia_id,
            tema=body.tema,
            texto_fuente=body.texto_fuente,
            n_preguntas=body.n_preguntas,
        )
    return GeneracionTestOut.model_validate(
        {"test": r.objeto, "costo_creditos": r.costo_creditos, "saldo_restante": r.saldo_restante},
        from_attributes=True,
    )


@router.post("/ia/resumenes", response_model=GeneracionResumenOut, status_code=201)
def generar_resumen(
    body: GenerarResumenIn,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
    provider: LLMProvider = Depends(get_llm_provider),
) -> GeneracionResumenOut:
    with _http_errors():
        r = svc.generar_resumen_con_ia(
            db,
            provider,
            user_id=token["sub"],
            texto_fuente=body.texto_fuente,
            materia_id=body.materia_id,
            titulo=body.titulo,
        )
    return GeneracionResumenOut.model_validate(
        {
            "resumen": r.objeto,
            "costo_creditos": r.costo_creditos,
            "saldo_restante": r.saldo_restante,
        },
        from_attributes=True,
    )


@router.get("/ia/resumenes", response_model=list[ResumenOut])
def list_resumenes(
    token: TokenPayload = Depends(get_current_token), db: Session = Depends(get_db)
) -> list:
    return svc.listar_resumenes(db, token["sub"])


@router.get("/ia/resumenes/{resumen_id}", response_model=ResumenOut)
def get_resumen(
    resumen_id: str,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
):
    with _http_errors():
        return svc.get_resumen(db, token["sub"], resumen_id)
