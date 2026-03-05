"""Demo account utilities — identifies demo users and provides fixture-based services."""

from models.users import User

DEMO_EMAIL: str = "demo@parcel.app"

# Emails reserved for system accounts — cannot be used for registration or profile updates.
RESERVED_EMAILS: set[str] = {DEMO_EMAIL.lower()}


def is_demo_user(user: User) -> bool:
    """Return True if the given user is the demo account (case-insensitive)."""
    return user.email.lower() == DEMO_EMAIL.lower()


def is_reserved_email(email: str) -> bool:
    """Return True if the email is reserved for system accounts."""
    return email.lower() in RESERVED_EMAILS
