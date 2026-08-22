"""create eventos table

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-22
"""

import sqlalchemy as sa

from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "eventos",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "curso_id",
            sa.String(36),
            sa.ForeignKey("cursos.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("titulo", sa.String(150), nullable=False),
        sa.Column("descripcion", sa.String(1000), nullable=True),
        sa.Column("tipo", sa.String(20), nullable=False),
        sa.Column("fecha_inicio", sa.DateTime(), nullable=False),
        sa.Column("fecha_fin", sa.DateTime(), nullable=True),
        sa.Column("recurrencia_dia_semana", sa.Integer(), nullable=True),
        sa.Column("recurrencia_hasta", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("eventos")
