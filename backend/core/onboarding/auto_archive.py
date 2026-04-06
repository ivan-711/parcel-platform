"""Auto-archive sample data when user creates enough real properties.

Triggers after the 3rd real (non-sample) Property is created.
"""

import logging
from uuid import UUID

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

ARCHIVE_THRESHOLD = 3  # Archive sample data after this many real properties


def check_and_archive_sample_data(db: Session, user_id: UUID) -> bool:
    """Check if user has enough real properties to auto-archive sample data.

    Returns True if archival happened, False otherwise.
    """
    from models.properties import Property
    from models.analysis_scenarios import AnalysisScenario

    # Count real (non-sample) properties
    real_count = db.query(Property).filter(
        Property.created_by == user_id,
        Property.is_sample == False,
        Property.is_deleted == False,
    ).count()

    if real_count < ARCHIVE_THRESHOLD:
        return False

    # Check if there's sample data to archive
    sample_count = db.query(Property).filter(
        Property.created_by == user_id,
        Property.is_sample == True,
        Property.is_deleted == False,
    ).count()

    if sample_count == 0:
        return False

    # Archive sample data
    db.query(AnalysisScenario).filter(
        AnalysisScenario.created_by == user_id,
        AnalysisScenario.is_sample == True,
        AnalysisScenario.is_deleted == False,
    ).update({"is_deleted": True})

    db.query(Property).filter(
        Property.created_by == user_id,
        Property.is_sample == True,
        Property.is_deleted == False,
    ).update({"is_deleted": True})

    logger.info("Auto-archived sample data for user %s (had %d real properties)", user_id, real_count)

    try:
        from core.telemetry import track_event
        track_event(user_id, "sample_data_cleared", {"trigger": "auto_archive"})
    except Exception:
        pass

    return True
