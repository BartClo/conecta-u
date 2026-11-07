"""create generaciones_ia and resumenes

Revision ID: 0009
Revises: 0008
Create Date: 2026-11-07
"""

import sqlalchemy as sa

from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    ]


def upgrade() -> None:
    op.create_table(
        "generaciones_ia",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("tipo", sa.String(10), nullable=False),
        sa.Column("costo_creditos", sa.Integer(), nullable=False),
        sa.Column("prompt_input", sa.Text(), nullable=False),
        sa.Column("resultado_ref_tipo", sa.String(20), nullable=True),
        sa.Column("resultado_ref_id", sa.String(36), nullable=True),
        sa.Column("estado", sa.String(10), nullable=False),
        sa.Column("error_msg", sa.Text(), nullable=True),
        *_timestamps(),
    )
    op.create_index("ix_generaciones_ia_user_created", "generaciones_ia", ["user_id", "created_at"])
    op.create_table(
        "resumenes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("materia_id", sa.String(36), sa.ForeignKey("materias.id"), nullable=True),
        sa.Column("titulo", sa.String(150), nullable=False),
        sa.Column("contenido_fuente", sa.Text(), nullable=False),
        sa.Column("contenido_resumen", sa.Text(), nullable=False),
        *_timestamps(),
    )
    op.create_index("ix_resumenes_user_created", "resumenes", ["user_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_resumenes_user_created", table_name="resumenes")
    op.drop_table("resumenes")
    op.drop_index("ix_generaciones_ia_user_created", table_name="generaciones_ia")
    op.drop_table("generaciones_ia")
