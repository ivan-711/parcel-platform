"""Health check task — verifies the worker is processing jobs."""

import logging
import os

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL")

if REDIS_URL:
    import dramatiq

    @dramatiq.actor
    def ping():
        """Simple health check task. Logs a message when processed."""
        logger.info("Worker ping received — task processing is healthy")
        return "pong"
