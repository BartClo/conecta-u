from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import TokenPayload, get_current_token
from app.repositories import credito_repository as repo
from app.schemas.credito import MovimientosOut, SaldoOut
from app.services import creditos_service as svc

router = APIRouter()


@router.get("/creditos/saldo", response_model=SaldoOut)
def get_saldo(
    token: TokenPayload = Depends(get_current_token), db: Session = Depends(get_db)
) -> SaldoOut:
    cuenta = svc.obtener_o_crear_cuenta(db, token["sub"])
    db.commit()  # el service solo hace flush
    return SaldoOut(saldo=cuenta.saldo)


@router.get("/creditos/movimientos", response_model=MovimientosOut)
def get_movimientos(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> MovimientosOut:
    items, total = repo.listar_movimientos(db, token["sub"], limit, offset)
    return MovimientosOut(items=items, limit=limit, offset=offset, total=total)
