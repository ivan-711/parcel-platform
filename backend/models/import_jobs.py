"""ImportJob model — tracks bulk data imports and migrations."""

from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID

from database import Base
from models.base import TimestampMixin


class ImportJob(TimestampMixin, Base):
    """Tracks progress and errors for CSV imports, legacy migrations, etc."""

    __tablename__ = "import_jobs"

    created_by = Column(UUID(as_uuid=True), nullable=False, index=True)

    source_type = Column(String, nullable=False)
    # csv_upload | legacy_migration | resimpli_import | propstream_import

    file_url = Column(String, nullable=True)

    total_rows = Column(Integer, nullable=True)
    processed_rows = Column(Integer, default=0, nullable=False)
    success_rows = Column(Integer, default=0, nullable=False)
    error_rows = Column(Integer, default=0, nullable=False)

    status = Column(String, default="pending", nullable=False)
    # pending | processing | completed | failed
    errors = Column(JSONB, nullable=True)  # [{row, field, error}]

    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
