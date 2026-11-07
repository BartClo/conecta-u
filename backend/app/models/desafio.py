import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint, false, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.estados_desafio import ESTADO_ABIERTO


class Desafio(Base):
    __tablename__ = "desafios"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    grupo_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("grupos.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Sin cascade: un test con desafios no se puede editar ni borrar (409 en test_service).
    test_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tests.id"), nullable=False, index=True
    )
    creado_por: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    fecha_inicio: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    fecha_fin: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    estado: Mapped[str] = mapped_column(String(10), nullable=False, default=ESTADO_ABIERTO)
    premio_acreditado: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=false()
    )
    ganador_user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Intento(Base):
    __tablename__ = "intentos"
    __table_args__ = (UniqueConstraint("desafio_id", "user_id", name="uq_intento_desafio_user"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    desafio_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("desafios.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    puntaje: Mapped[int] = mapped_column(Integer, nullable=False)
    total: Mapped[int] = mapped_column(Integer, nullable=False)
    segundos: Mapped[int] = mapped_column(Integer, nullable=False)
    finalizado_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    respuestas: Mapped[list["RespuestaIntento"]] = relationship(cascade="all, delete-orphan")


class RespuestaIntento(Base):
    __tablename__ = "respuestas_intento"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    intento_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("intentos.id", ondelete="CASCADE"), nullable=False, index=True
    )
    pregunta_id: Mapped[str] = mapped_column(String(36), ForeignKey("preguntas.id"), nullable=False)
    opcion_id: Mapped[str] = mapped_column(String(36), ForeignKey("opciones.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
