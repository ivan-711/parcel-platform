from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv
import logging
import os

logging.basicConfig(level=logging.INFO, format="%(name)s %(levelname)s: %(message)s")

from core.billing.exceptions import BillingError
from core.tasks import WorkerUnavailableError
from limiter import limiter

load_dotenv()

_IS_PROD = os.getenv("ENVIRONMENT", "development") == "production"

# --- Sentry error tracking ---
_sentry_dsn = os.getenv("SENTRY_DSN")
if _sentry_dsn:
    import sentry_sdk
    sentry_sdk.init(
        dsn=_sentry_dsn,
        traces_sample_rate=0.1,
        environment=os.getenv("ENVIRONMENT", "development"),
    )

app = FastAPI(
    title="Parcel API",
    description="Backend API for Parcel — the all-in-one platform for real estate professionals.",
    version="0.1.0",
    redirect_slashes=False,
    docs_url=None if _IS_PROD else "/docs",
    redoc_url=None if _IS_PROD else "/redoc",
    openapi_url=None if _IS_PROD else "/openapi.json",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(BillingError)
async def billing_error_handler(request: Request, exc: BillingError):
    """Map BillingError subtypes to appropriate HTTP status codes."""
    status_map = {
        "NO_STRIPE_CUSTOMER": 400,
        "NO_SUBSCRIPTION": 404,
        "CARD_DECLINED": 402,
        "STRIPE_INVALID_REQUEST": 400,
        "STRIPE_TRANSIENT": 503,
    }
    code = status_map.get(exc.code, 500)
    return JSONResponse(
        status_code=code,
        content={"error": exc.message, "code": exc.code},
    )


@app.exception_handler(WorkerUnavailableError)
async def worker_unavailable_handler(request: Request, exc: WorkerUnavailableError):
    """Return 503 when a background task is dispatched but no worker is configured."""
    return JSONResponse(
        status_code=503,
        content={"error": str(exc), "code": "WORKER_UNAVAILABLE"},
    )

_frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
_allowed_origins = [_frontend_url]
if _frontend_url.startswith("https://") and not _frontend_url.startswith("https://www."):
    _allowed_origins.append(_frontend_url.replace("https://", "https://www."))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=()"
        )
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' "
            "https://js.stripe.com https://clerk.parceldesk.io "
            "https://*.googleapis.com https://*.gstatic.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com data:; "
            "img-src 'self' data: https: blob:; "
            "connect-src 'self' https://api.parceldesk.io "
            "https://clerk.parceldesk.io https://api.stripe.com "
            "https://*.googleapis.com https://api.anthropic.com; "
            "frame-src https://js.stripe.com https://hooks.stripe.com; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        return response


app.add_middleware(SecurityHeadersMiddleware)

from routers import auth, dashboard, deals, pipeline, portfolio, chat, documents, settings  # noqa: E402
from routers import webhooks, billing, clerk_webhooks, analysis, onboarding, calculators, properties, activity, contacts, today, tasks, reports, financing, transactions, rehab, portfolio_v2, buyers, dispositions  # noqa: E402
from routers import communications as comms_router  # noqa: E402
from routers import sequences as seq_router  # noqa: E402
from routers import skip_tracing as skip_trace_router  # noqa: E402
from routers import mail_campaigns as mail_router  # noqa: E402
from routers import service_status  # noqa: E402
from routers.webhooks import communications as comms_webhooks  # noqa: E402

app.include_router(auth.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(deals.router, prefix="/api/v1")
app.include_router(pipeline.router, prefix="/api/v1")
app.include_router(portfolio.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(settings.router, prefix="/api/v1")
app.include_router(webhooks.router)  # /webhooks/stripe — no /api/v1 prefix
app.include_router(clerk_webhooks.router)  # /webhooks/clerk — no /api/v1 prefix
app.include_router(billing.router, prefix="/api/v1")
app.include_router(analysis.router, prefix="/api")
app.include_router(onboarding.router, prefix="/api")
app.include_router(calculators.router, prefix="/api")
app.include_router(properties.router, prefix="/api")
app.include_router(activity.router, prefix="/api")
app.include_router(contacts.router, prefix="/api")
app.include_router(today.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(financing.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(rehab.router, prefix="/api")
app.include_router(portfolio_v2.router, prefix="/api")
app.include_router(buyers.router, prefix="/api")
app.include_router(dispositions.router, prefix="/api")
app.include_router(comms_router.router, prefix="/api")
app.include_router(seq_router.router, prefix="/api")
app.include_router(seq_router.internal_router, prefix="/api")
app.include_router(comms_webhooks.router, prefix="/api/webhooks/communications")
app.include_router(skip_trace_router.router, prefix="/api")
app.include_router(mail_router.router, prefix="/api")
app.include_router(service_status.router, prefix="/api")


@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy"}


@app.get("/health/worker")
async def worker_health():
    """Check Dramatiq broker (Redis) connectivity."""
    try:
        import redis
        r = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))
        r.ping()
        return {"status": "healthy", "broker": "redis", "connected": True}
    except Exception as e:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "broker": "redis", "connected": False, "error": str(e)},
        )


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {"status": "Parcel API running", "version": "0.1.0"}
