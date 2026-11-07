"""create desafios, intentos and respuestas_intento tables

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-07
"""

import sqlalchemy as sa

from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    ]


def upgrade() -> None:
    op.create_table(
        "desafios",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "grupo_id",
            sa.String(36),
            sa.ForeignKey("grupos.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("test_id", sa.String(36), sa.ForeignKey("tests.id"), nullable=False),
        sa.Column("creado_por", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "fecha_inicio", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("fecha_fin", sa.DateTime(timezone=True), nullable=True),
        sa.Column("estado", sa.String(10), nullable=False),
        *_timestamps(),
    )
    op.create_index("ix_desafios_grupo_id", "desafios", ["grupo_id"])
    op.create_index("ix_desafios_test_id", "desafios", ["test_id"])
    op.create_table(
        "intentos",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "desafio_id",
            sa.String(36),
            sa.ForeignKey("desafios.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("puntaje", sa.Integer(), nullable=False),
        sa.Column("total", sa.Integer(), nullable=False),
        sa.Column("segundos", sa.Integer(), nullable=False),
        sa.Column(
            "finalizado_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        *_timestamps(),
        sa.UniqueConstraint("desafio_id", "user_id", name="uq_intento_desafio_user"),
    )
    op.create_index("ix_intentos_desafio_id", "intentos", ["desafio_id"])
    op.create_table(
        "respuestas_intento",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "intento_id",
            sa.String(36),
            sa.ForeignKey("intentos.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("pregunta_id", sa.String(36), sa.ForeignKey("preguntas.id"), nullable=False),
        sa.Column("opcion_id", sa.String(36), sa.ForeignKey("opciones.id"), nullable=False),
        *_timestamps(),
    )
    op.create_index("ix_respuestas_intento_intento_id", "respuestas_intento", ["intento_id"])


def downgrade() -> None:
    op.drop_table("respuestas_intento")
    op.drop_table("intentos")
    op.drop_table("desafios")
