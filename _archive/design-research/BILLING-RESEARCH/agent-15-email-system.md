# Agent 15 — Transactional & Lifecycle Email System

Research for Parcel (parceldesk.io) — a real estate deal analysis SaaS.
Stack: FastAPI + PostgreSQL (Railway) | React + TypeScript (Vercel).
Current state: Resend SDK already installed (`resend>=2.0.0`), `backend/core/email.py` has two working senders (document-complete, password-reset) using `notifications@parceldesk.io`.

---

## 1. Transactional Email Provider Comparison

### 1.1 Resend

| Attribute | Details |
|---|---|
| **Pricing** | Free: 100 emails/day, 3,000/month. Pro: $20/mo for 50,000 emails. |
| **Deliverability** | Built by ex-SendGrid engineers. Dedicated IPs available on Business ($80/mo). Automatic IP warmup. |
| **DX** | Best-in-class. Python SDK (`resend.Emails.send()`), React Email templates, webhook support, domain verification UI. |
| **Latency** | ~200-400ms per send (US regions). |
| **Key feature** | React Email integration — design templates in JSX, render to HTML server-side. |
| **Drawback** | Younger platform (est. 2023). No built-in drip/sequence engine. No SMTP relay (API-only). |

### 1.2 Postmark

| Attribute | Details |
|---|---|
| **Pricing** | Free: 100 emails/month. 10,000 emails: $15/mo. 100,000: $85/mo. |
| **Deliverability** | Industry-leading. 99%+ inbox rates. Dedicated transactional-only infrastructure (no marketing mixed in). |
| **DX** | Good. Python library (`postmarker`). Template system with Mustachio syntax. Message Streams separate transactional vs. broadcast. |
| **Latency** | ~100-300ms. Fastest median delivery of the four. |
| **Key feature** | Message Streams enforce separation of transactional and marketing email at the infrastructure level, protecting transactional reputation. |
| **Drawback** | Strictly transactional — explicitly bans marketing/bulk email. Drip sequences must be self-managed. Higher per-email cost at scale. |

### 1.3 SendGrid (Twilio)

| Attribute | Details |
|---|---|
| **Pricing** | Free: 100 emails/day forever. Essentials: $19.95/mo for 50,000. Pro: $89.95/mo for 100,000. |
| **Deliverability** | Good, but declining reputation among developers. Shared IP pools can be noisy. Dedicated IPs from Pro tier up. |
| **DX** | Mature but dated. Python SDK (`sendgrid`). Dynamic Templates with Handlebars. Marketing Campaigns built-in. |
| **Latency** | ~300-800ms. Higher variance than Resend/Postmark. |
| **Key feature** | Full marketing suite (contacts, segments, automation) alongside transactional. Largest ecosystem. |
| **Drawback** | Acquisition by Twilio led to support degradation. Dashboard UX is cluttered. Account suspensions reported without clear reason. IP reputation can be impacted by shared pools. |

### 1.4 AWS SES

| Attribute | Details |
|---|---|
| **Pricing** | $0.10/1,000 emails. First 62,000/month free if sent from EC2. Cheapest at scale. |
| **Deliverability** | Good once warmed. Requires manual IP warmup, reputation monitoring, bounce/complaint handling. |
| **DX** | Lowest-level. Boto3 `ses.send_email()`. No template designer. Must build everything: bounce handling, suppression lists, analytics. |
| **Latency** | ~200-500ms. Region-dependent. |
| **Key feature** | Unbeatable cost at high volume. Full AWS ecosystem integration. |
| **Drawback** | Significant operational overhead. Sandbox mode requires manual production access request. No built-in analytics dashboard. Must implement suppression list, bounce processing, complaint feedback loops yourself. |

### 1.5 Comparison Matrix

| Factor | Resend | Postmark | SendGrid | AWS SES |
|---|---|---|---|---|
| **Cost (10K/mo)** | Free | $15/mo | $19.95/mo | $1.00 |
| **Cost (100K/mo)** | $40/mo | $85/mo | $89.95/mo | $10.00 |
| **Setup time** | 30 min | 1 hour | 1 hour | 3-4 hours |
| **Deliverability** | Very good | Excellent | Good | Good (manual) |
| **Python DX** | Excellent | Good | Good | Low-level |
| **Template system** | React Email | Mustachio | Handlebars | None |
| **Built-in analytics** | Basic | Good | Full | None |
| **Webhook support** | Yes | Yes | Yes | Via SNS |
| **Drip sequences** | No | No | Yes | No |

---

## 2. Complete Email Catalog for Parcel

### 2.1 Authentication & Account

| # | Email Type | Trigger | Subject Line | Priority |
|---|---|---|---|---|
| 1 | **Welcome + trial start** | User registers | "Welcome to Parcel — your 14-day Pro trial is active" | P0 |
| 2 | **Email verification** | User registers | "Verify your email address" | P0 |
| 3 | **Password reset** | User requests reset | "Reset your Parcel password" | P0 (DONE) |
| 4 | **Password changed** | Password updated | "Your Parcel password was changed" | P1 |

### 2.2 Trial Lifecycle

| # | Email Type | Trigger | Subject Line | Priority |
|---|---|---|---|---|
| 5 | **Trial midpoint** (Day 7) | Cron/scheduler | "You're halfway through your Pro trial — here's what you've unlocked" | P1 |
| 6 | **Trial ending soon** (Day 12) | Cron/scheduler | "Your Pro trial ends in 2 days" | P0 |
| 7 | **Trial final warning** (Day 13) | Cron/scheduler | "Last day of Pro — upgrade to keep your deal pipeline" | P0 |
| 8 | **Trial expired** (Day 14) | Cron/scheduler | "Your Pro trial has ended — here's what happens next" | P0 |

### 2.3 Billing & Subscription

| # | Email Type | Trigger | Subject Line | Priority |
|---|---|---|---|---|
| 9 | **Payment successful / receipt** | Stripe `invoice.paid` | "Payment received — $29.00 for Parcel Starter" | P0 |
| 10 | **Payment failed (Day 1)** | Stripe `invoice.payment_failed` | "Action needed: your Parcel payment didn't go through" | P0 |
| 11 | **Payment failed (Day 3)** | Retry event | "Your payment is still failing — update your card" | P0 |
| 12 | **Payment failed (Day 7)** | Retry event | "Your Parcel account will be downgraded in 7 days" | P0 |
| 13 | **Payment failed (Day 14)** | Final retry | "Final notice: update your payment to keep Parcel Pro" | P0 |
| 14 | **Plan upgraded** | Stripe `customer.subscription.updated` | "You've upgraded to Parcel Pro — here's what's new" | P1 |
| 15 | **Plan downgraded** | Stripe `customer.subscription.updated` | "Your plan has been changed to Parcel Starter" | P1 |
| 16 | **Subscription canceled** | Stripe `customer.subscription.deleted` | "We've canceled your Parcel subscription" | P1 |
| 17 | **Invoice available** | Stripe `invoice.finalized` | "Your Parcel invoice for March 2026 is ready" | P2 |
| 18 | **Usage approaching limit** | Usage check (80%) | "You've used 80% of your monthly deal analyses" | P1 |

### 2.4 Win-Back / Re-Engagement

| # | Email Type | Trigger | Subject Line | Priority |
|---|---|---|---|---|
| 19 | **Win-back (30 days)** | 30d after cancel | "We miss you — here's what's new in Parcel" | P2 |
| 20 | **Win-back (60 days)** | 60d after cancel | "Special offer: 20% off your first 3 months back" | P2 |
| 21 | **Win-back (90 days)** | 90d after cancel | "Your deal data is still here — come back anytime" | P3 |

### 2.5 Product Notifications (already partially built)

| # | Email Type | Trigger | Subject Line | Priority |
|---|---|---|---|---|
| 22 | **Document analysis complete** | Processing done | "Document analysis complete: {filename}" | DONE |
| 23 | **Deal shared with you** | Team share action | "{name} shared a deal with you on Parcel" | P2 |
| 24 | **Weekly digest** | Cron (Monday AM) | "Your Parcel weekly: 3 deals analyzed, portfolio up 2.1%" | P3 |

---

## 3. Email Content Outlines

### 3.1 Welcome + Trial Start (Email #1)

```
Subject: Welcome to Parcel — your 14-day Pro trial is active
From: Ivan from Parcel <ivan@parceldesk.io>

HEADER: Parcel logo (indigo on dark)

BODY:
  Hey {first_name},

  Welcome to Parcel. Your 14-day Pro trial is now active —
  no credit card needed.

  Here's what you can do right now:

  [Icon] Analyze deals across 5 strategies (BRRRR, Flip,
         Buy & Hold, Wholesale, Creative Finance)
  [Icon] AI-powered chat — ask questions about any deal
  [Icon] Pipeline — track deals from lead to close
  [Icon] PDF reports — share branded analysis with partners

  [CTA Button: "Analyze Your First Deal →"]
  Links to: https://parceldesk.io/analyze

  Your trial includes full Pro features:
  • Unlimited deal analyses
  • AI chat specialist
  • Document upload & extraction
  • PDF export

  Trial ends: {trial_end_date}

FOOTER:
  Questions? Reply to this email — it goes straight to me.

  — Ivan, Founder of Parcel

  [Unsubscribe] [Manage preferences]
```

### 3.2 Trial Ending Soon — Day 12 (Email #6)

```
Subject: Your Pro trial ends in 2 days
From: Parcel <notifications@parceldesk.io>

BODY:
  Hey {first_name},

  Your Parcel Pro trial ends on {trial_end_date}.

  During your trial, you:
  • Analyzed {deal_count} deals
  • Generated {report_count} PDF reports
  • Had {chat_count} AI conversations

  [PLAN COMPARISON CARD]
  Free: 3 analyses/mo, no AI chat, no PDF export
  Starter ($29/mo): 20 analyses, AI chat, PDF export
  Pro ($69/mo): Unlimited everything

  [CTA Button: "Upgrade Now — Keep Your Pro Features →"]

  No pressure — your data stays safe on the Free plan.

FOOTER:
  [Unsubscribe from trial reminders]
```

### 3.3 Payment Failed — Day 1 Dunning (Email #10)

```
Subject: Action needed: your Parcel payment didn't go through
From: Parcel <billing@parceldesk.io>

BODY:
  Hey {first_name},

  We tried to charge {amount} for your Parcel {plan_name}
  subscription, but the payment didn't go through.

  This usually happens when:
  • Your card expired or was replaced
  • Your bank flagged the charge
  • Insufficient funds

  [CTA Button: "Update Payment Method →"]
  Links to: https://parceldesk.io/settings/billing

  We'll retry automatically in 2 days. If the issue persists,
  your account will be downgraded to the Free plan after 14 days.

  Your deals, pipeline, and documents are safe regardless.

FOOTER:
  Need help? Reply to this email.
  [Unsubscribe]
```

### 3.4 Trial Expired (Email #8)

```
Subject: Your Pro trial has ended — here's what happens next
From: Ivan from Parcel <ivan@parceldesk.io>

BODY:
  Hey {first_name},

  Your 14-day Pro trial ended today. Here's what changes:

  [WHAT YOU KEEP]
  ✓ All your existing deals and analyses
  ✓ Your pipeline and documents
  ✓ 3 new deal analyses per month

  [WHAT'S PAUSED]
  ✗ AI chat specialist
  ✗ PDF report export
  ✗ Unlimited analyses

  [PLAN CARDS — Starter $29/mo | Pro $69/mo]

  [CTA Button: "Choose a Plan →"]

  No rush — upgrade anytime and pick up right where you left off.

FOOTER:
  — Ivan
  [Unsubscribe]
```

---

## 4. Email Template Design System

### 4.1 Brand Consistency with Dark Theme

Parcel's UI uses a dark theme (#08080F base, #0F0F1A surface, #6366F1 indigo accent). However, **dark email templates are problematic** for several reasons:

1. **Dark mode email clients** (Gmail, Apple Mail, Outlook) apply their own dark transformations, which double-invert dark templates into unreadable states.
2. **Accessibility** — WCAG contrast ratios are harder to maintain in dark email across clients.
3. **Rendering inconsistency** — Gmail strips `<style>` blocks; only inline styles survive. Dark backgrounds with light text require careful fallback.

**Recommended approach: Light templates with dark accents.**

```
Background:      #FFFFFF (white)
Surface card:    #F8FAFC (slate-50)
Text primary:    #0F172A (slate-900)
Text secondary:  #64748B (slate-500)
Accent:          #6366F1 (indigo — matches app)
CTA button:      #6366F1 bg, #FFFFFF text
Border:          #E2E8F0 (slate-200)
Logo:            "Parcel" in #6366F1 (same as app sidebar)
Font:            -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
Numbers:         'JetBrains Mono' web font NOT supported in email;
                 use Menlo, Monaco, 'Courier New', monospace as fallback
```

### 4.2 Mobile-First Template Structure

Real estate investors are mobile-first. All email templates must follow:

- **Max-width: 600px** (industry standard, renders well on all clients)
- **Single-column layout** — no multi-column grids (break on mobile Gmail)
- **CTA buttons: min 44px height, full-width on mobile** (tap target)
- **Font size: 16px body, 14px secondary** (prevents iOS zoom)
- **Preheader text** — first 40-90 chars visible in inbox preview

### 4.3 Base HTML Template Skeleton

```html
<!DOCTYPE html>
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
<body style="margin:0; padding:0; background:#F1F5F9;
             font-family:-apple-system,BlinkMacSystemFont,
             'Segoe UI',Roboto,sans-serif;">

  <!-- Preheader (hidden in body, visible in inbox preview) -->
  <div style="display:none; max-height:0; overflow:hidden;">
    {preheader_text}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="background:#F1F5F9;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
               style="background:#FFFFFF; border-radius:8px;
                      border:1px solid #E2E8F0; max-width:600px; width:100%;">

          <!-- Logo Header -->
          <tr>
            <td style="padding:32px 32px 0;">
              <span style="color:#6366F1; font-size:24px;
                           font-weight:700;">Parcel</span>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:24px 32px 32px; color:#0F172A;
                        font-size:16px; line-height:1.6;">
              {content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px; border-top:1px solid #E2E8F0;
                        color:#64748B; font-size:12px; line-height:1.5;">
              Parcel Technologies, Inc.<br>
              <a href="{unsubscribe_url}" style="color:#6366F1;">
                Unsubscribe</a> ·
              <a href="https://parceldesk.io/settings"
                 style="color:#6366F1;">Manage preferences</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### 4.4 CTA Button (Inline-Styled, Outlook-Safe)

```html
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml"
  href="{url}" style="height:48px; v-text-anchor:middle; width:240px;"
  arcsize="17%" strokecolor="#6366F1" fillcolor="#6366F1">
<center style="color:#FFFFFF; font-family:sans-serif; font-size:16px;
               font-weight:600;">
  {cta_text}
</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="{url}" style="display:inline-block; background:#6366F1;
   color:#FFFFFF; padding:14px 28px; border-radius:8px;
   text-decoration:none; font-weight:600; font-size:16px;
   mso-padding-alt:0;">
  {cta_text}
</a>
<!--<![endif]-->
```

---

## 5. Unsubscribe Handling & CAN-SPAM Compliance

### 5.1 Legal Requirements

**CAN-SPAM Act (US)**:
- Every commercial email must include a visible unsubscribe mechanism
- Unsubscribe must be processed within 10 business days
- Physical mailing address must be included
- "From" and "Subject" must not be deceptive
- **Transactional emails (password reset, receipts) are exempt** from most requirements but must not contain primarily commercial content

**GDPR (EU users)**:
- Consent must be explicit and provable for marketing emails
- Right to withdraw consent at any time
- Must clearly distinguish marketing from service emails

**CAN-SPAM penalty**: up to $50,120 per violating email.

### 5.2 Email Category Classification

| Category | Examples | Unsubscribe required? | Consent needed? |
|---|---|---|---|
| **Service/Transactional** | Password reset, payment receipt, payment failed | No | No (implied) |
| **Account lifecycle** | Welcome, trial reminders, plan changes | Recommended | No (relationship) |
| **Marketing/Win-back** | Win-back, weekly digest, feature announcements | **Yes (required)** | **Yes (opt-in)** |

### 5.3 Implementation Pattern

The `email_notifications` boolean on the User model is too coarse. Extend to granular preferences:

```python
# Recommended: email_preferences JSONB column on users table
# Default value:
{
    "trial_reminders": True,
    "billing_alerts": True,     # Cannot be fully disabled (payment-failed is transactional)
    "product_updates": True,    # Document complete, deal shared
    "marketing": True,          # Win-back, weekly digest
    "weekly_digest": False      # Opt-in, not opt-out
}
```

### 5.4 One-Click Unsubscribe (RFC 8058)

Gmail and Yahoo now **require** List-Unsubscribe headers for bulk senders (>5,000/day). Implement now as a best practice:

```python
headers = {
    "List-Unsubscribe": "<https://parceldesk.io/api/email/unsubscribe?token={token}>",
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
}
```

Resend supports custom headers via the `headers` parameter in the send call.

---

## 6. Email Deliverability: SPF, DKIM, DMARC for parceldesk.io

### 6.1 DNS Records Required

All three records are set on your domain registrar (likely wherever parceldesk.io DNS is managed — probably Vercel or a separate registrar).

**SPF (Sender Policy Framework)** — Declares which servers can send email for parceldesk.io.

```
Type: TXT
Host: @
Value: v=spf1 include:resend.com ~all
```

If you later add other senders (e.g., Google Workspace for team email), append them:
```
v=spf1 include:resend.com include:_spf.google.com ~all
```

**DKIM (DomainKeys Identified Mail)** — Cryptographic signature on every email. Resend generates the keys and gives you CNAME records to add:

```
Type: CNAME
Host: resend._domainkey
Value: (provided by Resend dashboard after domain verification)
```

Resend typically requires 3 CNAME records for DKIM. These appear in the Resend dashboard under Domains > parceldesk.io.

**DMARC (Domain-based Message Authentication)** — Policy telling receiving servers what to do with unauthenticated email.

Start with monitoring (p=none), then move to quarantine, then reject:

```
# Phase 1 — Monitor (first 2-4 weeks)
Type: TXT
Host: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@parceldesk.io; pct=100

# Phase 2 — Quarantine (after reviewing reports)
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@parceldesk.io; pct=100

# Phase 3 — Reject (full protection)
Value: v=DMARC1; p=reject; rua=mailto:dmarc@parceldesk.io; pct=100
```

### 6.2 Verification Checklist

1. Add domain in Resend dashboard → get CNAME records
2. Add SPF TXT record to DNS
3. Add 3 DKIM CNAME records to DNS
4. Add DMARC TXT record (start with p=none)
5. Wait for DNS propagation (up to 48h, usually 1-4h)
6. Verify in Resend dashboard — should show green checkmarks
7. Test with [mail-tester.com](https://www.mail-tester.com/) — aim for 10/10 score
8. After 2-4 weeks of clean DMARC reports, escalate to p=quarantine, then p=reject

### 6.3 Sending Domains Strategy

| From address | Purpose | Notes |
|---|---|---|
| `notifications@parceldesk.io` | Transactional (password reset, document complete) | Already in use |
| `billing@parceldesk.io` | Payment receipts, dunning, invoice | Signals financial importance |
| `ivan@parceldesk.io` | Welcome, trial lifecycle, win-back | Personal touch from founder |

All three use the same verified domain — no additional DNS setup needed.

---

## 7. Stripe Built-in Emails vs. Custom Emails

### 7.1 Stripe's Built-in Options

Stripe can send these automatically (toggle in Dashboard > Settings > Emails):

| Email | Stripe built-in? | Quality |
|---|---|---|
| Payment receipt | Yes | Generic but functional |
| Invoice PDF | Yes | Good — includes line items |
| Payment failed | Yes | Basic — single notice, no sequence |
| Upcoming renewal | Yes | 3 days before renewal |
| Subscription canceled confirmation | Yes | Basic |

### 7.2 Pros of Stripe's Built-in Emails

- **Zero implementation cost** — toggle on in dashboard
- **Always accurate** — amount, date, plan name come directly from Stripe
- **Receipt includes invoice link** — customers can download PDF
- **Handles tax display** if Stripe Tax is configured
- **Sent from `receipts@stripe.com`** — high deliverability, recognized sender

### 7.3 Cons of Stripe's Built-in Emails

- **No brand customization** — can add logo and accent color, but template is Stripe's
- **No dunning sequence** — single "payment failed" email, no escalation series
- **No trial lifecycle emails** — Stripe doesn't know about your trial UX
- **No usage data** — can't include "you analyzed 12 deals this month"
- **No deep links** — CTA links to Stripe's hosted invoice page, not your app
- **Mixed sender identity** — `receipts@stripe.com` doesn't build brand recognition
- **No analytics** — no open/click tracking
- **Limited subject line control** — "Your invoice from Parcel" (can't customize)

### 7.4 Recommended Hybrid Approach

| Email type | Who sends it | Why |
|---|---|---|
| **Payment receipt** | **Stripe** (Phase 1) → Custom (Phase 2) | Stripe receipts work fine initially. Replace with branded version once email system is mature. |
| **Invoice PDF** | **Stripe** (keep) | Stripe-generated invoices are legally compliant and well-formatted. Link to them from your custom emails. |
| **Payment failed (dunning)** | **Custom** (Resend) | Must be a multi-step sequence. Stripe only sends one. |
| **Trial lifecycle** | **Custom** (Resend) | Stripe has no concept of your trial flow. |
| **Plan changed** | **Custom** (Resend) | Need to explain feature changes, not just billing changes. |
| **Subscription canceled** | **Custom** (Resend) | Need branded message + win-back setup. |

---

## 8. FastAPI Integration Patterns

### 8.1 Current Pattern (Synchronous, Blocking)

The existing `backend/core/email.py` calls `resend.Emails.send()` synchronously. This blocks the request handler for 200-400ms per email send. Acceptable for password resets (user is waiting anyway) but not for webhook handlers or batch operations.

### 8.2 Recommended Pattern: Background Tasks

FastAPI's built-in `BackgroundTasks` provides fire-and-forget execution after the response is sent. No additional infrastructure needed.

```python
# backend/core/email.py — refactored

import logging
import os
from typing import Any

import resend

logger = logging.getLogger(__name__)

_RESEND_CONFIGURED = False


def _ensure_configured() -> bool:
    """Lazily configure the Resend API key. Returns True if ready."""
    global _RESEND_CONFIGURED
    if _RESEND_CONFIGURED:
        return True
    api_key = os.getenv("RESEND_API_KEY", "")
    if not api_key:
        logger.warning("RESEND_API_KEY not set — email disabled")
        return False
    resend.api_key = api_key
    _RESEND_CONFIGURED = True
    return True


def send_email(
    to: str,
    subject: str,
    html: str,
    from_address: str = "Parcel <notifications@parceldesk.io>",
    headers: dict[str, str] | None = None,
    tags: list[dict[str, str]] | None = None,
) -> dict[str, Any] | None:
    """Send a single email via Resend. Returns the response or None on failure.

    Never raises — all exceptions are caught and logged.
    """
    if not _ensure_configured():
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

        result = resend.Emails.send(payload)
        logger.info(f"Email sent to {to}: {subject}")
        return result
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {e}")
        return None
```

### 8.3 Using BackgroundTasks in Route Handlers

```python
# In a route handler (e.g., auth.py register endpoint)

from fastapi import BackgroundTasks

@router.post("/register", status_code=201)
async def register(
    body: RegisterRequest,
    response: Response,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    # ... create user ...

    # Queue welcome email — runs AFTER response is sent
    background_tasks.add_task(
        send_email,
        to=user.email,
        subject="Welcome to Parcel — your 14-day Pro trial is active",
        html=build_welcome_html(user.name, trial_end_date),
        from_address="Ivan from Parcel <ivan@parceldesk.io>",
        tags=[{"name": "category", "value": "welcome"}],
    )

    return AuthSuccessResponse(user=UserResponse.model_validate(user))
```

### 8.4 Stripe Webhook Handler with Email Dispatch

```python
# backend/routers/webhooks.py

import stripe
from fastapi import APIRouter, Request, BackgroundTasks, HTTPException

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

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
                background_tasks.add_task(
                    send_email,
                    to=user.email,
                    subject=f"Payment received — ${invoice['amount_paid']/100:.2f} for Parcel",
                    html=build_receipt_html(user, invoice),
                    from_address="Parcel <billing@parceldesk.io>",
                    tags=[{"name": "category", "value": "billing"}],
                )

        case "invoice.payment_failed":
            invoice = event["data"]["object"]
            user = _get_user_by_stripe_id(db, invoice["customer"])
            attempt = invoice.get("attempt_count", 1)
            if user:
                background_tasks.add_task(
                    send_dunning_email, user, attempt, db
                )

        case "customer.subscription.deleted":
            sub = event["data"]["object"]
            user = _get_user_by_stripe_id(db, sub["customer"])
            if user:
                background_tasks.add_task(
                    send_email,
                    to=user.email,
                    subject="We've canceled your Parcel subscription",
                    html=build_cancellation_html(user),
                    tags=[{"name": "category", "value": "billing"}],
                )
                # Schedule win-back emails
                background_tasks.add_task(
                    schedule_winback_sequence, user.id, db
                )

    return {"status": "ok"}
```

### 8.5 Scheduled Emails (Trial Lifecycle, Win-Back)

For time-delayed emails (trial reminders, win-back), you need a scheduler. Options ranked by complexity:

**Option A: Database + Cron (simplest, recommended for Parcel)**

```python
# backend/models/scheduled_emails.py

class ScheduledEmail(TimestampMixin, Base):
    __tablename__ = "scheduled_emails"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    email_type = Column(String, nullable=False)  # "trial_day7", "winback_30d", etc.
    scheduled_for = Column(DateTime, nullable=False)
    sent_at = Column(DateTime, nullable=True)
    canceled_at = Column(DateTime, nullable=True)


# backend/tasks/email_scheduler.py

async def process_scheduled_emails(db: Session):
    """Called by a cron job every 15 minutes."""
    now = datetime.utcnow()
    pending = db.query(ScheduledEmail).filter(
        ScheduledEmail.scheduled_for <= now,
        ScheduledEmail.sent_at.is_(None),
        ScheduledEmail.canceled_at.is_(None),
    ).all()

    for scheduled in pending:
        user = db.query(User).filter(User.id == scheduled.user_id).first()
        if not user:
            continue

        # Check if user still qualifies (e.g., didn't upgrade before trial end)
        if should_send(scheduled.email_type, user, db):
            html = build_email_html(scheduled.email_type, user, db)
            subject = get_subject_line(scheduled.email_type, user)
            send_email(to=user.email, subject=subject, html=html)
            scheduled.sent_at = now
        else:
            scheduled.canceled_at = now

    db.commit()
```

On Railway, add a cron job via `railway.toml` or use an external cron service (e.g., cron-job.org, Render cron) that hits a protected endpoint every 15 minutes:

```python
@router.post("/internal/process-scheduled-emails")
async def trigger_email_processing(
    request: Request,
    db: Session = Depends(get_db),
):
    # Verify internal secret
    secret = request.headers.get("X-Internal-Secret")
    if secret != os.getenv("INTERNAL_CRON_SECRET"):
        raise HTTPException(status_code=403)

    await process_scheduled_emails(db)
    return {"status": "ok"}
```

**Option B: Celery + Redis (overkill for current scale)**

Adds Redis dependency, worker process, and deployment complexity. Only worthwhile at 10,000+ users with high email volume.

**Option C: External service (Inngest, Trigger.dev)**

Managed job queues with cron + delayed execution. Good DX but adds another vendor dependency and cost.

---

## 9. Email Analytics

### 9.1 Resend Built-in Analytics

Resend provides via dashboard and API:
- **Delivery status**: sent, delivered, bounced, complained
- **Open tracking**: pixel-based (unreliable since Apple MPP, ~40-60% accuracy)
- **Click tracking**: link wrapping (reliable)
- **Tags**: filter analytics by tag (e.g., `category:billing`, `category:trial`)

### 9.2 Resend Webhooks for Custom Analytics

```python
# Track email events in your own database

@router.post("/webhooks/resend")
async def resend_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    event_type = body.get("type")  # "email.delivered", "email.opened",
                                    # "email.clicked", "email.bounced",
                                    # "email.complained"

    # Store in an email_events table for your own analytics
    db.add(EmailEvent(
        email_id=body["data"]["email_id"],
        event_type=event_type,
        recipient=body["data"]["to"],
        metadata=body["data"],
    ))
    db.commit()
    return {"status": "ok"}
```

### 9.3 Key Metrics to Track

| Metric | Target | Why it matters |
|---|---|---|
| Delivery rate | >98% | Below this indicates DNS/reputation issues |
| Bounce rate | <2% | Hard bounces hurt sender reputation |
| Complaint rate | <0.1% | Gmail flags domains with >0.3% complaints |
| Open rate | 30-50% (transactional) | Benchmark; unreliable due to Apple MPP |
| Click rate (trial emails) | 15-25% | Directly drives conversion |
| Click rate (dunning) | 30-40% | Critical for revenue recovery |
| Unsubscribe rate | <0.5% per campaign | High rate signals bad targeting/frequency |

### 9.4 Conversion Attribution

Tag emails with `category` and `email_type` to measure:
- Trial → Paid conversion by email engagement (did users who opened Day 7 email convert more?)
- Dunning recovery rate (% of failed payments recovered after email sequence)
- Win-back reactivation rate

---

## 10. Email Queue / Job System for Reliability

### 10.1 Why Queuing Matters

- Resend API can be temporarily unavailable (rare but happens)
- Stripe webhook handlers must return 200 quickly (<5 seconds) or Stripe retries
- Batch operations (monthly invoices, weekly digests) can't block the event loop
- Failed sends need retry logic

### 10.2 Recommended: PostgreSQL-Based Queue (No New Infrastructure)

Since Parcel already runs PostgreSQL on Railway, use it as a lightweight job queue. This avoids adding Redis or another service.

```python
# backend/models/email_queue.py

class EmailJob(TimestampMixin, Base):
    __tablename__ = "email_jobs"

    to_address = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    html_body = Column(Text, nullable=False)
    from_address = Column(String, default="Parcel <notifications@parceldesk.io>")
    tags = Column(JSONB, nullable=True)
    headers = Column(JSONB, nullable=True)

    status = Column(String, default="pending")  # pending, sent, failed, dead
    attempts = Column(Integer, default=0)
    max_attempts = Column(Integer, default=3)
    last_error = Column(Text, nullable=True)

    scheduled_for = Column(DateTime, default=datetime.utcnow)
    sent_at = Column(DateTime, nullable=True)
    next_retry_at = Column(DateTime, nullable=True)
```

```python
# backend/tasks/email_worker.py

RETRY_DELAYS = [60, 300, 1800]  # 1min, 5min, 30min

def process_email_queue(db: Session, batch_size: int = 20):
    """Process pending emails. Call from cron every 1-2 minutes."""
    now = datetime.utcnow()

    jobs = db.query(EmailJob).filter(
        EmailJob.status.in_(["pending", "failed"]),
        EmailJob.scheduled_for <= now,
        EmailJob.attempts < EmailJob.max_attempts,
        or_(
            EmailJob.next_retry_at.is_(None),
            EmailJob.next_retry_at <= now,
        ),
    ).order_by(EmailJob.scheduled_for).limit(batch_size).all()

    for job in jobs:
        job.attempts += 1
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
        else:
            if job.attempts >= job.max_attempts:
                job.status = "dead"
                logger.error(f"Email job {job.id} dead after {job.attempts} attempts")
            else:
                job.status = "failed"
                delay = RETRY_DELAYS[min(job.attempts - 1, len(RETRY_DELAYS) - 1)]
                job.next_retry_at = now + timedelta(seconds=delay)

    db.commit()
```

### 10.3 Enqueueing Instead of Direct Send

```python
# Helper to enqueue instead of sending directly

def enqueue_email(
    db: Session,
    to: str,
    subject: str,
    html: str,
    from_address: str = "Parcel <notifications@parceldesk.io>",
    scheduled_for: datetime | None = None,
    tags: list[dict] | None = None,
):
    """Add an email to the queue for reliable delivery."""
    job = EmailJob(
        to_address=to,
        subject=subject,
        html_body=html,
        from_address=from_address,
        scheduled_for=scheduled_for or datetime.utcnow(),
        tags=tags,
    )
    db.add(job)
    # Don't commit here — let the caller's transaction handle it
```

---

## RECOMMENDATIONS FOR PARCEL

### Phase 1 — Foundation (Week 1-2)

1. **Stay with Resend.** It is already installed, the SDK is the cleanest, the free tier (3,000/month) covers early growth, and the `notifications@parceldesk.io` sender is already configured. No reason to switch.

2. **Complete DNS authentication immediately.** Add SPF, DKIM (3 CNAME records from Resend dashboard), and DMARC (start with `p=none`) to parceldesk.io DNS. Test with mail-tester.com. This is a prerequisite for deliverability — do it before sending any more emails at scale.

3. **Refactor `backend/core/email.py` to use a centralized `send_email()` function** with lazy Resend configuration, tag support, and structured logging. The current pattern of setting `resend.api_key` in every function is fragile.

4. **Implement the Welcome email (#1).** Add a `BackgroundTasks` call in the register endpoint. Use `from_address="Ivan from Parcel <ivan@parceldesk.io>"` for the personal founder touch. Include the trial end date and a CTA to analyze the first deal.

5. **Switch email templates to light background** (`#FFFFFF` body, `#F8FAFC` card surfaces, `#6366F1` accent). The current dark templates in `email.py` will render unpredictably in dark-mode email clients. Keep the Parcel indigo branding but use a light canvas.

### Phase 2 — Trial & Billing Emails (Week 3-4, alongside Stripe integration)

6. **Build the `scheduled_emails` table and cron processor** for time-delayed emails. On user registration, insert rows for Day 7, Day 12, Day 13, and Day 14 trial emails. Process via a cron endpoint hit every 15 minutes. Cancel scheduled emails if the user upgrades before they fire.

7. **Build the 4-step dunning sequence** (Day 1, 3, 7, 14 after payment failure). This is the highest-ROI email work — industry data shows dunning emails recover 10-30% of failed payments. Wire these to Stripe's `invoice.payment_failed` webhook using the `attempt_count` field.

8. **Use Stripe's built-in receipts initially** (toggle on in Stripe Dashboard). Replace with custom branded receipts in a later pass. The dunning sequence is more important than custom receipts.

9. **Implement payment receipt, plan-changed, and subscription-canceled emails** via Stripe webhook handlers. Use `BackgroundTasks` to avoid blocking the webhook response.

### Phase 3 — Reliability & Compliance (Week 5-6)

10. **Add the PostgreSQL-based email queue** (`email_jobs` table) for retry logic and reliability. Migrate from direct `send_email()` calls to `enqueue_email()` for all non-critical emails. Keep password reset as direct send (user is waiting).

11. **Expand `email_notifications` to granular preferences** (JSONB column: `trial_reminders`, `billing_alerts`, `product_updates`, `marketing`, `weekly_digest`). Add a preferences management page at `/settings/notifications`. Check preferences before every non-transactional send.

12. **Add `List-Unsubscribe` headers** to all non-transactional emails. Implement a one-click unsubscribe endpoint that updates user preferences without requiring login.

13. **Set up Resend webhooks** to track delivery, bounce, and complaint events. Store in an `email_events` table. Monitor bounce rate (<2%) and complaint rate (<0.1%) — these directly impact deliverability.

### Phase 4 — Optimization (Month 2+)

14. **Build win-back sequence** (30/60/90 day emails after cancellation). The 60-day email with a discount offer typically has the highest reactivation rate. Schedule these when `customer.subscription.deleted` fires.

15. **Add usage-approaching-limit email** (#18). Query deal analysis counts and send at 80% threshold. This serves dual purpose: helpful notification and upsell prompt.

16. **Implement the weekly digest** as an opt-in email. Include: deals analyzed, portfolio performance changes, pipeline movement. Real estate investors value regular portfolio summaries.

17. **Escalate DMARC policy** from `p=none` to `p=quarantine` (after 2-4 weeks of clean reports), then to `p=reject` (after another 2-4 weeks). This prevents spoofing of parceldesk.io.

### Cost Projection

| Growth stage | Monthly emails | Resend cost | Notes |
|---|---|---|---|
| 0-100 users | ~1,000 | $0 (free tier) | Well within 3,000/month limit |
| 100-500 users | ~5,000 | $0 (free tier) | Still under limit with careful sends |
| 500-2,000 users | ~15,000 | $20/month (Pro) | First paid tier |
| 2,000-10,000 users | ~80,000 | $40/month (Pro) | Still very affordable |
| 10,000+ users | ~300,000+ | $80/month (Business) | Dedicated IP, priority support |

Email infrastructure will cost less than a single Pro subscription per month through the first several thousand users. It is one of the cheapest and highest-ROI investments in the billing stack.
