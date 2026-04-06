"""Add unique constraint on (document_id, chunk_index) to document_chunks.

Revision ID: k1f2g3h4i5j6
Revises: j0e1f2g3h4i5
Create Date: 2026-04-04
"""

from typing import Sequence, Union

from alembic import op

revision: str = "k1f2g3h4i5j6"
down_revision: Union[str, Sequence[str], None] = "j0e1f2g3h4i5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_document_chunk_index", "document_chunks", ["document_id", "chunk_index"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_document_chunk_index", "document_chunks", type_="unique")
