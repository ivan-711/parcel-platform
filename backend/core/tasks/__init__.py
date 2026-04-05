"""Dramatiq background task broker configuration.

The broker connects to Railway Redis via REDIS_URL. When REDIS_URL is unset,
the broker is not initialized and tasks become no-ops (web process still works).

Worker startup command (Procfile / Railway service):
    dramatiq backend.core.tasks --processes 1 --threads 2
"""

import logging
import os

logger = logging.getLogger(__name__)

_broker_initialized = False

REDIS_URL = os.getenv("REDIS_URL")

if REDIS_URL:
    import dramatiq
    from dramatiq.brokers.redis import RedisBroker
    from dramatiq.middleware import CurrentMessage, Retries

    broker = RedisBroker(url=REDIS_URL)

    # Configure retry middleware: 3 retries with exponential backoff
    broker.middleware = [
        m for m in broker.middleware
        if not isinstance(m, Retries)
    ]
    broker.add_middleware(Retries(max_retries=3, min_backoff=1000, max_backoff=60000))
    broker.add_middleware(CurrentMessage())

    dramatiq.set_broker(broker)
    _broker_initialized = True
    logger.info("Dramatiq broker initialized with Redis at %s", REDIS_URL.split("@")[-1])

    # Sentry integration for worker error tracking
    try:
        _sentry_dsn = os.getenv("SENTRY_DSN")
        if _sentry_dsn:
            import sentry_sdk
            sentry_sdk.init(
                dsn=_sentry_dsn,
                traces_sample_rate=0.1,
                environment=os.getenv("ENVIRONMENT", "development"),
            )
            logger.info("Sentry initialized for Dramatiq worker")
    except Exception:
        logger.warning("Failed to initialize Sentry for worker", exc_info=True)

    # Import task modules so actors are registered
    from core.tasks import health  # noqa: F401
    from core.tasks import document_processing  # noqa: F401
    from core.tasks import pdf_generation  # noqa: F401
    from core.tasks import skip_trace_batch  # noqa: F401
    from core.tasks import mail_campaign  # noqa: F401
else:
    logger.info("REDIS_URL not set — Dramatiq broker disabled (tasks will not be processed)")
