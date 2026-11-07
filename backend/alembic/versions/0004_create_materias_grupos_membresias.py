"""create materias, grupos and membresias tables

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-07
"""

import sqlalchemy as sa

from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    ]


def upgrade() -> None:
    op.create_table(
        "materias",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("nombre", sa.String(120), nullable=False),
        sa.Column("nombre_normalizado", sa.String(120), nullable=False, unique=True),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        *_timestamps(),
    )
    op.create_table(
        "grupos",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("nombre", sa.String(120), nullable=False),
        sa.Column("materia_id", sa.String(36), sa.ForeignKey("materias.id"), nullable=False),
        sa.Column("owner_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("codigo_invitacion", sa.String(8), nullable=False, unique=True),
        *_timestamps(),
    )
    op.create_table(
        "membresias",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "grupo_id",
            sa.String(36),
            sa.ForeignKey("grupos.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("rol", sa.String(10), nullable=False),
        *_timestamps(),
        sa.UniqueConstraint("grupo_id", "user_id", name="uq_membresia_grupo_user"),
    )


def downgrade() -> None:
    op.drop_table("membresias")
    op.drop_table("grupos")
    op.drop_table("materias")
