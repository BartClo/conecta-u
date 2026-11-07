from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.economia import BONO_INICIAL, MOTIVO_BONO_INICIAL, MOTIVOS_CREDITO
from app.models.credito import CuentaCredito, MovimientoCredito
from app.repositories import credito_repository as repo

# Ninguna función de este módulo hace commit: hacen flush y el commit (o
# rollback) es del caller, para que B4/D las usen dentro de su transacción.


class SaldoInsuficienteError(Exception):
    pass


def obtener_o_crear_cuenta(db: Session, user_id: str) -> CuentaCredito:
    cuenta = repo.get_cuenta(db, user_id)
    if cuenta:
        return cuenta
    try:
        # SAVEPOINT: una creación concurrente (unique user_id) no tira la transacción externa.
        with db.begin_nested():
            cuenta = CuentaCredito(user_id=user_id, saldo=BONO_INICIAL)
            db.add(cuenta)
            db.add(
                MovimientoCredito(
                    user_id=user_id,
                    delta=BONO_INICIAL,
                    motivo=MOTIVO_BONO_INICIAL,
                    saldo_resultante=BONO_INICIAL,
                )
            )
            db.flush()
    except IntegrityError:
        cuenta = repo.get_cuenta(db, user_id)
        if cuenta is None:  # no fue una carrera (p. ej. FK de usuario inexistente)
            raise
    return cuenta


def verificar_saldo(db: Session, user_id: str, monto: int) -> bool:
    return obtener_o_crear_cuenta(db, user_id).saldo >= monto


def _existente(
    db: Session, motivo: str, ref_tipo: str | None, ref_id: str | None
) -> MovimientoCredito | None:
    if ref_tipo is None or ref_id is None:
        return None
    return repo.get_por_ref(db, ref_tipo, ref_id, motivo)


def _aplicar(
    db: Session,
    user_id: str,
    delta: int,
    motivo: str,
    ref_tipo: str | None,
    ref_id: str | None,
) -> MovimientoCredito:
    if motivo not in MOTIVOS_CREDITO:
        raise ValueError(f"motivo inválido: {motivo}")
    obtener_o_crear_cuenta(db, user_id)
    cuenta = repo.get_cuenta(db, user_id, lock=True)  # FOR UPDATE: serializa por usuario
    previo = _existente(db, motivo, ref_tipo, ref_id)
    if previo:
        return previo
    if cuenta.saldo + delta < 0:
        raise SaldoInsuficienteError()
    try:
        with db.begin_nested():
            cuenta.saldo += delta
            mov = MovimientoCredito(
                user_id=user_id,
                delta=delta,
                motivo=motivo,
                ref_tipo=ref_tipo,
                ref_id=ref_id,
                saldo_resultante=cuenta.saldo,
            )
            db.add(mov)
            db.flush()
    except IntegrityError:
        # El savepoint revirtió saldo y movimiento; si es duplicado de ref, es idempotente.
        previo = _existente(db, motivo, ref_tipo, ref_id)
        if previo is None:
            raise
        return previo
    return mov


def ganar(
    db: Session,
    user_id: str,
    monto: int,
    motivo: str,
    ref_tipo: str | None = None,
    ref_id: str | None = None,
) -> MovimientoCredito:
    if monto <= 0:
        raise ValueError("monto debe ser mayor que 0")
    return _aplicar(db, user_id, monto, motivo, ref_tipo, ref_id)


def gastar(
    db: Session,
    user_id: str,
    monto: int,
    motivo: str,
    ref_tipo: str | None = None,
    ref_id: str | None = None,
) -> MovimientoCredito:
    if monto <= 0:
        raise ValueError("monto debe ser mayor que 0")
    return _aplicar(db, user_id, -monto, motivo, ref_tipo, ref_id)
