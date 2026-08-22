import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Evento(Base):
    __tablename__ = "eventos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    curso_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("cursos.id", ondelete="SET NULL"), nullable=True
    )
    titulo: Mapped[str] = mapped_column(String(150), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)
    fecha_inicio: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    fecha_fin: Mapped[datetime | None] = mapped_column(DateTime(timezone=False), nullable=True)
    recurrencia_dia_semana: Mapped[int | None] = mapped_column(Integer, nullable=True)
    recurrencia_hasta: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
