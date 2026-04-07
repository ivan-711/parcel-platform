"""Shared test fixtures — in-memory SQLite database, FastAPI test client, and auth helpers."""

import sys
import os
import uuid

os.environ["TESTING"] = "1"

import pytest
import sqlalchemy
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure the backend directory is on sys.path so absolute imports resolve
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# ---------------------------------------------------------------------------
# SQLite ↔ PostgreSQL dialect compatibility
# ---------------------------------------------------------------------------
# The models use postgresql.UUID and postgresql.JSONB. Register SQLite
# compilers so Base.metadata.create_all() works against an in-memory SQLite.

from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB

@compiles(PG_UUID, "sqlite")
def _compile_uuid_sqlite(type_, compiler, **kw):
    return "CHAR(36)"

@compiles(JSONB, "sqlite")
def _compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"

# The PostgreSQL UUID(as_uuid=True) bind_processor calls value.hex, which
# fails when the value is a plain string (e.g. from get_current_user).  Patch the
# bind and result processors to handle both uuid.UUID and str transparently.
_orig_uuid_bind = PG_UUID.bind_processor

def _patched_uuid_bind(self, dialect):
    if dialect.name == "sqlite":
        def process(value):
            if value is None:
                return value
            return str(value) if not isinstance(value, str) else value
        return process
    return _orig_uuid_bind(self, dialect)

PG_UUID.bind_processor = _patched_uuid_bind

_orig_uuid_result = PG_UUID.result_processor

def _patched_uuid_result(self, dialect, coltype):
    if dialect.name == "sqlite":
        def process(value):
            if value is None:
                return value
            return uuid.UUID(value) if self.as_uuid else value
        return process
    return _orig_uuid_result(self, dialect, coltype)

PG_UUID.result_processor = _patched_uuid_result

# ---------------------------------------------------------------------------
# Import app-level modules AFTER path setup and dialect patches
# ---------------------------------------------------------------------------
from database import Base, get_db
from main import app
from models import User, Deal, Team, PipelineEntry
from core.security.jwt import get_current_user

# ---------------------------------------------------------------------------
# Test database engine (SQLite in-memory, shared across a single test)
# ---------------------------------------------------------------------------
TEST_ENGINE = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# Enable SQLite foreign key enforcement
@event.listens_for(TEST_ENGINE, "connect")
def _set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

TestSession = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def setup_database():
    """Create all tables before each test and drop them after."""
    Base.metadata.create_all(bind=TEST_ENGINE)
    yield
    # Disable FK checks during teardown to avoid circular-dependency drop errors
    with TEST_ENGINE.connect() as conn:
        conn.execute(sqlalchemy.text("PRAGMA foreign_keys=OFF"))
        conn.commit()
    Base.metadata.drop_all(bind=TEST_ENGINE)
    with TEST_ENGINE.connect() as conn:
        conn.execute(sqlalchemy.text("PRAGMA foreign_keys=ON"))
        conn.commit()


@pytest.fixture()
def db():
    """Provide a clean database session for a single test."""
    session = TestSession()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db):
    """FastAPI TestClient wired to the test database."""
    from starlette.testclient import TestClient

    def _override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def test_user(db) -> User:
    """Insert a test user and return the ORM object."""
    user = User(
        id=uuid.uuid4(),
        name="Test User",
        email="test@parcel.dev",
        password_hash=None,  # Clerk handles authentication
        role="investor",
        plan_tier="pro",
        clerk_user_id="clerk_test_user_001",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def auth_client(client, test_user):
    """TestClient with get_current_user overridden to return the test user.

    Replaces the old cookie-based auth: instead of forging a JWT and setting
    it as a cookie, we override the FastAPI dependency to return the test
    user directly.  This is the standard pattern for Clerk-authenticated
    test suites where we can't mint real Clerk tokens.
    """
    app.dependency_overrides[get_current_user] = lambda: test_user
    yield client
    app.dependency_overrides.pop(get_current_user, None)
