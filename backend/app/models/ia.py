import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class GeneracionIA(Base):
    """Auditoria de cada llamada a la IA (ok o error)."""

    __tablename__ = "generaciones_ia"
    __table_args__ = (Index("ix_generaciones_ia_user_created", "user_id", "created_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(10), nullable=False)
    costo_creditos: Mapped[int] = mapped_column(Integer, nullable=False)
    prompt_input: Mapped[str] = mapped_column(Text, nullable=False)
    resultado_ref_tipo: Mapped[str | None] = mapped_column(String(20), nullable=True)
    resultado_ref_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    estado: Mapped[str] = mapped_column(String(10), nullable=False)
    error_msg: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Resumen(Base):
    __tablename__ = "resumenes"
    __table_args__ = (Index("ix_resumenes_user_created", "user_id", "created_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    materia_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("materias.id"), nullable=True
    )
    titulo: Mapped[str] = mapped_column(String(150), nullable=False)
    contenido_fuente: Mapped[str] = mapped_column(Text, nullable=False)
    contenido_resumen: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
