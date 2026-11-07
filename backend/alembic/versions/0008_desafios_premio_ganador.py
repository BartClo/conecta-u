"""add premio_acreditado and ganador_user_id to desafios

Revision ID: 0008
Revises: 0007
Create Date: 2026-11-07
"""

import sqlalchemy as sa

from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("desafios") as batch:
        batch.add_column(
            sa.Column("premio_acreditado", sa.Boolean(), nullable=False, server_default=sa.false())
        )
        batch.add_column(sa.Column("ganador_user_id", sa.String(36), nullable=True))
        batch.create_foreign_key(
            "fk_desafios_ganador_user_id_users", "users", ["ganador_user_id"], ["id"]
        )


def downgrade() -> None:
    with op.batch_alter_table("desafios") as batch:
        batch.drop_constraint("fk_desafios_ganador_user_id_users", type_="foreignkey")
        batch.drop_column("ganador_user_id")
        batch.drop_column("premio_acreditado")
