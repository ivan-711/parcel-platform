# Email System Design — Parcel

> Design document for the complete transactional and lifecycle email system.
> Provider: Resend (already installed, `resend>=2.0.0`).
> Domain: `parceldesk.io` | Backend: FastAPI + PostgreSQL (Railway) | Frontend: React + TypeScript (Vercel)

---

## Table of Contents

1. [Resend Configuration](#1-resend-configuration)
2. [Unified Email Service](#2-unified-email-service)
3. [Email Template System](#3-email-template-system)
4. [Complete Email Catalog](#4-complete-email-catalog)
5. [Async Sending via BackgroundTasks](#5-async-sending-via-backgroundtasks)
6. [Email Preference Management](#6-email-preference-management)
7. [SPF/DKIM/DMARC DNS Records](#7-spfdkimdmarc-dns-records)
8. [PostgreSQL Email Queue](#8-postgresql-email-queue)
9. [Email Analytics Tracking](#9-email-analytics-tracking)
10. [Critical Decisions](#critical-decisions)

---

## 1. Resend Configuration

Resend is already in `backend/requirements.txt` (`resend>=2.0.0`). The current code in `backend/core/email.py` sets `resend.api_key` independently in each function, which is fragile. The new service centralizes configuration with lazy initialization.

### Environment Variables

```bash
# .env / Railway environment
RESEND_API_KEY=re_xxxxxxxx              # From Resend dashboard > API Keys
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxx    # From Resend dashboard > Webhooks
INTERNAL_CRON_SECRET=<random-64-char>   # Protects the /internal/process-email-queue endpoint
APP_BASE_URL=https://parceldesk.io      # Used in email links
```

### Sending Domains

All three addresses use the same verified `parceldesk.io` domain — no additional DNS per address.

| From Address | Purpose | Usage |
|---|---|---|
| `Ivan from Parcel <ivan@parceldesk.io>` | Welcome, trial lifecycle, win-back | Personal founder touch |
| `Parcel <notifications@parceldesk.io>` | Product notifications (doc complete, deal shared) | Already in use |
| `Parcel <billing@parceldesk.io>` | Payment receipts, dunning, invoices | Signals financial importance |

### Resend Free Tier Limits

- 100 emails/day, 3,000/month
- Sufficient through ~500 users (estimated ~5,000 emails/month requires the $20/mo Pro tier)
- No dedicated IP on Free — acceptable for early stage

---

## 2. Unified Email Service

Replace the current per-function pattern in `backend/core/email.py` with a unified service at `backend/services/email_service.py`. The existing `backend/core/email.py` file is preserved during migration but all new code imports from the service.

### `backend/services/__init__.py`

```python
"""Service layer for Parcel backend."""
```

### `backend/services/email_service.py`

```python
"""Unified email service for Parcel.

Handles all email sending through Resend, with support for:
- Direct sending (password reset — user is waiting)
- Background task sending (welcome, notifications)
- Queue-based sending (dunning, win-back, digests)
- Template rendering with Parcel brand styling
"""

import logging
import os
from datetime import datetime, timedelta
from typing import Any
from uuid import UUID

import resend
from sqlalchemy.orm import Session

from models.users import User

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Resend SDK configuration (lazy singleton)
# ---------------------------------------------------------------------------

_RESEND_READY = False


def _ensure_resend() -> bool:
    """Configure the Resend API key once. Returns True when ready."""
    global _RESEND_READY
    if _RESEND_READY:
        return True
    api_key = os.getenv("RESEND_API_KEY", "")
    if not api_key:
        logger.warning("RESEND_API_KEY not set — email sending disabled")
        return False
    resend.api_key = api_key
    _RESEND_READY = True
    return True


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

FROM_FOUNDER = "Ivan from Parcel <ivan@parceldesk.io>"
FROM_NOTIFICATIONS = "Parcel <notifications@parceldesk.io>"
FROM_BILLING = "Parcel <billing@parceldesk.io>"

APP_BASE_URL = os.getenv("APP_BASE_URL", "https://parceldesk.io")

# Email type constants — used as tags and for preference checks
class EmailType:
    # Auth / Transactional (always sent, cannot unsubscribe)
    PASSWORD_RESET = "password_reset"
    PASSWORD_CHANGED = "password_changed"
    EMAIL_VERIFICATION = "email_verification"

    # Trial lifecycle
    WELCOME = "welcome"
    TRIAL_DAY_7 = "trial_day7"
    TRIAL_DAY_12 = "trial_day12"
    TRIAL_DAY_13 = "trial_day13"
    TRIAL_EXPIRED = "trial_expired"

    # Billing (transactional — always sent)
    PAYMENT_SUCCESS = "payment_success"
    PAYMENT_FAILED_DAY1 = "payment_failed_day1"
    PAYMENT_FAILED_DAY3 = "payment_failed_day3"
    PAYMENT_FAILED_DAY7 = "payment_failed_day7"
    PAYMENT_FAILED_DAY14 = "payment_failed_day14"
    PLAN_UPGRADED = "plan_upgraded"
    PLAN_DOWNGRADED = "plan_downgraded"
    SUBSCRIPTION_CANCELED = "subscription_canceled"

    # Usage alerts
    USAGE_80_PERCENT = "usage_80_percent"
    USAGE_100_PERCENT = "usage_100_percent"

    # Win-back (marketing — respects opt-out)
    WINBACK_7D = "winback_7d"
    WINBACK_30D = "winback_30d"
    WINBACK_60D = "winback_60d"

    # Product notifications
    DOCUMENT_COMPLETE = "document_complete"
    DEAL_SHARED = "deal_shared"
    WEEKLY_DIGEST = "weekly_digest"


# Map email types to preference categories for opt-out checks.
# Any type NOT in this map is considered transactional (always sent).
EMAIL_PREFERENCE_MAP: dict[str, str] = {
    EmailType.TRIAL_DAY_7: "trial_reminders",
    EmailType.TRIAL_DAY_12: "trial_reminders",
    EmailType.TRIAL_DAY_13: "trial_reminders",
    EmailType.TRIAL_EXPIRED: "trial_reminders",
    EmailType.USAGE_80_PERCENT: "product_updates",
    EmailType.USAGE_100_PERCENT: "product_updates",
    EmailType.DOCUMENT_COMPLETE: "product_updates",
    EmailType.DEAL_SHARED: "product_updates",
    EmailType.WINBACK_7D: "marketing",
    EmailType.WINBACK_30D: "marketing",
    EmailType.WINBACK_60D: "marketing",
    EmailType.WEEKLY_DIGEST: "weekly_digest",
}

# Default email preferences for new users
DEFAULT_EMAIL_PREFERENCES: dict[str, bool] = {
    "trial_reminders": True,
    "billing_alerts": True,        # Cannot be fully disabled (payment-failed is transactional)
    "product_updates": True,       # Document complete, deal shared, usage alerts
    "marketing": True,             # Win-back sequences
    "weekly_digest": False,        # Opt-in, not opt-out
}


# ---------------------------------------------------------------------------
# Preference checking
# ---------------------------------------------------------------------------

def user_allows_email(user: User, email_type: str) -> bool:
    """Check whether the user's preferences allow this email type.

    Transactional emails (password reset, payment failed, receipts) always
    return True — they cannot be opted out of.
    """
    pref_key = EMAIL_PREFERENCE_MAP.get(email_type)
    if pref_key is None:
        # Not in the map → transactional, always send
        return True

    prefs = getattr(user, "email_preferences", None)
    if prefs is None:
        # User has no preferences column yet — use defaults
        return DEFAULT_EMAIL_PREFERENCES.get(pref_key, True)

    return prefs.get(pref_key, True)


# ---------------------------------------------------------------------------
# Core send function
# ---------------------------------------------------------------------------

def send_email(
    to: str,
    subject: str,
    html: str,
    from_address: str = FROM_NOTIFICATIONS,
    headers: dict[str, str] | None = None,
    tags: list[dict[str, str]] | None = None,
    reply_to: str | None = None,
) -> dict[str, Any] | None:
    """Send a single email via Resend. Returns the API response or None on failure.

    This function NEVER raises. All exceptions are caught and logged so that
    callers (especially BackgroundTasks) do not crash silently.
    """
    if not _ensure_resend():
        return None

    try:
        payload: dict[str, Any] = {
            "from": from_address,
            "to": to,
            "subject": subject,
            "html": html,
        }
        if headers:
            payload["headers"] = headers
        if tags:
            payload["tags"] = tags
        if reply_to:
            payload["reply_to"] = reply_to

        result = resend.Emails.send(payload)
        logger.info("Email sent to=%s subject=%s", to, subject)
        return result
    except Exception:
        logger.exception("Failed to send email to=%s subject=%s", to, subject)
        return None


# ---------------------------------------------------------------------------
# Queue-based send (uses the email_jobs table)
# ---------------------------------------------------------------------------

def enqueue_email(
    db: Session,
    to: str,
    subject: str,
    html: str,
    email_type: str,
    from_address: str = FROM_NOTIFICATIONS,
    scheduled_for: datetime | None = None,
    headers: dict[str, str] | None = None,
    tags: list[dict[str, str]] | None = None,
    user_id: UUID | None = None,
) -> None:
    """Insert an email into the email_jobs queue for reliable delivery.

    The queue processor picks it up within 1-2 minutes.
    Does NOT commit — the caller's transaction handles that.
    """
    from models.email_jobs import EmailJob  # late import to avoid circular

    job = EmailJob(
        to_address=to,
        subject=subject,
        html_body=html,
        email_type=email_type,
        from_address=from_address,
        scheduled_for=scheduled_for or datetime.utcnow(),
        headers=headers,
        tags=tags or [{"name": "category", "value": email_type}],
        user_id=user_id,
    )
    db.add(job)


# ---------------------------------------------------------------------------
# Convenience: schedule the trial lifecycle sequence
# ---------------------------------------------------------------------------

def schedule_trial_emails(db: Session, user: User) -> None:
    """Schedule the 4 trial lifecycle emails at registration time.

    Called from the register endpoint. Inserts rows into email_jobs with
    future scheduled_for timestamps. The queue processor will check
    user preferences and upgrade status before actually sending.
    """
    from services.email_templates import render_email

    trial_start = user.created_at or datetime.utcnow()

    schedule = [
        (EmailType.TRIAL_DAY_7, 7),
        (EmailType.TRIAL_DAY_12, 12),
        (EmailType.TRIAL_DAY_13, 13),
        (EmailType.TRIAL_EXPIRED, 14),
    ]

    for email_type, day_offset in schedule:
        send_at = trial_start + timedelta(days=day_offset, hours=9)  # 9 AM relative
        subject, html = render_email(email_type, user=user)
        enqueue_email(
            db=db,
            to=user.email,
            subject=subject,
            html=html,
            email_type=email_type,
            from_address=FROM_FOUNDER,
            scheduled_for=send_at,
            user_id=user.id,
        )


# ---------------------------------------------------------------------------
# Convenience: schedule win-back sequence
# ---------------------------------------------------------------------------

def schedule_winback_emails(db: Session, user: User) -> None:
    """Schedule 3 win-back emails after subscription cancellation."""
    from services.email_templates import render_email

    now = datetime.utcnow()

    schedule = [
        (EmailType.WINBACK_7D, 7),
        (EmailType.WINBACK_30D, 30),
        (EmailType.WINBACK_60D, 60),
    ]

    for email_type, day_offset in schedule:
        send_at = now + timedelta(days=day_offset, hours=10)
        subject, html = render_email(email_type, user=user)
        enqueue_email(
            db=db,
            to=user.email,
            subject=subject,
            html=html,
            email_type=email_type,
            from_address=FROM_FOUNDER,
            scheduled_for=send_at,
            user_id=user.id,
        )


# ---------------------------------------------------------------------------
# Cancel scheduled emails (e.g., user upgrades before trial ends)
# ---------------------------------------------------------------------------

def cancel_scheduled_emails(
    db: Session,
    user_id: UUID,
    email_types: list[str],
) -> int:
    """Cancel pending scheduled emails for a user. Returns count canceled."""
    from models.email_jobs import EmailJob

    now = datetime.utcnow()
    count = (
        db.query(EmailJob)
        .filter(
            EmailJob.user_id == user_id,
            EmailJob.email_type.in_(email_types),
            EmailJob.status == "pending",
            EmailJob.sent_at.is_(None),
        )
        .update(
            {"status": "canceled", "canceled_at": now},
            synchronize_session="fetch",
        )
    )
    logger.info(
        "Canceled %d scheduled emails for user=%s types=%s",
        count, user_id, email_types,
    )
    return count
```

---

## 3. Email Template System

### Design Principles

1. **Light background** — `#FFFFFF` body, `#F8FAFC` surface cards, `#6366F1` indigo accent. The existing dark templates in `backend/core/email.py` will break in dark-mode email clients (Gmail, Apple Mail double-invert dark backgrounds). All new templates use a light canvas.
2. **Mobile-first** — 600px max-width, single-column, 44px min tap targets, 16px body text.
3. **Inline styles only** — Gmail strips `<style>` blocks. Every style is inline.
4. **Outlook-safe CTA buttons** — VML roundrect fallback for Outlook desktop clients.
5. **Preheader text** — Hidden div before visible content for inbox preview snippets.
6. **Monospace for financial numbers** — `Menlo, Monaco, 'Courier New', monospace` (JetBrains Mono not supported in email).

### `backend/services/email_templates.py`

```python
"""Email template rendering for Parcel.

All templates use light backgrounds with Parcel indigo accents.
Templates are Python string functions — no external template engine needed.
This keeps the system self-contained with zero additional dependencies.
"""

from datetime import datetime
from typing import Any

from models.users import User


# ---------------------------------------------------------------------------
# Color palette (light email theme)
# ---------------------------------------------------------------------------

BG_PAGE = "#F1F5F9"         # slate-100, outer background
BG_CARD = "#FFFFFF"         # white, main card
BG_SURFACE = "#F8FAFC"      # slate-50, inner surface/info boxes
TEXT_PRIMARY = "#0F172A"     # slate-900
TEXT_SECONDARY = "#64748B"   # slate-500
TEXT_MUTED = "#94A3B8"       # slate-400
ACCENT = "#6366F1"          # indigo-500, Parcel brand
ACCENT_HOVER = "#4F46E5"    # indigo-600
BORDER = "#E2E8F0"          # slate-200
SUCCESS = "#10B981"         # emerald-500
WARNING = "#F59E0B"         # amber-500
DANGER = "#EF4444"          # red-500
MONO_FONT = "Menlo, Monaco, 'Courier New', monospace"
SYSTEM_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"


# ---------------------------------------------------------------------------
# Base layout wrapper
# ---------------------------------------------------------------------------

def _base_layout(
    subject: str,
    preheader: str,
    content: str,
    footer_extra: str = "",
    show_unsubscribe: bool = True,
) -> str:
    """Wrap content in the Parcel email base layout.

    Light background, 600px card, Parcel logo header, standard footer.
    """
    unsubscribe_html = ""
    if show_unsubscribe:
        unsubscribe_html = f"""
              <a href="https://parceldesk.io/settings/notifications"
                 style="color:{ACCENT}; text-decoration:underline;">
                Manage email preferences</a>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <title>{subject}</title>
</head>
<body style="margin:0; padding:0; background:{BG_PAGE};
             font-family:{SYSTEM_FONT}; -webkit-font-smoothing:antialiased;">

  <!-- Preheader (visible in inbox preview, hidden in body) -->
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
    {preheader}
    {"&nbsp;&zwnj;" * 30}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="background:{BG_PAGE};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0"
               style="background:{BG_CARD}; border-radius:12px;
                      border:1px solid {BORDER}; max-width:600px; width:100%;">

          <!-- Logo Header -->
          <tr>
            <td style="padding:32px 32px 0;">
              <span style="color:{ACCENT}; font-size:26px;
                           font-weight:800; letter-spacing:-0.02em;">Parcel</span>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:24px 32px 32px; color:{TEXT_PRIMARY};
                        font-size:16px; line-height:1.6;">
              {content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px; border-top:1px solid {BORDER};
                        color:{TEXT_SECONDARY}; font-size:12px; line-height:1.5;">
              Parcel Technologies, Inc.<br>
              {unsubscribe_html}
              {footer_extra}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Reusable components
# ---------------------------------------------------------------------------

def _cta_button(url: str, text: str, color: str = ACCENT) -> str:
    """Outlook-safe CTA button with VML fallback."""
    return f"""
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml"
  href="{url}" style="height:48px; v-text-anchor:middle; width:260px;"
  arcsize="17%" strokecolor="{color}" fillcolor="{color}">
<center style="color:#FFFFFF; font-family:sans-serif; font-size:16px; font-weight:600;">
  {text}
</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="{url}" style="display:inline-block; background:{color};
   color:#FFFFFF; padding:14px 32px; border-radius:8px;
   text-decoration:none; font-weight:600; font-size:16px;
   mso-padding-alt:0; text-align:center;">
  {text}
</a>
<!--<![endif]-->"""


def _info_box(content: str) -> str:
    """Slate surface box for plan comparisons, stats, etc."""
    return f"""
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="background:{BG_SURFACE}; border:1px solid {BORDER};
              border-radius:8px; margin:16px 0;">
  <tr>
    <td style="padding:16px 20px; font-size:14px; line-height:1.6; color:{TEXT_PRIMARY};">
      {content}
    </td>
  </tr>
</table>"""


def _stat_row(label: str, value: str) -> str:
    """Single stat line with monospace value."""
    return f"""
<tr>
  <td style="padding:4px 0; color:{TEXT_SECONDARY}; font-size:14px;">{label}</td>
  <td style="padding:4px 0; text-align:right; font-family:{MONO_FONT};
             font-size:14px; font-weight:600; color:{TEXT_PRIMARY};">{value}</td>
</tr>"""


def _divider() -> str:
    return f'<hr style="border:none; border-top:1px solid {BORDER}; margin:24px 0;">'


def _first_name(user: User) -> str:
    """Extract first name from user.name, fallback to 'there'."""
    name = getattr(user, "name", "") or ""
    return name.split()[0] if name.strip() else "there"


# ---------------------------------------------------------------------------
# Template: Welcome + Trial Start
# ---------------------------------------------------------------------------

def _welcome(user: User, **kwargs: Any) -> tuple[str, str]:
    subject = "Welcome to Parcel — your 14-day Pro trial is active"
    preheader = "Analyze your first deal across 5 strategies. No credit card needed."

    trial_end = (user.created_at or datetime.utcnow()) + __import__("datetime").timedelta(days=14)
    trial_end_str = trial_end.strftime("%B %d, %Y")

    content = f"""
<h1 style="font-size:22px; font-weight:700; margin:0 0 8px; color:{TEXT_PRIMARY};">
  Welcome to Parcel
</h1>
<p style="color:{TEXT_SECONDARY}; margin:0 0 24px;">
  Your 14-day Pro trial is now active — no credit card needed.
</p>

<p style="margin:0 0 16px; font-weight:600;">Here's what you can do right now:</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="padding:8px 0; vertical-align:top; width:28px; color:{ACCENT}; font-size:18px;">&#9670;</td>
    <td style="padding:8px 0; font-size:15px;">
      <strong>Analyze deals</strong> across 5 strategies — BRRRR, Flip, Buy & Hold, Wholesale, Creative Finance
    </td>
  </tr>
  <tr>
    <td style="padding:8px 0; vertical-align:top; width:28px; color:{ACCENT}; font-size:18px;">&#9670;</td>
    <td style="padding:8px 0; font-size:15px;">
      <strong>AI chat</strong> — ask questions about any deal and get instant analysis
    </td>
  </tr>
  <tr>
    <td style="padding:8px 0; vertical-align:top; width:28px; color:{ACCENT}; font-size:18px;">&#9670;</td>
    <td style="padding:8px 0; font-size:15px;">
      <strong>Pipeline</strong> — track deals from lead to close with drag-and-drop Kanban
    </td>
  </tr>
  <tr>
    <td style="padding:8px 0; vertical-align:top; width:28px; color:{ACCENT}; font-size:18px;">&#9670;</td>
    <td style="padding:8px 0; font-size:15px;">
      <strong>PDF reports</strong> — share branded, lender-ready analysis with partners
    </td>
  </tr>
</table>

<div style="margin:28px 0; text-align:center;">
  {_cta_button("https://parceldesk.io/analyze", "Analyze Your First Deal")}
</div>

{_info_box(f'''
<strong>Your Pro trial includes:</strong><br>
&#10003; Unlimited deal analyses<br>
&#10003; AI chat specialist<br>
&#10003; Document upload & extraction<br>
&#10003; PDF export<br><br>
<span style="color:{TEXT_SECONDARY};">Trial ends: {trial_end_str}</span>
''')}

<p style="color:{TEXT_SECONDARY}; font-size:14px; margin:24px 0 0;">
  Questions? Reply to this email — it goes straight to me.
</p>
<p style="margin:4px 0 0; font-weight:600;">
  — Ivan, Founder of Parcel
</p>"""

    return subject, _base_layout(subject, preheader, content)


# ---------------------------------------------------------------------------
# Template: Trial Day 7 (Midpoint)
# ---------------------------------------------------------------------------

def _trial_day7(user: User, **kwargs: Any) -> tuple[str, str]:
    subject = "You're halfway through your Pro trial"
    preheader = "Here's what you've unlocked so far — and what's coming."

    content = f"""
<h1 style="font-size:22px; font-weight:700; margin:0 0 8px;">
  Halfway through your trial
</h1>
<p style="color:{TEXT_SECONDARY}; margin:0 0 24px;">
  Hey {_first_name(user)}, you've got 7 days left of Parcel Pro. Here are
  some features worth trying before your trial ends:
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="margin:0 0 24px;">
  <tr>
    <td style="padding:12px 16px; background:{BG_SURFACE}; border:1px solid {BORDER};
               border-radius:8px 8px 0 0;">
      <strong>Compare deals side by side</strong><br>
      <span style="color:{TEXT_SECONDARY}; font-size:14px;">
        Run multiple strategies on the same property and see which wins.
      </span>
    </td>
  </tr>
  <tr>
    <td style="padding:12px 16px; background:{BG_SURFACE}; border:1px solid {BORDER};
               border-top:none;">
      <strong>Generate a PDF report</strong><br>
      <span style="color:{TEXT_SECONDARY}; font-size:14px;">
        Create a branded, lender-ready analysis to share with partners.
      </span>
    </td>
  </tr>
  <tr>
    <td style="padding:12px 16px; background:{BG_SURFACE}; border:1px solid {BORDER};
               border-top:none; border-radius:0 0 8px 8px;">
      <strong>Ask the AI about a deal</strong><br>
      <span style="color:{TEXT_SECONDARY}; font-size:14px;">
        Get instant analysis: "Is this BRRRR worth it at 6.5% rates?"
      </span>
    </td>
  </tr>
</table>

<div style="text-align:center;">
  {_cta_button("https://parceldesk.io/dashboard", "Go to Dashboard")}
</div>

<p style="color:{TEXT_SECONDARY}; font-size:14px; margin:24px 0 0;">
  Your trial ends in 7 days. No credit card required — upgrade anytime.
</p>"""

    return subject, _base_layout(subject, preheader, content)


# ---------------------------------------------------------------------------
# Template: Trial Day 12 (Ending Soon)
# ---------------------------------------------------------------------------

def _trial_day12(user: User, **kwargs: Any) -> tuple[str, str]:
    subject = "Your Pro trial ends in 2 days"
    preheader = "Upgrade to keep unlimited analyses, AI chat, and PDF reports."

    content = f"""
<h1 style="font-size:22px; font-weight:700; margin:0 0 8px;">
  Your Pro trial ends in 2 days
</h1>
<p style="color:{TEXT_SECONDARY}; margin:0 0 24px;">
  Hey {_first_name(user)}, your Parcel Pro trial expires on
  {((user.created_at or datetime.utcnow()) + __import__("datetime").timedelta(days=14)).strftime("%B %d")}.
</p>

{_divider()}

{_info_box(f'''
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="padding:0 0 12px; font-weight:700; font-size:15px;">What changes on Free:</td>
  </tr>
  <tr>
    <td style="padding:2px 0; color:{TEXT_SECONDARY}; font-size:14px;">&#10005; Limited to 3 analyses per month</td>
  </tr>
  <tr>
    <td style="padding:2px 0; color:{TEXT_SECONDARY}; font-size:14px;">&#10005; No AI chat specialist</td>
  </tr>
  <tr>
    <td style="padding:2px 0; color:{TEXT_SECONDARY}; font-size:14px;">&#10005; No PDF report export</td>
  </tr>
  <tr>
    <td style="padding:12px 0 0; font-weight:700; font-size:15px;">What you keep:</td>
  </tr>
  <tr>
    <td style="padding:2px 0; color:{SUCCESS}; font-size:14px;">&#10003; All your existing deal analyses</td>
  </tr>
  <tr>
    <td style="padding:2px 0; color:{SUCCESS}; font-size:14px;">&#10003; Your pipeline and documents</td>
  </tr>
  <tr>
    <td style="padding:2px 0; color:{SUCCESS}; font-size:14px;">&#10003; 3 new analyses per month</td>
  </tr>
</table>
''')}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="margin:20px 0;">
  <tr>
    <td width="50%" style="padding:8px; text-align:center; background:{BG_SURFACE};
                           border:1px solid {BORDER}; border-radius:8px 0 0 8px;">
      <div style="font-weight:700; font-size:15px;">Starter</div>
      <div style="font-family:{MONO_FONT}; font-size:20px; font-weight:700; color:{ACCENT};
                  margin:4px 0;">$29<span style="font-size:13px; color:{TEXT_SECONDARY};">/mo</span></div>
      <div style="font-size:12px; color:{TEXT_SECONDARY};">20 analyses, AI chat, PDF</div>
    </td>
    <td width="50%" style="padding:8px; text-align:center; background:{ACCENT};
                           border-radius:0 8px 8px 0;">
      <div style="font-weight:700; font-size:15px; color:#FFFFFF;">Pro</div>
      <div style="font-family:{MONO_FONT}; font-size:20px; font-weight:700; color:#FFFFFF;
                  margin:4px 0;">$69<span style="font-size:13px; color:rgba(255,255,255,0.7);">/mo</span></div>
      <div style="font-size:12px; color:rgba(255,255,255,0.8);">Unlimited everything</div>
    </td>
  </tr>
</table>

<div style="text-align:center; margin:24px 0;">
  {_cta_button("https://parceldesk.io/settings/billing", "Upgrade Now")}
</div>

<p style="color:{TEXT_SECONDARY}; font-size:14px; margin:0;">
  No pressure — your data stays safe on the Free plan.
</p>"""

    return subject, _base_layout(subject, preheader, content)


# ---------------------------------------------------------------------------
# Template: Trial Day 13 (Final Warning)
# ---------------------------------------------------------------------------

def _trial_day13(user: User, **kwargs: Any) -> tuple[str, str]:
    subject = "Last day of Pro — upgrade to keep your deal pipeline"
    preheader = "Your Pro trial ends tomorrow. Choose a plan to keep all features."

    content = f"""
<h1 style="font-size:22px; font-weight:700; margin:0 0 8px;">
  Your Pro trial ends tomorrow
</h1>
<p style="color:{TEXT_SECONDARY}; margin:0 0 24px;">
  Hey {_first_name(user)}, this is your last day with full Pro access.
  After tomorrow, you'll move to the Free plan automatically.
</p>

<div style="text-align:center; margin:24px 0;">
  {_cta_button("https://parceldesk.io/settings/billing", "Choose a Plan")}
</div>

<p style="color:{TEXT_SECONDARY}; font-size:14px; margin:0 0 8px;">
  All your data is safe regardless. You can upgrade anytime.
</p>
<p style="color:{TEXT_SECONDARY}; font-size:14px; margin:0;">
  Questions? Just reply to this email.
</p>
<p style="margin:16px 0 0; font-weight:600;">— Ivan</p>"""

    return subject, _base_layout(subject, preheader, content)


# ---------------------------------------------------------------------------
# Template: Trial Expired
# ---------------------------------------------------------------------------

def _trial_expired(user: User, **kwargs: Any) -> tuple[str, str]:
    subject = "Your Pro trial has ended — here's what happens next"
    preheader = "You're now on the Free plan. Your data is safe — upgrade anytime."

    content = f"""
<h1 style="font-size:22px; font-weight:700; margin:0 0 8px;">
  Your Pro trial has ended
</h1>
<p style="color:{TEXT_SECONDARY}; margin:0 0 24px;">
  Hey {_first_name(user)}, your 14-day Pro trial ended today.
  Here's what changes:
</p>

{_info_box(f'''
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr><td style="padding:0 0 8px; font-weight:700;">What you keep:</td></tr>
  <tr><td style="padding:2px 0; color:{SUCCESS}; font-size:14px;">&#10003; All existing deal analyses and data</td></tr>
  <tr><td style="padding:2px 0; color:{SUCCESS}; font-size:14px;">&#10003; Your pipeline and documents</td></tr>
  <tr><td style="padding:2px 0; color:{SUCCESS}; font-size:14px;">&#10003; 3 new deal analyses per month</td></tr>
  <tr><td style="padding:12px 0 8px; font-weight:700;">What's paused:</td></tr>
  <tr><td style="padding:2px 0; color:{TEXT_SECONDARY}; font-size:14px;">&#10005; AI chat specialist</td></tr>
  <tr><td style="padding:2px 0; color:{TEXT_SECONDARY}; font-size:14px;">&#10005; PDF report export</td></tr>
  <tr><td style="padding:2px 0; color:{TEXT_SECONDARY}; font-size:14px;">&#10005; Unlimited analyses</td></tr>
</table>
''')}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="margin:20px 0;">
  <tr>
    <td width="50%" style="padding:12px; text-align:center; border:2px solid {BORDER}; border-radius:8px;">
      <div style="font-weight:700;">Starter</div>
      <div style="font-family:{MONO_FONT}; font-size:22px; font-weight:700; color:{ACCENT}; margin:4px 0;">
        $29<span style="font-size:13px; color:{TEXT_SECONDARY};">/mo</span>
      </div>
    </td>
    <td width="8px"></td>
    <td width="50%" style="padding:12px; text-align:center; border:2px solid {ACCENT}; border-radius:8px;">
      <div style="font-weight:700;">Pro</div>
      <div style="font-family:{MONO_FONT}; font-size:22px; font-weight:700; color:{ACCENT}; margin:4px 0;">
        $69<span style="font-size:13px; color:{TEXT_SECONDARY};">/mo</span>
      </div>
    </td>
  </tr>
</table>

<div style="text-align:center; margin:24px 0;">
  {_cta_button("https://parceldesk.io/settings/billing", "Choose a Plan")}
</div>

<p style="color:{TEXT_SECONDARY}; font-size:14px;">
  No rush — upgrade anytime and pick up right where you left off.
</p>
<p style="margin:8px 0 0; font-weight:600;">— Ivan</p>"""

    return subject, _base_layout(subject, preheader, content)


# ---------------------------------------------------------------------------
# Template: Payment Successful (Receipt)
# ---------------------------------------------------------------------------

def _payment_success(user: User, **kwargs: Any) -> tuple[str, str]:
    amount = kwargs.get("amount", "$0.00")
    plan_name = kwargs.get("plan_name", "Pro")
    invoice_url = kwargs.get("invoice_url", "")
    period_end = kwargs.get("period_end", "")

    subject = f"Payment received — {amount} for Parcel {plan_name}"
    preheader = f"Your {amount} payment for Parcel {plan_name} was successful."

    invoice_link = ""
    if invoice_url:
        invoice_link = f"""
<p style="margin:16px 0 0;">
  <a href="{invoice_url}" style="color:{ACCENT}; text-decoration:underline; font-size:14px;">
    View invoice &rarr;
  </a>
</p>"""

    content = f"""
<h1 style="font-size:22px; font-weight:700; margin:0 0 8px;">
  Payment received
</h1>
<p style="color:{TEXT_SECONDARY}; margin:0 0 24px;">
  Thanks, {_first_name(user)}. We've received your payment.
</p>

{_info_box(f'''
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  {_stat_row("Plan", f"Parcel {plan_name}")}
  {_stat_row("Amount", amount)}
  {_stat_row("Next billing date", period_end) if period_end else ""}
</table>
''')}

{invoice_link}

<p style="color:{TEXT_SECONDARY}; font-size:14px; margin:24px 0 0;">
  Manage your subscription anytime in
  <a href="https://parceldesk.io/settings/billing" style="color:{ACCENT};">Settings &rarr; Billing</a>.
</p>"""

    return subject, _base_layout(
        subject, preheader, content,
        show_unsubscribe=False,  # Transactional — no unsubscribe
    )


# ---------------------------------------------------------------------------
# Template: Payment Failed — Dunning Sequence
# ---------------------------------------------------------------------------

_DUNNING_CONFIG = {
    "payment_failed_day1": {
        "subject": "Action needed: your Parcel payment didn't go through",
        "preheader": "We'll retry in 2 days. Update your card to avoid interruption.",
        "urgency": "low",
        "retry_note": "We'll retry automatically in 2 days.",
        "consequence": "If the issue persists, your account will be downgraded to the Free plan after 14 days.",
    },
    "payment_failed_day3": {
        "subject": "Your payment is still failing — update your card",
        "preheader": "Your Parcel subscription payment has failed twice. Please update your card.",
        "urgency": "medium",
        "retry_note": "We'll retry again in 4 days.",
        "consequence": "Your account will be downgraded to the Free plan in 11 days if we can't process payment.",
    },
    "payment_failed_day7": {
        "subject": "Your Parcel account will be downgraded in 7 days",
        "preheader": "Last chance to update your payment method before your plan changes.",
        "urgency": "high",
        "retry_note": "We'll make one final attempt in 7 days.",
        "consequence": "After that, your account will be downgraded to the Free plan. Your data stays safe.",
    },
    "payment_failed_day14": {
        "subject": "Final notice: update your payment to keep Parcel Pro",
        "preheader": "Your plan will be downgraded today unless you update your payment method.",
        "urgency": "critical",
        "retry_note": "",
        "consequence": "Your account has been downgraded to the Free plan. All your data is preserved — reactivate anytime.",
    },
}


def _payment_failed(user: User, **kwargs: Any) -> tuple[str, str]:
    email_type = kwargs.get("email_type", "payment_failed_day1")
    amount = kwargs.get("amount", "$0.00")
    plan_name = kwargs.get("plan_name", "Pro")

    config = _DUNNING_CONFIG.get(email_type, _DUNNING_CONFIG["payment_failed_day1"])

    # Urgency-based accent color for the top border
    urgency_colors = {
        "low": WARNING,
        "medium": WARNING,
        "high": DANGER,
        "critical": DANGER,
    }
    urgency_color = urgency_colors.get(config["urgency"], WARNING)

    retry_html = ""
    if config["retry_note"]:
        retry_html = f'<p style="color:{TEXT_SECONDARY}; font-size:14px; margin:8px 0 0;">{config["retry_note"]}</p>'

    content = f"""
<div style="background:{urgency_color}; height:4px; border-radius:4px; margin:0 0 24px;"></div>

<h1 style="font-size:22px; font-weight:700; margin:0 0 8px;">
  Payment failed
</h1>
<p style="color:{TEXT_SECONDARY}; margin:0 0 24px;">
  Hey {_first_name(user)}, we tried to charge {amount} for your
  Parcel {plan_name} subscription, but the payment didn't go through.
</p>

<p style="margin:0 0 16px;">This usually happens when:</p>
<ul style="margin:0 0 24px; padding-left:20px; color:{TEXT_SECONDARY}; font-size:14px;">
  <li style="margin:4px 0;">Your card expired or was replaced</li>
  <li style="margin:4px 0;">Your bank flagged the charge</li>
  <li style="margin:4px 0;">Insufficient funds</li>
</ul>

<div style="text-align:center; margin:24px 0;">
  {_cta_button("https://parceldesk.io/settings/billing", "Update Payment Method")}
</div>

{retry_html}
<p style="color:{TEXT_SECONDARY}; font-size:14px; margin:8px 0 0;">
  {config["consequence"]}
</p>

<p style="color:{TEXT_SECONDARY}; font-size:13px; margin:24px 0 0;">
  Your deals, pipeline, and documents are safe regardless.
</p>"""

    return config["subject"], _base_layout(
        config["subject"], config["preheader"], content,
        show_unsubscribe=False,  # Transactional — no unsubscribe
    )


# ---------------------------------------------------------------------------
# Template: Plan Upgraded
# ---------------------------------------------------------------------------

def _plan_upgraded(user: User, **kwargs: Any) -> tuple[str, str]:
    new_plan = kwargs.get("plan_name", "Pro")
    subject = f"You've upgraded to Parcel {new_plan}"
    preheader = f"Welcome to Parcel {new_plan} — here's what's new."

    features = {
        "Starter": [
            "20 deal analyses per month",
            "AI chat specialist",
            "PDF report export",
            "Document upload & extraction",
        ],
        "Pro": [
            "Unlimited deal analyses",
            "AI chat specialist",
            "PDF report export",
            "Document upload & extraction",
            "Priority support",
        ],
        "Team": [
            "Everything in Pro",
            "Shared pipeline and portfolio",
            "Team member management",
            "Deal assignments and collaboration",
        ],
    }

    feature_list = features.get(new_plan, features["Pro"])
    features_html = "".join(
        f'<tr><td style="padding:3px 0; color:{SUCCESS}; font-size:14px;">&#10003; {f}</td></tr>'
        for f in feature_list
    )

    content = f"""
<h1 style="font-size:22px; font-weight:700; margin:0 0 8px;">
  Welcome to Parcel {new_plan}
</h1>
<p style="color:{TEXT_SECONDARY}; margin:0 0 24px;">
  Hey {_first_name(user)}, your upgrade is active. Here's what you now have access to:
</p>

{_info_box(f'''
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  {features_html}
</table>
''')}

<div style="text-align:center; margin:24px 0;">
  {_cta_button("https://parceldesk.io/analyze", "Analyze a Deal")}
</div>

<p style="color:{TEXT_SECONDARY}; font-size:14px;">
  Thanks for supporting Parcel. If you have any questions, just reply to this email.
</p>"""

    return subject, _base_layout(subject, preheader, content)


# ---------------------------------------------------------------------------
# Template: Plan Downgraded
# ---------------------------------------------------------------------------

def _plan_downgraded(user: User, **kwargs: Any) -> tuple[str, str]:
    new_plan = kwargs.get("plan_name", "Free")
    subject = f"Your plan has been changed to Parcel {new_plan}"
    preheader = f"Your Parcel plan is now {new_plan}. Your data is safe."

    content = f"""
<h1 style="font-size:22px; font-weight:700; margin:0 0 8px;">
  Your plan has changed
</h1>
<p style="color:{TEXT_SECONDARY}; margin:0 0 24px;">
  Hey {_first_name(user)}, your Parcel plan has been changed to {new_plan}.
  All of your existing data — deals, pipeline, documents — is safe and accessible.
</p>

<p style="color:{TEXT_SECONDARY}; font-size:14px; margin:0 0 24px;">
  You can upgrade again anytime to regain full access to all features.
</p>

<div style="text-align:center; margin:24px 0;">
  {_cta_button("https://parceldesk.io/settings/billing", "View Plans")}
</div>"""

    return subject, _base_layout(subject, preheader, content)


# ---------------------------------------------------------------------------
# Template: Subscription Canceled
# ---------------------------------------------------------------------------

def _subscription_canceled(user: User, **kwargs: Any) -> tuple[str, str]:
    subject = "We've canceled your Parcel subscription"
    preheader = "Your subscription has been canceled. Your data is preserved."

    content = f"""
<h1 style="font-size:22px; font-weight:700; margin:0 0 8px;">
  Subscription canceled
</h1>
<p style="color:{TEXT_SECONDARY}; margin:0 0 24px;">
  Hey {_first_name(user)}, your Parcel subscription has been canceled as requested.
</p>

{_info_box(f'''
<strong>Your data is safe:</strong><br>
All your deal analyses, pipeline deals, and documents are preserved on the Free plan.
You can access them anytime and upgrade whenever you're ready.
''')}

<p style="color:{TEXT_SECONDARY}; font-size:14px; margin:0 0 24px;">
  We'd love to know what we could do better. Just reply to this email with any feedback.
</p>

<div style="text-align:center; margin:24px 0;">
  {_cta_button("https://parceldesk.io/settings/billing", "Reactivate Anytime")}
</div>

<p style="font-weight:600; margin:16px 0 0;">— Ivan</p>"""

    return subject, _base_layout(subject, preheader, content)


# ---------------------------------------------------------------------------
# Template: Usage Alerts
# ---------------------------------------------------------------------------

def _usage_80_percent(user: User, **kwargs: Any) -> tuple[str, str]:
    used = kwargs.get("used", 0)
    limit = kwargs.get("limit", 0)
    plan_name = kwargs.get("plan_name", "Starter")

    subject = f"You've used {used} of {limit} deal analyses this month"
    preheader = f"You're at 80% of your monthly limit on Parcel {plan_name}."

    content = f"""
<h1 style="font-size:22px; font-weight:700; margin:0 0 8px;">
  Approaching your monthly limit
</h1>
<p style="color:{TEXT_SECONDARY}; margin:0 0 24px;">
  Hey {_first_name(user)}, you've used {used} of your {limit} deal analyses
  this month on Parcel {plan_name}.
</p>

<!-- Usage bar -->
<div style="background:{BORDER}; border-radius:4px; height:8px; margin:0 0 8px;">
  <div style="background:{WARNING}; border-radius:4px; height:8px; width:80%;"></div>
</div>
<p style="font-family:{MONO_FONT}; font-size:14px; color:{WARNING}; margin:0 0 24px;">
  {used} / {limit} analyses used
</p>

<p style="margin:0 0 24px; font-size:15px;">
  Upgrade to Pro for unlimited analyses and never hit a limit again.
</p>

<div style="text-align:center;">
  {_cta_button("https://parceldesk.io/settings/billing", "Upgrade to Pro")}
</div>"""

    return subject, _base_layout(subject, preheader, content)


def _usage_100_percent(user: User, **kwargs: Any) -> tuple[str, str]:
    limit = kwargs.get("limit", 0)
    plan_name = kwargs.get("plan_name", "Starter")

    subject = f"You've reached your {limit}-analysis limit for this month"
    preheader = f"Upgrade to Pro for unlimited analyses on Parcel."

    content = f"""
<h1 style="font-size:22px; font-weight:700; margin:0 0 8px;">
  Monthly limit reached
</h1>
<p style="color:{TEXT_SECONDARY}; margin:0 0 24px;">
  Hey {_first_name(user)}, you've used all {limit} deal analyses included
  in your Parcel {plan_name} plan this month. Your limit resets on the 1st.
</p>

<!-- Full bar -->
<div style="background:{DANGER}; border-radius:4px; height:8px; margin:0 0 8px;"></div>
<p style="font-family:{MONO_FONT}; font-size:14px; color:{DANGER}; margin:0 0 24px;">
  {limit} / {limit} analyses used
</p>

<p style="margin:0 0 24px; font-size:15px;">
  Upgrade to Pro for unlimited analyses — no more waiting until next month.
</p>

<div style="text-align:center;">
  {_cta_button("https://parceldesk.io/settings/billing", "Upgrade to Pro")}
</div>"""

    return subject, _base_layout(subject, preheader, content)


# ---------------------------------------------------------------------------
# Template: Win-Back Sequence
# ---------------------------------------------------------------------------

def _winback_7d(user: User, **kwargs: Any) -> tuple[str, str]:
    subject = "We miss you — here's what's new in Parcel"
    preheader = "We've been building. Here's what you've missed."

    content = f"""
<h1 style="font-size:22px; font-weight:700; margin:0 0 8px;">
  A quick update from Parcel
</h1>
<p style="color:{TEXT_SECONDARY}; margin:0 0 24px;">
  Hey {_first_name(user)}, it's been a week since you canceled. No pressure —
  we just wanted to share what we've been working on.
</p>

<p style="margin:0 0 16px;">We've been shipping:</p>
<ul style="margin:0 0 24px; padding-left:20px; font-size:15px;">
  <li style="margin:6px 0;">Improved deal comparison with side-by-side metrics</li>
  <li style="margin:6px 0;">Faster AI chat responses with deeper analysis</li>
  <li style="margin:6px 0;">New portfolio tracking features</li>
</ul>

<p style="color:{TEXT_SECONDARY}; font-size:14px; margin:0 0 24px;">
  Your data is still here — all your deal analyses and pipeline deals are preserved.
</p>

<div style="text-align:center;">
  {_cta_button("https://parceldesk.io/dashboard", "See What's New")}
</div>

<p style="margin:24px 0 0; font-weight:600;">— Ivan</p>"""

    return subject, _base_layout(subject, preheader, content)


def _winback_30d(user: User, **kwargs: Any) -> tuple[str, str]:
    subject = "Come back to Parcel — 20% off your first 3 months"
    preheader = "Special offer: 20% off any plan for 3 months. Your data is waiting."

    content = f"""
<h1 style="font-size:22px; font-weight:700; margin:0 0 8px;">
  We'd love to have you back
</h1>
<p style="color:{TEXT_SECONDARY}; margin:0 0 24px;">
  Hey {_first_name(user)}, it's been a month. We've been improving
  Parcel and wanted to offer you a reason to come back.
</p>

{_info_box(f'''
<div style="text-align:center;">
  <div style="font-size:28px; font-weight:800; color:{ACCENT}; margin:8px 0;">20% OFF</div>
  <div style="font-size:15px; color:{TEXT_PRIMARY};">your first 3 months on any plan</div>
  <div style="font-size:13px; color:{TEXT_SECONDARY}; margin-top:4px;">Use code <strong style="font-family:{MONO_FONT};">COMEBACK20</strong> at checkout</div>
</div>
''')}

<p style="color:{TEXT_SECONDARY}; font-size:14px; margin:0 0 24px;">
  Your deal analyses and pipeline data are still here, exactly as you left them.
</p>

<div style="text-align:center;">
  {_cta_button("https://parceldesk.io/settings/billing", "Reactivate with 20% Off")}
</div>

<p style="margin:24px 0 0; font-weight:600;">— Ivan</p>"""

    return subject, _base_layout(subject, preheader, content)


def _winback_60d(user: User, **kwargs: Any) -> tuple[str, str]:
    subject = "Your deal data is still here — come back anytime"
    preheader = "Your analyses and pipeline are preserved. Pick up where you left off."

    content = f"""
<h1 style="font-size:22px; font-weight:700; margin:0 0 8px;">
  Your data is still waiting
</h1>
<p style="color:{TEXT_SECONDARY}; margin:0 0 24px;">
  Hey {_first_name(user)}, just a quick note: all of your Parcel data is
  still here and accessible. Nothing has been deleted.
</p>

<p style="margin:0 0 24px; font-size:15px;">
  Whenever you're ready to analyze your next deal, your account is one click away.
</p>

<div style="text-align:center;">
  {_cta_button("https://parceldesk.io/dashboard", "Open Parcel")}
</div>

<p style="color:{TEXT_SECONDARY}; font-size:14px; margin:24px 0 0;">
  This is our last email about reactivation. You won't hear from us again
  unless you opt in to product updates.
</p>
<p style="margin:8px 0 0; font-weight:600;">— Ivan</p>"""

    return subject, _base_layout(subject, preheader, content)


# ---------------------------------------------------------------------------
# Template: Password Reset (migrated from core/email.py, now light theme)
# ---------------------------------------------------------------------------

def _password_reset(user: User, **kwargs: Any) -> tuple[str, str]:
    reset_url = kwargs.get("reset_url", "")
    subject = "Reset your Parcel password"
    preheader = "Click the link to choose a new password. Expires in 1 hour."

    content = f"""
<h1 style="font-size:22px; font-weight:700; margin:0 0 8px;">
  Reset your password
</h1>
<p style="color:{TEXT_SECONDARY}; margin:0 0 24px;">
  We received a request to reset your password. Click the button below
  to choose a new one. This link expires in 1 hour.
</p>

<div style="text-align:center; margin:24px 0;">
  {_cta_button(reset_url, "Reset Password")}
</div>

<p style="color:{TEXT_MUTED}; font-size:13px; margin:24px 0 0;">
  If you didn't request this, you can safely ignore this email.
  Your password won't change until you click the link above.
</p>"""

    return subject, _base_layout(
        subject, preheader, content,
        show_unsubscribe=False,  # Transactional
    )


# ---------------------------------------------------------------------------
# Template: Password Changed
# ---------------------------------------------------------------------------

def _password_changed(user: User, **kwargs: Any) -> tuple[str, str]:
    subject = "Your Parcel password was changed"
    preheader = "Your password was successfully updated."

    content = f"""
<h1 style="font-size:22px; font-weight:700; margin:0 0 8px;">
  Password changed
</h1>
<p style="color:{TEXT_SECONDARY}; margin:0 0 24px;">
  Hey {_first_name(user)}, your Parcel password was just changed.
  If you made this change, no further action is needed.
</p>

<p style="color:{DANGER}; font-size:14px; margin:0 0 24px;">
  If you did NOT change your password, please
  <a href="https://parceldesk.io/forgot-password" style="color:{ACCENT}; font-weight:600;">
    reset it immediately</a>
  and contact us by replying to this email.
</p>"""

    return subject, _base_layout(
        subject, preheader, content,
        show_unsubscribe=False,  # Security transactional
    )


# ---------------------------------------------------------------------------
# Template: Document Complete (migrated from core/email.py, now light theme)
# ---------------------------------------------------------------------------

def _document_complete(user: User, **kwargs: Any) -> tuple[str, str]:
    filename = kwargs.get("filename", "document")
    document_id = kwargs.get("document_id", "")

    subject = f"Document analysis complete: {filename}"
    preheader = f"Your document '{filename}' has been analyzed and is ready to review."

    content = f"""
<h1 style="font-size:22px; font-weight:700; margin:0 0 8px;">
  Document analysis complete
</h1>
<p style="color:{TEXT_SECONDARY}; margin:0 0 24px;">
  Your document has been analyzed by AI and is ready to review.
</p>

{_info_box(f'<strong style="font-size:15px;">{filename}</strong>')}

<div style="text-align:center; margin:24px 0;">
  {_cta_button("https://parceldesk.io/documents", "View Analysis")}
</div>"""

    return subject, _base_layout(subject, preheader, content)


# ---------------------------------------------------------------------------
# Template registry
# ---------------------------------------------------------------------------

_TEMPLATE_REGISTRY: dict[str, Any] = {
    "welcome": _welcome,
    "trial_day7": _trial_day7,
    "trial_day12": _trial_day12,
    "trial_day13": _trial_day13,
    "trial_expired": _trial_expired,
    "payment_success": _payment_success,
    "payment_failed_day1": _payment_failed,
    "payment_failed_day3": _payment_failed,
    "payment_failed_day7": _payment_failed,
    "payment_failed_day14": _payment_failed,
    "plan_upgraded": _plan_upgraded,
    "plan_downgraded": _plan_downgraded,
    "subscription_canceled": _subscription_canceled,
    "usage_80_percent": _usage_80_percent,
    "usage_100_percent": _usage_100_percent,
    "winback_7d": _winback_7d,
    "winback_30d": _winback_30d,
    "winback_60d": _winback_60d,
    "password_reset": _password_reset,
    "password_changed": _password_changed,
    "document_complete": _document_complete,
}


def render_email(
    email_type: str,
    user: User,
    **kwargs: Any,
) -> tuple[str, str]:
    """Render an email template. Returns (subject, html_body).

    Raises KeyError if email_type is not in the registry.
    """
    template_fn = _TEMPLATE_REGISTRY[email_type]
    # Pass email_type through kwargs so dunning templates know which variant
    kwargs.setdefault("email_type", email_type)
    return template_fn(user, **kwargs)
```

---

## 4. Complete Email Catalog

### 4.1 Trial Lifecycle

| # | Email Type | Trigger | Timing | Subject | From | Category |
|---|---|---|---|---|---|---|
| 1 | `welcome` | User registers | Immediate (BackgroundTask) | "Welcome to Parcel -- your 14-day Pro trial is active" | `ivan@` | Transactional |
| 2 | `trial_day7` | Scheduled | Day 7, 9:00 AM | "You're halfway through your Pro trial" | `ivan@` | trial_reminders |
| 3 | `trial_day12` | Scheduled | Day 12, 9:00 AM | "Your Pro trial ends in 2 days" | `ivan@` | trial_reminders |
| 4 | `trial_day13` | Scheduled | Day 13, 9:00 AM | "Last day of Pro -- upgrade to keep your deal pipeline" | `ivan@` | trial_reminders |
| 5 | `trial_expired` | Scheduled | Day 14, 9:00 AM | "Your Pro trial has ended -- here's what happens next" | `ivan@` | trial_reminders |

**Cancellation logic:** When a trial user upgrades to a paid plan, call `cancel_scheduled_emails()` with all trial email types. The queue processor also checks `should_send()` as a safety net before sending.

### 4.2 Billing / Subscription

| # | Email Type | Trigger | Subject | From | Category |
|---|---|---|---|---|---|
| 6 | `payment_success` | Stripe `invoice.paid` | "Payment received -- $69.00 for Parcel Pro" | `billing@` | Transactional |
| 7 | `payment_failed_day1` | Stripe `invoice.payment_failed` (attempt 1) | "Action needed: your Parcel payment didn't go through" | `billing@` | Transactional |
| 8 | `payment_failed_day3` | Stripe `invoice.payment_failed` (attempt 2) | "Your payment is still failing -- update your card" | `billing@` | Transactional |
| 9 | `payment_failed_day7` | Stripe `invoice.payment_failed` (attempt 3) | "Your Parcel account will be downgraded in 7 days" | `billing@` | Transactional |
| 10 | `payment_failed_day14` | Stripe `invoice.payment_failed` (attempt 4+) | "Final notice: update your payment to keep Parcel Pro" | `billing@` | Transactional |
| 11 | `plan_upgraded` | Stripe `customer.subscription.updated` (upgrade) | "You've upgraded to Parcel Pro -- here's what's new" | `notifications@` | Transactional |
| 12 | `plan_downgraded` | Stripe `customer.subscription.updated` (downgrade) | "Your plan has been changed to Parcel Starter" | `notifications@` | Transactional |
| 13 | `subscription_canceled` | Stripe `customer.subscription.deleted` | "We've canceled your Parcel subscription" | `ivan@` | Transactional |

**Dunning mapping:** Stripe's `attempt_count` on the invoice object maps to the dunning step. The webhook handler uses this pattern:

```python
DUNNING_MAP = {
    1: EmailType.PAYMENT_FAILED_DAY1,
    2: EmailType.PAYMENT_FAILED_DAY3,
    3: EmailType.PAYMENT_FAILED_DAY7,
}
# attempt_count >= 4 → PAYMENT_FAILED_DAY14
```

### 4.3 Usage Alerts

| # | Email Type | Trigger | Subject | From | Category |
|---|---|---|---|---|---|
| 14 | `usage_80_percent` | Usage check after deal analysis | "You've used 16 of 20 deal analyses this month" | `notifications@` | product_updates |
| 15 | `usage_100_percent` | Usage check after deal analysis | "You've reached your 20-analysis limit for this month" | `notifications@` | product_updates |

**Trigger point:** Check usage count after every deal analysis. Send once per billing cycle (flag with a `usage_alert_sent_at` timestamp on the subscription record).

### 4.4 Win-Back (Post-Cancellation)

| # | Email Type | Trigger | Timing | Subject | From | Category |
|---|---|---|---|---|---|---|
| 16 | `winback_7d` | Scheduled after cancellation | Day 7 | "We miss you -- here's what's new in Parcel" | `ivan@` | marketing |
| 17 | `winback_30d` | Scheduled after cancellation | Day 30 | "Come back to Parcel -- 20% off your first 3 months" | `ivan@` | marketing |
| 18 | `winback_60d` | Scheduled after cancellation | Day 60 | "Your deal data is still here -- come back anytime" | `ivan@` | marketing |

**Cancellation logic:** When a canceled user resubscribes, call `cancel_scheduled_emails()` with all win-back email types.

### 4.5 Security / Auth (Transactional, always sent)

| # | Email Type | Trigger | Subject | From | Category |
|---|---|---|---|---|---|
| 19 | `password_reset` | User requests password reset | "Reset your Parcel password" | `notifications@` | Transactional |
| 20 | `password_changed` | User changes password | "Your Parcel password was changed" | `notifications@` | Transactional |

### 4.6 Product Notifications

| # | Email Type | Trigger | Subject | From | Category |
|---|---|---|---|---|---|
| 21 | `document_complete` | Document processing finishes | "Document analysis complete: {filename}" | `notifications@` | product_updates |

---

## 5. Async Sending via BackgroundTasks

### Strategy

Three sending paths, chosen by urgency and reliability requirements:

| Method | When to Use | Latency | Reliability |
|---|---|---|---|
| **Direct `send_email()`** | Password reset (user is waiting) | 200-400ms added to response | Single attempt, logs failure |
| **BackgroundTasks + `send_email()`** | Welcome email, notifications | 0ms on response, sends after | Single attempt, logs failure |
| **Queue via `enqueue_email()`** | Dunning, scheduled, win-back | 0-2 min queue delay | 3 retries with exponential backoff |

### Integration in Route Handlers

#### Registration Endpoint

```python
# backend/routers/auth.py

from fastapi import BackgroundTasks
from services.email_service import (
    send_email, schedule_trial_emails, EmailType, FROM_FOUNDER,
)
from services.email_templates import render_email


@router.post("/register", status_code=201)
async def register(
    body: RegisterRequest,
    response: Response,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    # ... create user, set cookies ...

    # Send welcome email immediately (BackgroundTask, no queue)
    subject, html = render_email(EmailType.WELCOME, user=user)
    background_tasks.add_task(
        send_email,
        to=user.email,
        subject=subject,
        html=html,
        from_address=FROM_FOUNDER,
        tags=[{"name": "category", "value": "welcome"}],
    )

    # Schedule trial lifecycle emails (queued, future-dated)
    schedule_trial_emails(db, user)
    db.commit()

    return AuthSuccessResponse(user=UserResponse.model_validate(user))
```

#### Stripe Webhook Handler

```python
# backend/routers/webhooks.py

import os
import stripe
from fastapi import APIRouter, Request, BackgroundTasks, HTTPException, Depends
from sqlalchemy.orm import Session

from database import get_db
from services.email_service import (
    send_email, enqueue_email, schedule_winback_emails,
    cancel_scheduled_emails, EmailType, FROM_BILLING,
)
from services.email_templates import render_email

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

# Map Stripe attempt_count to dunning email type
DUNNING_MAP = {
    1: EmailType.PAYMENT_FAILED_DAY1,
    2: EmailType.PAYMENT_FAILED_DAY3,
    3: EmailType.PAYMENT_FAILED_DAY7,
}


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, os.getenv("STRIPE_WEBHOOK_SECRET")
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Invalid signature")

    match event["type"]:

        case "invoice.paid":
            invoice = event["data"]["object"]
            user = _get_user_by_stripe_id(db, invoice["customer"])
            if user:
                subject, html = render_email(
                    EmailType.PAYMENT_SUCCESS,
                    user=user,
                    amount=f"${invoice['amount_paid'] / 100:.2f}",
                    plan_name=_plan_name_from_invoice(invoice),
                    invoice_url=invoice.get("hosted_invoice_url", ""),
                    period_end=_format_period_end(invoice),
                )
                background_tasks.add_task(
                    send_email,
                    to=user.email,
                    subject=subject,
                    html=html,
                    from_address=FROM_BILLING,
                    tags=[{"name": "category", "value": "billing"}],
                )

        case "invoice.payment_failed":
            invoice = event["data"]["object"]
            user = _get_user_by_stripe_id(db, invoice["customer"])
            if user:
                attempt = invoice.get("attempt_count", 1)
                email_type = DUNNING_MAP.get(
                    attempt, EmailType.PAYMENT_FAILED_DAY14
                )
                subject, html = render_email(
                    email_type,
                    user=user,
                    amount=f"${invoice['amount_due'] / 100:.2f}",
                    plan_name=_plan_name_from_invoice(invoice),
                )
                # Use queue for dunning (retry on failure is critical)
                enqueue_email(
                    db=db,
                    to=user.email,
                    subject=subject,
                    html=html,
                    email_type=email_type,
                    from_address=FROM_BILLING,
                    user_id=user.id,
                )
                db.commit()

        case "customer.subscription.updated":
            sub = event["data"]["object"]
            previous = event["data"].get("previous_attributes", {})
            user = _get_user_by_stripe_id(db, sub["customer"])
            if user and "items" in previous:
                # Determine upgrade vs downgrade
                new_plan = _plan_name_from_subscription(sub)
                email_type = EmailType.PLAN_UPGRADED  # or PLAN_DOWNGRADED
                subject, html = render_email(
                    email_type, user=user, plan_name=new_plan
                )
                background_tasks.add_task(
                    send_email,
                    to=user.email,
                    subject=subject,
                    html=html,
                    tags=[{"name": "category", "value": "billing"}],
                )
                # Cancel trial emails if user upgraded during trial
                cancel_scheduled_emails(db, user.id, [
                    EmailType.TRIAL_DAY_7,
                    EmailType.TRIAL_DAY_12,
                    EmailType.TRIAL_DAY_13,
                    EmailType.TRIAL_EXPIRED,
                ])
                db.commit()

        case "customer.subscription.deleted":
            sub = event["data"]["object"]
            user = _get_user_by_stripe_id(db, sub["customer"])
            if user:
                subject, html = render_email(
                    EmailType.SUBSCRIPTION_CANCELED, user=user
                )
                background_tasks.add_task(
                    send_email,
                    to=user.email,
                    subject=subject,
                    html=html,
                    tags=[{"name": "category", "value": "billing"}],
                )
                # Schedule win-back sequence
                schedule_winback_emails(db, user)
                db.commit()

    return {"status": "ok"}
```

---

## 6. Email Preference Management

### Database Schema: `email_preferences` JSONB Column

Add a JSONB column to the `users` table to replace the current boolean `email_notifications` field. The boolean remains for backward compatibility; new code reads from the JSONB column.

#### Alembic Migration

```python
"""Add email_preferences JSONB column to users table.

Revision ID: xxxx
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


def upgrade():
    op.add_column(
        "users",
        sa.Column(
            "email_preferences",
            JSONB,
            nullable=False,
            server_default='{"trial_reminders": true, "billing_alerts": true, "product_updates": true, "marketing": true, "weekly_digest": false}',
        ),
    )
    # Migrate: users who had email_notifications=False get marketing=False
    op.execute("""
        UPDATE users
        SET email_preferences = email_preferences || '{"marketing": false, "product_updates": false}'
        WHERE email_notifications = false
    """)


def downgrade():
    op.drop_column("users", "email_preferences")
```

#### Updated User Model

```python
# In backend/models/users.py — add this column

from sqlalchemy.dialects.postgresql import JSONB

class User(TimestampMixin, Base):
    __tablename__ = "users"

    # ... existing columns ...

    email_preferences = Column(
        JSONB,
        nullable=False,
        server_default='{"trial_reminders": true, "billing_alerts": true, "product_updates": true, "marketing": true, "weekly_digest": false}',
    )
```

#### Preference Categories

| Category | Default | Can Disable? | Covers |
|---|---|---|---|
| `trial_reminders` | `true` | Yes | Day 7, 12, 13, 14 trial lifecycle emails |
| `billing_alerts` | `true` | Partially | Usage alerts are opt-out; payment-failed/receipts always send |
| `product_updates` | `true` | Yes | Document complete, deal shared, usage alerts |
| `marketing` | `true` | Yes | Win-back sequence |
| `weekly_digest` | `false` | N/A (opt-in) | Weekly portfolio/pipeline summary |

#### API Endpoints

```python
# backend/routers/settings.py

from pydantic import BaseModel


class EmailPreferencesUpdate(BaseModel):
    trial_reminders: bool | None = None
    billing_alerts: bool | None = None
    product_updates: bool | None = None
    marketing: bool | None = None
    weekly_digest: bool | None = None


@router.get("/settings/email-preferences")
async def get_email_preferences(
    current_user: User = Depends(get_current_user),
):
    return current_user.email_preferences


@router.patch("/settings/email-preferences")
async def update_email_preferences(
    body: EmailPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prefs = dict(current_user.email_preferences)
    updates = body.model_dump(exclude_none=True)
    prefs.update(updates)
    current_user.email_preferences = prefs
    db.commit()
    return prefs
```

#### One-Click Unsubscribe Endpoint (No Auth Required)

```python
# backend/routers/email.py

import hmac
import hashlib
import os

from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/email", tags=["email"])

UNSUBSCRIBE_SECRET = os.getenv("UNSUBSCRIBE_SECRET", "change-me")


def generate_unsubscribe_token(user_id: str, category: str) -> str:
    """HMAC token for one-click unsubscribe (no login required)."""
    msg = f"{user_id}:{category}".encode()
    return hmac.new(UNSUBSCRIBE_SECRET.encode(), msg, hashlib.sha256).hexdigest()


def verify_unsubscribe_token(user_id: str, category: str, token: str) -> bool:
    expected = generate_unsubscribe_token(user_id, category)
    return hmac.compare_digest(expected, token)


@router.post("/unsubscribe")
async def one_click_unsubscribe(
    user_id: str = Query(...),
    category: str = Query(...),
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    """RFC 8058 one-click unsubscribe. No authentication required."""
    if not verify_unsubscribe_token(user_id, category, token):
        raise HTTPException(status_code=403, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    prefs = dict(user.email_preferences)
    if category in prefs:
        prefs[category] = False
        user.email_preferences = prefs
        db.commit()

    return {"status": "unsubscribed", "category": category}
```

#### List-Unsubscribe Headers

Added to all non-transactional emails:

```python
def _unsubscribe_headers(user_id: str, category: str) -> dict[str, str]:
    """Generate List-Unsubscribe headers for RFC 8058 compliance."""
    token = generate_unsubscribe_token(user_id, category)
    url = f"https://parceldesk.io/api/email/unsubscribe?user_id={user_id}&category={category}&token={token}"
    return {
        "List-Unsubscribe": f"<{url}>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    }
```

---

## 7. SPF/DKIM/DMARC DNS Records

All records go on the DNS for `parceldesk.io`.

### SPF (Sender Policy Framework)

Declares which servers may send email for this domain.

```
Type:  TXT
Host:  @
Value: v=spf1 include:resend.com ~all
```

If Google Workspace is added later for team email, append it:

```
v=spf1 include:resend.com include:_spf.google.com ~all
```

### DKIM (DomainKeys Identified Mail)

Cryptographic signature on each email. Resend generates keys and provides 3 CNAME records after domain verification:

```
Type:  CNAME
Host:  resend._domainkey
Value: (provided by Resend dashboard > Domains > parceldesk.io)

Type:  CNAME
Host:  resend2._domainkey
Value: (provided by Resend dashboard)

Type:  CNAME
Host:  resend3._domainkey
Value: (provided by Resend dashboard)
```

The exact CNAME values are unique per domain and appear in the Resend dashboard after adding the domain.

### DMARC (Domain-based Message Authentication)

Policy telling receiving servers what to do with unauthenticated email. Roll out in 3 phases:

**Phase 1 -- Monitor (first 2-4 weeks after launch):**

```
Type:  TXT
Host:  _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@parceldesk.io; pct=100
```

**Phase 2 -- Quarantine (after reviewing DMARC aggregate reports):**

```
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@parceldesk.io; pct=100
```

**Phase 3 -- Reject (full spoofing protection):**

```
Value: v=DMARC1; p=reject; rua=mailto:dmarc@parceldesk.io; pct=100
```

### Verification Checklist

1. Add `parceldesk.io` as a domain in Resend dashboard -- get 3 DKIM CNAME records
2. Add SPF TXT record
3. Add 3 DKIM CNAME records
4. Add DMARC TXT record (start with `p=none`)
5. Wait for DNS propagation (typically 1-4 hours, up to 48h)
6. Verify in Resend dashboard -- all green checkmarks
7. Test with [mail-tester.com](https://www.mail-tester.com/) -- target 10/10 score
8. After 2-4 weeks of clean DMARC reports, move to `p=quarantine`
9. After another 2-4 weeks, move to `p=reject`

---

## 8. PostgreSQL Email Queue

### Why a Queue Instead of Direct Sends

- Resend API can be temporarily unavailable -- retries recover the send
- Stripe webhooks must return 200 within 5 seconds -- can't block on email
- Scheduled emails (trial lifecycle, win-back) need future-dated delivery
- Failed sends need automated retry with exponential backoff
- PostgreSQL is already running on Railway -- no new infrastructure

### `backend/models/email_jobs.py`

```python
"""Email job queue model for reliable email delivery."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, UUID

from database import Base
from models.base import TimestampMixin


class EmailJob(TimestampMixin, Base):
    """A queued email job with retry support."""

    __tablename__ = "email_jobs"

    # Recipient & content
    to_address = Column(String, nullable=False, index=True)
    subject = Column(String(500), nullable=False)
    html_body = Column(Text, nullable=False)
    from_address = Column(
        String,
        nullable=False,
        default="Parcel <notifications@parceldesk.io>",
    )
    email_type = Column(String(50), nullable=False, index=True)
    tags = Column(JSONB, nullable=True)
    headers = Column(JSONB, nullable=True)

    # Foreign key to user (nullable for system emails)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Queue state
    status = Column(
        String(20),
        nullable=False,
        default="pending",
        index=True,
    )
    # status values: pending, processing, sent, failed, dead, canceled

    attempts = Column(Integer, nullable=False, default=0)
    max_attempts = Column(Integer, nullable=False, default=3)
    last_error = Column(Text, nullable=True)

    # Scheduling & delivery
    scheduled_for = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        index=True,
    )
    sent_at = Column(DateTime, nullable=True)
    canceled_at = Column(DateTime, nullable=True)
    next_retry_at = Column(DateTime, nullable=True)

    # Resend response (for tracking)
    resend_id = Column(String(100), nullable=True)
```

### Alembic Migration

```python
"""Create email_jobs table.

Revision ID: xxxx
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID


def upgrade():
    op.create_table(
        "email_jobs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
        sa.Column("to_address", sa.String, nullable=False, index=True),
        sa.Column("subject", sa.String(500), nullable=False),
        sa.Column("html_body", sa.Text, nullable=False),
        sa.Column("from_address", sa.String, nullable=False,
                  server_default="Parcel <notifications@parceldesk.io>"),
        sa.Column("email_type", sa.String(50), nullable=False, index=True),
        sa.Column("tags", JSONB, nullable=True),
        sa.Column("headers", JSONB, nullable=True),
        sa.Column("user_id", UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"),
                  nullable=True, index=True),
        sa.Column("status", sa.String(20), nullable=False,
                  server_default="pending", index=True),
        sa.Column("attempts", sa.Integer, nullable=False, server_default="0"),
        sa.Column("max_attempts", sa.Integer, nullable=False, server_default="3"),
        sa.Column("last_error", sa.Text, nullable=True),
        sa.Column("scheduled_for", sa.DateTime, nullable=False, index=True),
        sa.Column("sent_at", sa.DateTime, nullable=True),
        sa.Column("canceled_at", sa.DateTime, nullable=True),
        sa.Column("next_retry_at", sa.DateTime, nullable=True),
        sa.Column("resend_id", sa.String(100), nullable=True),
    )
    # Composite index for the queue processor query
    op.create_index(
        "ix_email_jobs_queue",
        "email_jobs",
        ["status", "scheduled_for", "next_retry_at"],
    )


def downgrade():
    op.drop_index("ix_email_jobs_queue")
    op.drop_table("email_jobs")
```

### Queue Processor

```python
# backend/tasks/email_worker.py

"""Email queue processor — called by cron every 1-2 minutes."""

import logging
from datetime import datetime, timedelta

from sqlalchemy import or_
from sqlalchemy.orm import Session

from models.email_jobs import EmailJob
from models.users import User
from services.email_service import send_email, user_allows_email

logger = logging.getLogger(__name__)

# Exponential backoff: 1 min, 5 min, 30 min
RETRY_DELAYS_SECONDS = [60, 300, 1800]


def process_email_queue(db: Session, batch_size: int = 20) -> dict:
    """Process pending email jobs. Returns stats dict.

    Called from the /internal/process-email-queue endpoint.
    """
    now = datetime.utcnow()
    stats = {"processed": 0, "sent": 0, "skipped": 0, "failed": 0, "dead": 0}

    # SELECT ... FOR UPDATE SKIP LOCKED prevents duplicate processing
    # if two cron invocations overlap
    jobs = (
        db.query(EmailJob)
        .filter(
            EmailJob.status.in_(["pending", "failed"]),
            EmailJob.scheduled_for <= now,
            EmailJob.attempts < EmailJob.max_attempts,
            or_(
                EmailJob.next_retry_at.is_(None),
                EmailJob.next_retry_at <= now,
            ),
        )
        .order_by(EmailJob.scheduled_for)
        .limit(batch_size)
        .with_for_update(skip_locked=True)
        .all()
    )

    for job in jobs:
        stats["processed"] += 1

        # Check user preferences (skip if user opted out)
        if job.user_id:
            user = db.query(User).filter(User.id == job.user_id).first()
            if user and not user_allows_email(user, job.email_type):
                job.status = "canceled"
                job.canceled_at = now
                stats["skipped"] += 1
                logger.info(
                    "Email job %s skipped — user opted out of %s",
                    job.id, job.email_type,
                )
                continue

        # Attempt to send
        job.attempts += 1
        job.status = "processing"
        db.flush()  # Release the lock on this row

        result = send_email(
            to=job.to_address,
            subject=job.subject,
            html=job.html_body,
            from_address=job.from_address,
            headers=job.headers,
            tags=job.tags,
        )

        if result:
            job.status = "sent"
            job.sent_at = now
            job.resend_id = result.get("id")
            stats["sent"] += 1
        else:
            if job.attempts >= job.max_attempts:
                job.status = "dead"
                job.last_error = "Max attempts reached"
                stats["dead"] += 1
                logger.error(
                    "Email job %s DEAD after %d attempts: to=%s type=%s",
                    job.id, job.attempts, job.to_address, job.email_type,
                )
            else:
                job.status = "failed"
                delay_idx = min(job.attempts - 1, len(RETRY_DELAYS_SECONDS) - 1)
                job.next_retry_at = now + timedelta(seconds=RETRY_DELAYS_SECONDS[delay_idx])
                job.last_error = "Send failed — will retry"
                stats["failed"] += 1

    db.commit()

    logger.info(
        "Email queue processed: %d total, %d sent, %d skipped, %d failed, %d dead",
        stats["processed"], stats["sent"], stats["skipped"],
        stats["failed"], stats["dead"],
    )
    return stats
```

### Cron Endpoint

```python
# backend/routers/internal.py

"""Internal endpoints for cron jobs — protected by shared secret."""

import os
import logging

from fastapi import APIRouter, HTTPException, Request, Depends
from sqlalchemy.orm import Session

from database import get_db
from tasks.email_worker import process_email_queue

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/internal", tags=["internal"])

CRON_SECRET = os.getenv("INTERNAL_CRON_SECRET", "")


def _verify_cron_secret(request: Request) -> None:
    """Verify the X-Internal-Secret header matches."""
    secret = request.headers.get("X-Internal-Secret", "")
    if not secret or secret != CRON_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.post("/process-email-queue")
async def trigger_email_queue(
    request: Request,
    db: Session = Depends(get_db),
):
    _verify_cron_secret(request)
    stats = process_email_queue(db)
    return {"status": "ok", **stats}
```

### Railway Cron Configuration

On Railway, use a cron service or an external cron provider that hits the endpoint:

```bash
# External cron (cron-job.org, Render cron, or similar)
# Every 2 minutes:
curl -X POST https://api.parceldesk.io/internal/process-email-queue \
  -H "X-Internal-Secret: $INTERNAL_CRON_SECRET" \
  -H "Content-Type: application/json"
```

Alternatively, use Railway's native cron support if the backend is deployed as a web + cron dual service.

---

## 9. Email Analytics Tracking

### Resend Tags

Every email includes a `tags` list for filtering in the Resend dashboard:

```python
tags = [
    {"name": "category", "value": "billing"},       # or "trial", "marketing", etc.
    {"name": "email_type", "value": "payment_failed_day1"},
    {"name": "user_plan", "value": "pro"},           # optional segmentation
]
```

### `backend/models/email_events.py`

```python
"""Email analytics events from Resend webhooks."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from database import Base
from models.base import TimestampMixin


class EmailEvent(TimestampMixin, Base):
    """Tracks email delivery, open, click, bounce, and complaint events."""

    __tablename__ = "email_events"

    resend_email_id = Column(String(100), nullable=False, index=True)
    event_type = Column(String(30), nullable=False, index=True)
    # event_type: email.sent, email.delivered, email.opened,
    #             email.clicked, email.bounced, email.complained

    recipient = Column(String, nullable=False, index=True)
    email_type = Column(String(50), nullable=True)  # from tags
    click_url = Column(Text, nullable=True)          # for click events
    bounce_type = Column(String(30), nullable=True)  # hard, soft
    metadata = Column(JSONB, nullable=True)           # full event payload
```

### Resend Webhook Handler

```python
# backend/routers/webhooks.py (add to existing file)

import hmac
import hashlib

RESEND_WEBHOOK_SECRET = os.getenv("RESEND_WEBHOOK_SECRET", "")


@router.post("/webhooks/resend")
async def resend_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """Handle Resend email delivery events for analytics."""
    body = await request.json()

    # Verify webhook signature (Resend uses svix)
    svix_id = request.headers.get("svix-id", "")
    svix_timestamp = request.headers.get("svix-timestamp", "")
    svix_signature = request.headers.get("svix-signature", "")

    # Signature verification (simplified — use svix library in production)
    if not svix_id or not RESEND_WEBHOOK_SECRET:
        raise HTTPException(status_code=400, detail="Missing signature")

    event_type = body.get("type", "")
    data = body.get("data", {})

    # Extract email_type from tags if present
    email_type_tag = None
    for tag in data.get("tags", []):
        if tag.get("name") == "email_type":
            email_type_tag = tag.get("value")
            break

    from models.email_events import EmailEvent

    event = EmailEvent(
        resend_email_id=data.get("email_id", ""),
        event_type=event_type,
        recipient=data.get("to", [""])[0] if isinstance(data.get("to"), list) else data.get("to", ""),
        email_type=email_type_tag,
        click_url=data.get("click", {}).get("url") if event_type == "email.clicked" else None,
        bounce_type=data.get("bounce", {}).get("type") if event_type == "email.bounced" else None,
        metadata=data,
    )
    db.add(event)

    # Handle bounces — suppress future sends to hard-bounced addresses
    if event_type == "email.bounced" and data.get("bounce", {}).get("type") == "hard":
        _suppress_email(db, event.recipient)

    # Handle complaints — auto-unsubscribe from marketing
    if event_type == "email.complained":
        _unsubscribe_marketing(db, event.recipient)

    db.commit()
    return {"status": "ok"}


def _suppress_email(db: Session, email: str) -> None:
    """Mark a hard-bounced email as suppressed."""
    user = db.query(User).filter(User.email == email).first()
    if user:
        prefs = dict(user.email_preferences)
        prefs["_suppressed"] = True  # Internal flag — blocks all non-transactional
        user.email_preferences = prefs
        logger.warning("Hard bounce — suppressed email for user %s", user.id)


def _unsubscribe_marketing(db: Session, email: str) -> None:
    """Auto-unsubscribe a user who filed a complaint."""
    user = db.query(User).filter(User.email == email).first()
    if user:
        prefs = dict(user.email_preferences)
        prefs["marketing"] = False
        prefs["weekly_digest"] = False
        user.email_preferences = prefs
        logger.warning("Complaint received — unsubscribed marketing for user %s", user.id)
```

### Key Metrics to Monitor

| Metric | Target | Action If Breached |
|---|---|---|
| Delivery rate | > 98% | Check DNS records, review content for spam triggers |
| Hard bounce rate | < 2% | Verify email addresses at registration, clean list |
| Complaint rate | < 0.1% | Review email frequency, improve unsubscribe visibility |
| Transactional open rate | 30-50% | Improve subject lines (A/B test via Resend) |
| Dunning click rate | 30-40% | Adjust urgency language, CTA placement |
| Trial email click rate | 15-25% | Refine content, test send timing |
| Unsubscribe rate | < 0.5% per send | Reduce frequency, improve targeting |

### Admin Analytics Query Examples

```sql
-- Email delivery stats by type (last 30 days)
SELECT
    email_type,
    COUNT(*) FILTER (WHERE event_type = 'email.delivered') AS delivered,
    COUNT(*) FILTER (WHERE event_type = 'email.opened') AS opened,
    COUNT(*) FILTER (WHERE event_type = 'email.clicked') AS clicked,
    COUNT(*) FILTER (WHERE event_type = 'email.bounced') AS bounced,
    COUNT(*) FILTER (WHERE event_type = 'email.complained') AS complained
FROM email_events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY email_type
ORDER BY delivered DESC;

-- Dunning recovery rate (did user update card after dunning email click?)
SELECT
    ej.email_type,
    COUNT(DISTINCT ej.user_id) AS users_dunned,
    COUNT(DISTINCT ee.recipient) FILTER (WHERE ee.event_type = 'email.clicked') AS clicked,
    ROUND(
        100.0 * COUNT(DISTINCT ee.recipient) FILTER (WHERE ee.event_type = 'email.clicked')
        / NULLIF(COUNT(DISTINCT ej.user_id), 0), 1
    ) AS click_rate_pct
FROM email_jobs ej
LEFT JOIN email_events ee ON ej.resend_id = ee.resend_email_id
WHERE ej.email_type LIKE 'payment_failed_%'
  AND ej.created_at > NOW() - INTERVAL '30 days'
GROUP BY ej.email_type;
```

---

## CRITICAL DECISIONS

### CD-1: Stay with Resend

**Decision:** Use Resend for all transactional and lifecycle emails.

**Rationale:** Already installed and configured with `notifications@parceldesk.io`. Best Python DX of all four options evaluated. Free tier covers through ~500 users. Pro tier ($20/mo) handles up to 50,000 emails/month. No reason to add complexity with a second provider.

**Risk:** Resend is a younger platform (est. 2023). Mitigation: the email queue with retry logic insulates the app from temporary API outages. Migration to another provider (Postmark, SES) only requires changing the `send_email()` function — all templates and queue logic are provider-agnostic.

### CD-2: PostgreSQL Queue Over Celery/Redis

**Decision:** Use a PostgreSQL `email_jobs` table as the email queue instead of Celery + Redis.

**Rationale:** Parcel already runs PostgreSQL on Railway. Adding Redis and a Celery worker adds infrastructure cost ($7-15/mo), deployment complexity, and a new failure mode. The PG-based queue with `SELECT ... FOR UPDATE SKIP LOCKED` handles the expected volume (under 10,000 emails/month) without breaking a sweat. Celery becomes worthwhile only at 10,000+ users with high-volume batch sends.

**Trade-off:** Queue processing has 1-2 minute latency (cron interval). For immediate emails (welcome, password reset), use `BackgroundTasks` + direct `send_email()` to bypass the queue entirely.

### CD-3: Light Email Templates

**Decision:** All email templates use light backgrounds (`#FFFFFF` body, `#F8FAFC` surfaces) even though the app UI is dark-themed.

**Rationale:** Dark email templates break in dark-mode email clients — Gmail, Apple Mail, and Outlook apply their own dark-mode inversions, which double-invert dark templates into unreadable states. The Parcel indigo (`#6366F1`) accent carries through as brand consistency. The existing dark templates in `core/email.py` should be migrated to the light theme.

### CD-4: Three-Tier Sending Strategy

**Decision:** Three paths for sending, chosen by urgency and reliability needs.

| Path | Use Case | Example |
|---|---|---|
| Direct `send_email()` | User is waiting for the email | Password reset |
| `BackgroundTasks` + `send_email()` | Immediate but not blocking | Welcome, plan upgraded |
| Queue via `enqueue_email()` | Scheduled or retry-critical | Trial lifecycle, dunning, win-back |

**Rationale:** Password resets cannot tolerate 1-2 minute queue delay. Welcome emails should not add 300ms to the registration response. Dunning emails are revenue-critical and must retry on failure.

### CD-5: Stripe Hybrid — Custom Dunning, Stripe Receipts (Initially)

**Decision:** Send dunning (payment-failed) emails through Resend with a custom 4-step sequence. Use Stripe's built-in receipt emails initially; replace with branded custom receipts in a later phase.

**Rationale:** Stripe only sends a single generic "payment failed" email with no escalation sequence. The research shows dunning sequences recover 10-30% of failed payments — this is the highest-ROI email work. Meanwhile, Stripe's receipts are legally compliant and functional. Custom receipts are a nice-to-have, not a must-have.

### CD-6: Granular Preferences via JSONB (Not Booleans)

**Decision:** Replace the single `email_notifications` boolean with an `email_preferences` JSONB column containing per-category opt-in/opt-out flags.

**Rationale:** CAN-SPAM requires unsubscribe for marketing emails. Users should be able to stop win-back emails without losing billing alerts. JSONB is extensible — new categories can be added without migrations. The default values are permissive (everything on except weekly digest) to maximize engagement while respecting opt-out.

### CD-7: DMARC Phased Rollout

**Decision:** Start DMARC at `p=none` (monitor only), escalate to `p=quarantine` after 2-4 weeks of clean reports, then to `p=reject`.

**Rationale:** Jumping straight to `p=reject` risks blocking legitimate emails if SPF/DKIM are misconfigured. The monitoring phase catches configuration issues before they affect deliverability. Target timeline: `p=reject` within 6-8 weeks of email system launch.

### CD-8: Cancel Scheduled Emails on State Change

**Decision:** When a user upgrades (during trial) or resubscribes (after cancellation), actively cancel their pending scheduled emails via `cancel_scheduled_emails()`.

**Rationale:** Without this, a user who upgrades on Day 6 would still receive "your trial ends in 2 days" on Day 12. The queue processor also checks `user_allows_email()` as a safety net, but proactive cancellation is the primary defense. This requires the `user_id` FK on `email_jobs` so we can query by user and type.

### CD-9: No External Template Engine

**Decision:** Email templates are Python string functions in `email_templates.py`, not Jinja2 or an external template system.

**Rationale:** The templates are developer-maintained, not marketer-editable. Python f-strings with helper functions (`_base_layout`, `_cta_button`, `_info_box`) are simpler than adding Jinja2 as a dependency, faster to render, and easier to type-check. If a visual template editor is needed later, React Email (which Resend supports) can be evaluated — but that requires a Node.js build step which adds complexity to the Python backend.

### CD-10: Win-Back Sequence Capped at 60 Days

**Decision:** Three win-back emails at 7, 30, and 60 days post-cancellation. No emails after day 60.

**Rationale:** The churn research shows win-back conversion drops sharply after 60 days. Continuing to email users who left 3-6 months ago risks complaints and damages sender reputation. The 60-day email explicitly states "this is our last email" — clean closure that preserves brand trust. If a major feature launch happens later, a one-time broadcast to churned users (with unsubscribe) is a better approach than an indefinite drip sequence.
