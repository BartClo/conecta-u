"""create tests, preguntas and opciones tables

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-07
"""

import sqlalchemy as sa

from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    ]


def upgrade() -> None:
    op.create_table(
        "tests",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("materia_id", sa.String(36), sa.ForeignKey("materias.id"), nullable=False),
        sa.Column("titulo", sa.String(150), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("autor_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("origen", sa.String(10), nullable=False),
        *_timestamps(),
    )
    op.create_index("ix_tests_materia_id", "tests", ["materia_id"])
    op.create_table(
        "preguntas",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "test_id", sa.String(36), sa.ForeignKey("tests.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("enunciado", sa.Text(), nullable=False),
        sa.Column("orden", sa.Integer(), nullable=False),
        *_timestamps(),
    )
    op.create_index("ix_preguntas_test_id", "preguntas", ["test_id"])
    op.create_table(
        "opciones",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "pregunta_id",
            sa.String(36),
            sa.ForeignKey("preguntas.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("texto", sa.String(500), nullable=False),
        sa.Column("es_correcta", sa.Boolean(), nullable=False),
        sa.Column("orden", sa.Integer(), nullable=False),
        *_timestamps(),
    )
    op.create_index("ix_opciones_pregunta_id", "opciones", ["pregunta_id"])


def downgrade() -> None:
    op.drop_table("opciones")
    op.drop_table("preguntas")
    op.drop_table("tests")
