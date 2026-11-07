"""create cuentas_credito and movimientos_credito tables

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-07
"""

import sqlalchemy as sa

from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    ]


def upgrade() -> None:
    op.create_table(
        "cuentas_credito",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False, unique=True),
        sa.Column("saldo", sa.Integer(), nullable=False),
        *_timestamps(),
        sa.CheckConstraint("saldo >= 0", name="ck_cuenta_credito_saldo_no_negativo"),
    )
    op.create_table(
        "movimientos_credito",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("delta", sa.Integer(), nullable=False),
        sa.Column("motivo", sa.String(30), nullable=False),
        sa.Column("ref_tipo", sa.String(30), nullable=True),
        sa.Column("ref_id", sa.String(36), nullable=True),
        sa.Column("saldo_resultante", sa.Integer(), nullable=False),
        *_timestamps(),
    )
    op.create_index(
        "ix_movimientos_credito_user_created", "movimientos_credito", ["user_id", "created_at"]
    )
    where = sa.text("ref_tipo IS NOT NULL AND ref_id IS NOT NULL")
    op.create_index(
        "uq_movimientos_credito_ref_motivo",
        "movimientos_credito",
        ["ref_tipo", "ref_id", "motivo"],
        unique=True,
        postgresql_where=where,
        sqlite_where=where,
    )


def downgrade() -> None:
    op.drop_table("movimientos_credito")
    op.drop_table("cuentas_credito")
