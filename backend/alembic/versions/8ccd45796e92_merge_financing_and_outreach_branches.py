"""merge financing and outreach branches

Revision ID: 8ccd45796e92
Revises: l2g3h4i5j6k7, s9t0u1v2w3x4
Create Date: 2026-04-05 17:59:50.524378

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8ccd45796e92'
down_revision: Union[str, Sequence[str], None] = ('l2g3h4i5j6k7', 's9t0u1v2w3x4')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
