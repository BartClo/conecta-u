from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.credito import CuentaCredito, MovimientoCredito


def get_cuenta(db: Session, user_id: str, *, lock: bool = False) -> CuentaCredito | None:
    stmt = select(CuentaCredito).where(CuentaCredito.user_id == user_id)
    if lock:
        # populate_existing: tras esperar el lock, leer el saldo ya commiteado por el otro
        stmt = stmt.with_for_update().execution_options(populate_existing=True)
    return db.scalar(stmt)


def get_por_ref(db: Session, ref_tipo: str, ref_id: str, motivo: str) -> MovimientoCredito | None:
    return db.scalar(
        select(MovimientoCredito).where(
            MovimientoCredito.ref_tipo == ref_tipo,
            MovimientoCredito.ref_id == ref_id,
            MovimientoCredito.motivo == motivo,
        )
    )


def listar_movimientos(
    db: Session, user_id: str, limit: int, offset: int
) -> tuple[list[MovimientoCredito], int]:
    total = db.scalar(
        select(func.count())
        .select_from(MovimientoCredito)
        .where(MovimientoCredito.user_id == user_id)
    )
    items = db.scalars(
        select(MovimientoCredito)
        .where(MovimientoCredito.user_id == user_id)
        .order_by(MovimientoCredito.created_at.desc(), MovimientoCredito.id.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    return list(items), total or 0
