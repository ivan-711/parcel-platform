from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv
import os

from core.billing.exceptions import BillingError
from limiter import limiter

load_dotenv()

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

_frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
_allowed_origins = [_frontend_url]
if _frontend_url.startswith("https://") and not _frontend_url.startswith("https://www."):
    _allowed_origins.append(_frontend_url.replace("https://", "https://www."))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers import auth, dashboard, deals, pipeline, portfolio, chat, documents, settings  # noqa: E402
from routers import webhooks, billing, clerk_webhooks, analysis, onboarding, calculators, properties, activity, contacts, today, tasks, reports, financing, transactions, rehab, portfolio_v2, buyers  # noqa: E402

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


@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy"}


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {"status": "Parcel API running", "version": "0.1.0"}
