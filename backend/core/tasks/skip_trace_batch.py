"""Dramatiq actor for processing skip trace batches."""

import logging
import time

logger = logging.getLogger(__name__)

try:
    import dramatiq
except ImportError:
    dramatiq = None


def _noop_send(*args, **kwargs):
    from core.tasks import WorkerUnavailableError
    raise WorkerUnavailableError("Background worker is not available. Batch skip tracing requires Redis.")


if dramatiq:

    @dramatiq.actor(max_retries=2, min_backoff=10000)
    def process_skip_trace_batch(batch_id: str, user_id: str, auto_create: bool = False):
        """Process a batch of skip traces."""
        from database import SessionLocal
        from core.skip_tracing.batchdata_provider import BatchDataProvider
        from core.skip_tracing.service import SkipTraceService
        from models.skip_traces import SkipTrace

        db = SessionLocal()
        try:
            from core.security.rls import set_rls_context
            from uuid import UUID as _UUID
            set_rls_context(db, _UUID(user_id))

            provider = BatchDataProvider()
            service = SkipTraceService(db, provider)

            # H1: Clean up stale "processing" rows stuck for more than 10 minutes
            from datetime import datetime, timedelta
            stale_cutoff = datetime.utcnow() - timedelta(minutes=10)
            stale = db.query(SkipTrace).filter(
                SkipTrace.batch_id == batch_id,
                SkipTrace.status == "processing",
                SkipTrace.updated_at < stale_cutoff,
            ).all()
            for row in stale:
                row.status = "failed"
                row.error = "Processing timeout — please retry"
            db.commit()

            traces = (
                db.query(SkipTrace)
                .filter(
                    SkipTrace.batch_id == batch_id,
                    SkipTrace.status == "pending",
                )
                .all()
            )

            for trace in traces:
                try:
                    trace.status = "processing"
                    db.commit()

                    result = provider.skip_trace_address_sync(
                        trace.input_address or "",
                        trace.input_city or "",
                        trace.input_state or "",
                        trace.input_zip or "",
                    )

                    # Update trace with results
                    if result.status == "success":
                        trace.status = "found"
                        trace.owner_first_name = result.owner_first_name
                        trace.owner_last_name = result.owner_last_name
                        trace.phones = result.phones
                        trace.emails = result.emails
                        trace.mailing_address = result.mailing_address
                        trace.is_absentee_owner = result.is_absentee_owner
                        trace.demographics = result.demographics
                        trace.raw_response = result.raw_response
                        trace.cost_cents = 12
                    elif result.status == "not_found":
                        trace.status = "not_found"
                    else:
                        trace.status = "failed"

                    from datetime import datetime
                    trace.traced_at = datetime.utcnow()
                    db.commit()

                    # Auto-create contact if requested and found
                    if auto_create and trace.status == "found":
                        try:
                            service.create_contact_from_trace(trace.id, user_id)
                        except Exception:
                            logger.warning(
                                "Failed to auto-create contact for trace %s", trace.id
                            )

                    # Record usage for found traces
                    if trace.status == "found":
                        from core.billing.tier_gate import record_usage
                        from uuid import UUID

                        record_usage(UUID(user_id), "skip_traces_per_month", db)
                        db.commit()

                    # H2: Pace API calls — 200ms between BatchData requests
                    time.sleep(0.2)

                except Exception as e:
                    logger.error("Failed to process trace %s: %s", trace.id, e)
                    trace.status = "failed"
                    db.commit()
        finally:
            db.close()

else:
    class _NoopActor:
        def __call__(self, *args, **kwargs):
            _noop_send(*args, **kwargs)

        def send(self, *args, **kwargs):
            _noop_send(*args, **kwargs)

    process_skip_trace_batch = _NoopActor()
