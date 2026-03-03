from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(
    title="Parcel API",
    description="Backend API for Parcel — the all-in-one platform for real estate professionals.",
    version="0.1.0",
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

app.include_router(auth.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(deals.router, prefix="/api/v1")
app.include_router(pipeline.router, prefix="/api/v1")
app.include_router(portfolio.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(settings.router, prefix="/api/v1")


@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy"}


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {"status": "Parcel API running", "version": "0.1.0"}
