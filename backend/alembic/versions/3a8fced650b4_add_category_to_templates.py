"""add_category_to_templates

Revision ID: 3a8fced650b4
Revises: 2f8ced6505b3
Create Date: 2026-07-23 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3a8fced650b4'
down_revision: Union[str, None] = '2f8ced6505b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    email_columns = {column["name"] for column in sa.inspect(bind).get_columns("email_templates")}
    whatsapp_columns = {column["name"] for column in sa.inspect(bind).get_columns("whatsapp_templates")}
    if "category" not in email_columns:
        op.add_column("email_templates", sa.Column("category", sa.String(length=50), nullable=True))
    if "category" not in whatsapp_columns:
        op.add_column("whatsapp_templates", sa.Column("category", sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column('whatsapp_templates', 'category')
    op.drop_column('email_templates', 'category')
