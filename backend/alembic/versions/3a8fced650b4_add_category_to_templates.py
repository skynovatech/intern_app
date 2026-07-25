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
    op.add_column('email_templates', sa.Column('category', sa.String(length=50), nullable=True, index=True))
    op.add_column('whatsapp_templates', sa.Column('category', sa.String(length=50), nullable=True, index=True))


def downgrade() -> None:
    op.drop_column('whatsapp_templates', 'category')
    op.drop_column('email_templates', 'category')
