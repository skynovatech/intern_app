"""sync application columns with the current ORM model

Revision ID: 4b7d2c1a9e6f
Revises: 3a8fced650b4
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "4b7d2c1a9e6f"
down_revision: Union[str, None] = "3a8fced650b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    existing = {
        column["name"]
        for column in sa.inspect(bind).get_columns("applications")
    }

    # These columns are nullable in the ORM, so adding them does not require
    # changing or backfilling existing application records.
    columns = {
        "soft_skills": sa.Column("soft_skills", sa.JSON(), nullable=True),
        "certifications": sa.Column("certifications", sa.Text(), nullable=True),
        "employee_id": sa.Column("employee_id", sa.String(length=50), nullable=True),
        "created_at": sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        "updated_at": sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
    }

    for name, column in columns.items():
        if name not in existing:
            op.add_column("applications", column)


def downgrade() -> None:
    bind = op.get_bind()
    existing = {
        column["name"]
        for column in sa.inspect(bind).get_columns("applications")
    }
    for name in ("updated_at", "created_at", "employee_id", "certifications", "soft_skills"):
        if name in existing:
            op.drop_column("applications", name)
