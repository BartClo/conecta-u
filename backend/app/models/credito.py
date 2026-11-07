import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

_REF_PRESENTE = text("ref_tipo IS NOT NULL AND ref_id IS NOT NULL")


class CuentaCredito(Base):
    __tablename__ = "cuentas_credito"
    __table_args__ = (CheckConstraint("saldo >= 0", name="ck_cuenta_credito_saldo_no_negativo"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, unique=True
    )
    saldo: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class MovimientoCredito(Base):
    __tablename__ = "movimientos_credito"
    __table_args__ = (
        Index("ix_movimientos_credito_user_created", "user_id", "created_at"),
        Index(
            "uq_movimientos_credito_ref_motivo",
            "ref_tipo",
            "ref_id",
            "motivo",
            unique=True,
            postgresql_where=_REF_PRESENTE,
            sqlite_where=_REF_PRESENTE,
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    delta: Mapped[int] = mapped_column(Integer, nullable=False)
    motivo: Mapped[str] = mapped_column(String(30), nullable=False)
    ref_tipo: Mapped[str | None] = mapped_column(String(30), nullable=True)
    ref_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    saldo_resultante: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
