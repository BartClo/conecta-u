from collections.abc import Iterator
from contextlib import contextmanager

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import TokenPayload, get_current_token
from app.models.test import Test
from app.schemas.test import TestAutorOut, TestIn, TestOut
from app.services import test_service as svc

router = APIRouter()


@contextmanager
def _http_errors() -> Iterator[None]:
    try:
        yield
    except svc.TestNoEncontrado as exc:
        raise HTTPException(status_code=404, detail="Test no encontrado") from exc
    except svc.MateriaNoEncontrada as exc:
        raise HTTPException(status_code=404, detail="Materia no encontrada") from exc
    except svc.NoAutorizado as exc:
        raise HTTPException(status_code=403, detail="Solo el autor puede hacer esto") from exc
    except svc.TestEnUso as exc:
        raise HTTPException(status_code=409, detail="El test ya tiene desafíos") from exc
    except svc.TestInvalido as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


def _out(test: Test, user_id: str) -> TestOut | TestAutorOut:
    """Solo el autor ve `es_correcta`: evita copiar respuestas durante un desafio."""
    schema = TestAutorOut if test.autor_id == user_id else TestOut
    return schema.model_validate(test, from_attributes=True)


def _payload(body: TestIn) -> dict:
    return {
        "materia_id": body.materia_id,
        "titulo": body.titulo,
        "descripcion": body.descripcion,
        "preguntas": [p.model_dump() for p in body.preguntas],
    }


@router.get("/tests", response_model=list[TestOut | TestAutorOut])
def list_tests(
    materia_id: str | None = Query(default=None),
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> list[TestOut | TestAutorOut]:
    if not materia_id:
        raise HTTPException(status_code=400, detail="materia_id es obligatorio")
    return [_out(t, token["sub"]) for t in svc.listar_por_materia(db, materia_id=materia_id)]


@router.get("/tests/{test_id}", response_model=TestOut | TestAutorOut)
def get_test(
    test_id: str,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> TestOut | TestAutorOut:
    with _http_errors():
        return _out(svc.get_test(db, test_id), token["sub"])


@router.post("/tests", response_model=TestAutorOut, status_code=201)
def create_test(
    body: TestIn,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> TestOut | TestAutorOut:
    with _http_errors():
        test = svc.crear_test(db, autor_id=token["sub"], **_payload(body))
    return _out(test, token["sub"])


@router.put("/tests/{test_id}", response_model=TestAutorOut)
def update_test(
    test_id: str,
    body: TestIn,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> TestOut | TestAutorOut:
    with _http_errors():
        test = svc.actualizar(db, user_id=token["sub"], test_id=test_id, **_payload(body))
    return _out(test, token["sub"])


@router.delete("/tests/{test_id}", status_code=204)
def delete_test(
    test_id: str,
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> None:
    with _http_errors():
        svc.borrar(db, user_id=token["sub"], test_id=test_id)
