"""Application-level row filtering via SQLAlchemy ORM event hooks.

WARNING: This is NOT database-level PostgreSQL RLS. It only filters SELECT
queries issued through the SQLAlchemy ORM. Raw SQL queries, direct database
connections, and non-ORM operations bypass this filter entirely.

This is acceptable for Wave 0/1A since all application queries go through
SQLAlchemy ORM, but it is NOT a substitute for real security boundaries.

# TODO: Implement real PostgreSQL RLS policies (CREATE POLICY / ENABLE ROW
# LEVEL SECURITY) for defense-in-depth. This should be done in Wave 2 when
# team/multi-tenant features ship.

Usage:
    from core.security.rls import set_rls_context
    set_rls_context(db, user.id, user.team_id)

    from core.security.rls import bypass_rls
    bypass_rls(db)
"""

import logging
from typing import Optional
from uuid import UUID

from sqlalchemy import event, orm

logger = logging.getLogger(__name__)

# Session-level attribute keys for RLS context
_RLS_USER_KEY = "_rls_user_id"
_RLS_TEAM_KEY = "_rls_team_id"
_RLS_BYPASS_KEY = "_rls_bypass"

# Models that have user_id column (existing models)
_USER_ID_MODELS: set[str] = {
    "Deal", "PipelineEntry", "Document", "ChatMessage",
    "PortfolioEntry", "UsageRecord",
}

# Models that have created_by column (Wave 0 models)
_CREATED_BY_MODELS: set[str] = {
    "Property", "AnalysisScenario", "Contact", "Task",
    "Communication", "Transaction", "Report", "ImportJob",
}


def set_rls_context(
    db: orm.Session,
    user_id: UUID,
    team_id: Optional[UUID] = None,
) -> None:
    """Set the RLS context on a session so queries are automatically filtered."""
    db.info[_RLS_USER_KEY] = user_id
    db.info[_RLS_TEAM_KEY] = team_id
    db.info[_RLS_BYPASS_KEY] = False


def bypass_rls(db: orm.Session) -> None:
    """Mark a session to skip RLS filtering (for public/webhook endpoints)."""
    db.info[_RLS_BYPASS_KEY] = True


def _apply_rls_filter(execute_state):
    """SQLAlchemy do_orm_execute event listener that appends RLS filters."""
    if not execute_state.is_select:
        return

    session = execute_state.session

    # Skip if bypass is set
    if session.info.get(_RLS_BYPASS_KEY, False):
        return

    user_id = session.info.get(_RLS_USER_KEY)
    if user_id is None:
        return  # no RLS context set (e.g., startup, migrations)

    # Check each mapper entity in the statement for RLS-scoped models
    for mapper_entity in execute_state.all_mappers:
        model_name = mapper_entity.class_.__name__
        model_class = mapper_entity.class_

        if model_name in _USER_ID_MODELS:
            col = getattr(model_class, "user_id", None)
            if col is not None:
                execute_state.statement = execute_state.statement.filter(
                    col == user_id
                )
        elif model_name in _CREATED_BY_MODELS:
            col = getattr(model_class, "created_by", None)
            if col is not None:
                execute_state.statement = execute_state.statement.filter(
                    col == user_id
                )


def register_rls_listener(session_factory: orm.sessionmaker) -> None:
    """Register the RLS event listener on a session factory.

    Call this once during app startup:
        from core.security.rls import register_rls_listener
        register_rls_listener(SessionLocal)
    """
    event.listen(session_factory, "do_orm_execute", _apply_rls_filter)
    logger.info("RLS enforcement listener registered")
