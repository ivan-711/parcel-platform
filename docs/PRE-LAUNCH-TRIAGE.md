# Pre-Launch Triage -- 2026-04-17

## TL;DR

- **Trial-as-default is working but undocumented**: Every new user gets 7-day Carbon (PRO) trial via JIT provisioning. When it expires, they silently drop to Steel (free). Ivan needs to decide: keep this, make it opt-in, or drop it.
- **3 HIGH security audit findings are unfixed**: timing-safe comparison, hardcoded salt fallback, f-string in advisory lock. All <15 min each. Ship before launch.
- **Onboarding text bug**: "Explore your sample deals in Pipeline" should say "Properties" -- samples don't create pipeline entries.
- **No security headers**: HSTS, CSP, X-Frame-Options not configured. 30-min fix, should ship before launch.
- **Stripe checkout has zero test coverage**: The flow works but has never been tested end-to-end. Needs manual test + at minimum a smoke test before real users hit it.

---

## Section 1: Trial-as-Default

### Current behavior

| Step | What happens | Where |
|------|-------------|-------|
| Clerk signup | User created with `plan_tier="free"`, no trial | `clerk_webhooks.py:199-204` |
| First API call | JIT provisioning sets `plan_tier="free"` + `trial_ends_at=now+7d` | `jwt.py:107-108` |
| During trial | `get_effective_tier()` returns PRO (Carbon features) | `tier_gate.py:24-26` |
| Trial expires | `get_effective_tier()` returns FREE (Steel limits) | `tier_gate.py:28` |
| User subscribes | Stripe webhook sets `plan_tier` to paid tier | `webhooks/__init__.py:184` |
| Subscription cancels | Stripe webhook sets `plan_tier="free"` | `webhooks/__init__.py:213,239` |

### What users see vs. get

| | Steel (Free) | Carbon Trial (7d) | Carbon Paid ($79/mo) |
|--|---|---|---|
| Analyses/mo | 3 | Unlimited | Unlimited |
| AI messages/mo | 5 | 150 | 150 |
| Pipeline | No | Yes | Yes |
| Portfolio | No | Yes | Yes |
| PDF export | No | Yes | Yes |
| Skip traces | No | No | 200 (Titanium only) |

### Signup text

`frontend/src/pages/Register.tsx:61` displays "Start your 7-day free Carbon trial" to all visitors. This is hardcoded in the component, not Clerk dashboard config.

### Discrepancy: Webhook vs. JIT

The Clerk webhook creates users with NO trial. JIT provisioning (first API call) creates users WITH a 7-day trial. If the webhook fires first (normal flow), the user row exists when JIT runs, so JIT doesn't fire -- meaning **some users may NOT get a trial** depending on timing between webhook delivery and first frontend API call. If the webhook is slow, JIT creates the user with the trial. If the webhook is fast, JIT finds the existing user and skips provisioning.

This is a race condition. Currently masked because JIT also has an email-lookup fallback that links `clerk_user_id` to the webhook-created row without setting trial.

### Three options

**Option A: Keep trial, default-on (current state + fix the race)**
- Pro: Higher activation -- users see full product before hitting walls
- Con: Every user gets 7 days of unlimited analyses (cost: Anthropic API calls for narratives)
- Fix needed: Move `trial_ends_at` assignment into the webhook handler so ALL users get it consistently. ~15 min change in `clerk_webhooks.py`.
- Funnel: Users try Carbon features -> trial expires -> hit Steel walls -> upgrade CTA

**Option B: Opt-in trial at signup**
- Pro: Only engaged users burn trial days; less Anthropic API cost
- Con: Lower activation; users on Steel see a very limited product (no pipeline, no portfolio)
- Changes: Add trial toggle to Register.tsx, pass flag to webhook/JIT, conditionally set `trial_ends_at`. ~2 hours.
- Funnel: Users on Steel hit walls immediately -> "Try Carbon free" CTA -> trial -> upgrade

**Option C: Drop trial entirely, Steel default**
- Pro: Simplest; no trial expiry confusion; clear free/paid boundary
- Con: Steel is very restrictive (3 analyses, no pipeline) -- may not be enough to hook users
- Changes: Remove `trial_ends_at` from JIT, update Register.tsx text. ~30 min.
- Funnel: Users hit walls on analysis #4 -> upgrade CTA -> paid

**Recommendation**: Option A with the webhook race fix. The 7-day trial lets users experience the full product, and the Steel fallback creates natural upgrade pressure. The webhook fix is trivial. The Anthropic API cost is bounded by the 7-day window and usage patterns (most trial users won't run >10 analyses).

---

## Section 2: Followups Triage

### Security audit findings (unfixed)

| # | Issue | Severity | Effort | Risk if deferred | Ivan decision? |
|---|-------|----------|--------|-----------------|----------------|
| H-1 | Timing-unsafe API key comparison in `sequences.py:718` | BLOCKER | 5 min | Theoretical timing attack on internal key | No -- just fix |
| H-2 | Hardcoded IP hash salt fallback in `reports.py:24` | BLOCKER | 10 min | Predictable hashes if env var missing | No -- just fix |
| H-3 | f-string in advisory lock param in `webhooks/__init__.py:43` | BLOCKER | 5 min | SQL injection vector (low practical risk but easy fix) | No -- just fix |
| M-2 | File upload validates extension only, not magic bytes | HIGH | 1 hr | Malicious file upload with renamed extension | No -- just fix |
| M-3 | Filename not sanitized in S3 key | HIGH | 15 min | Path traversal in S3 key | No -- just fix |
| M-4 | Calculator errors expose internal details | MEDIUM | 30 min | Info leak in error messages | No |
| M-5 | Missing rate limits on sensitive endpoints | MEDIUM | 1 hr | Abuse of unprotected endpoints | No |
| M-6 | No security headers (HSTS, CSP, etc.) | HIGH | 30 min | Missing browser security protections | No -- just fix |
| M-7 | Worker health endpoint exposes Redis errors | MEDIUM | 10 min | Info leak in health check | No |
| M-8 | Shared deal endpoint leaks user first name | MEDIUM | 10 min | Minor PII leak on public endpoint | Yes -- decide if name should be there |

### Functional bugs and UX issues

| # | Issue | Severity | Effort | Risk if deferred | Ivan decision? |
|---|-------|----------|--------|-----------------|----------------|
| F-1 | Onboarding text says "Pipeline" but samples are in Properties | HIGH | 5 min | Confuses every new user on first session | No -- just fix |
| F-2 | Trial race: webhook vs JIT provisioning inconsistency | HIGH | 15 min | Some users may not get trial | Yes -- depends on Option A/B/C |
| F-3 | Sporadic 401 on first load after signup | MEDIUM | ~0 | Already handled by ensureAuthHeaders + retry. React Query auto-retries. Narrow window. | No -- monitor |
| F-4 | "Stuck Analyzing..." pill report | LOW | N/A | Not reproduced in code audit. May have been a transient state during stream. | No -- monitor |
| F-5 | POSTHOG_API_KEY not set in Railway | LOW | 5 min | Telemetry disabled; no usage data | No -- just set env var |

### Items already in SECURITY-FOLLOWUPS.md

| # | Issue | Severity | Effort | Risk if deferred | Ivan decision? |
|---|-------|----------|--------|-----------------|----------------|
| S-1 | PostgreSQL RLS policies (defense-in-depth) | MEDIUM | 2-3 days | App-level RLS bypass via raw SQL | No -- post-launch |
| S-4 | SSE stream timeout | MEDIUM | 1 hr | Hung streams consume server resources | No |
| S-6 | Module-level token cache not per-user | LOW | 1 hr | Mitigated by Clerk refresh cycle | No |
| S-7 | localStorage user data (plaintext JSON) | LOW | 1 hr | Non-sensitive data only | No |
| S-8 | A11y: Missing DialogContent description | LOW | 30 min | Console warning, not user-facing | No |
| S-9 | CSP: Google Maps gen_204 beacon blocked | LOW | 30 min | Cosmetic (likely ad blocker) | No |
| S-10 | Safari stream cache hydration | LOW | Investigation | Masked by scenario-ID fallback | No |

---

## Section 3: Recommended Roadmap (Apr 17 -- May 12)

### Week 1: Apr 17-23 -- Security + trial fix

| Day | Task | Effort | Type |
|-----|------|--------|------|
| Thu 17 | Fix H-1, H-2, H-3 (3 security BLOCKERs) | 20 min | Code |
| Thu 17 | Fix F-1: onboarding "Pipeline" -> "Properties" text | 5 min | Code |
| Thu 17 | Add security headers M-6 (HSTS, CSP, X-Frame-Options) | 30 min | Code |
| Fri 18 | Fix M-2, M-3 (file upload validation + S3 sanitization) | 1.5 hr | Code |
| Fri 18 | Ivan decides trial strategy (Option A/B/C) | -- | Decision |
| Fri 18 | Implement trial decision (webhook race fix if Option A) | 15-120 min | Code |
| Sat-Sun | Set POSTHOG_API_KEY on Railway | 5 min | Config |
| Sat-Sun | Logo vote -> winner selected | -- | Async |
| Mon-Wed | Stripe checkout E2E manual test with test cards | 2 hr | Testing |
| Mon-Wed | Fix M-4, M-5, M-7 (error messages, rate limits, health) | 2 hr | Code |

### Week 2: Apr 24-30 -- Polish + screenshots

| Task | Effort | Type |
|------|--------|------|
| Real app screenshots for landing page | 2-3 hr | Design (async) |
| Logo: Figma refinement from vote winner | -- | Design (async) |
| Stripe billing test coverage (pytest) | 4 hr | Code |
| SSE stream timeout S-4 | 1 hr | Code |
| Fix M-8 if Ivan decides to remove name from shared deals | 10 min | Code |
| Fix S-8 a11y DialogContent warnings | 30 min | Code |

### Week 3: May 1-7 -- Integration testing + edge cases

| Task | Effort | Type |
|------|--------|------|
| Full Stripe lifecycle test: signup -> trial -> expire -> upgrade -> cancel -> downgrade | 4 hr | Testing |
| Cross-browser smoke test (Chrome, Safari, Firefox, mobile Safari) | 2 hr | Testing |
| Trial expiry UX: what does the user see when trial ends? Add a banner/modal? | 2-4 hr | Code (if needed) |
| PostgreSQL RLS policies S-1 (if time permits) | 2-3 days | Code |
| Soft launch to 5-10 beta testers | -- | Launch |

### Week 4: May 8-11 -- Final polish

| Task | Effort | Type |
|------|--------|------|
| Fix any bugs from beta testers | Variable | Code |
| Landing page final copy pass | 1-2 hr | Content |
| DNS + production Stripe keys (live mode) | 1 hr | Config |
| Final security scan (npm audit, pip-audit) | 30 min | Testing |
| Launch checklist walkthrough | 1 hr | Process |
| **May 12: Launch** | | |

### Async / parallel tracks

- Logo vote + Figma refinement (Apr 17-30)
- Real app screenshots (whenever UI is stable)
- PostHog setup + verify events flowing (after env var is set)
- Landing page copy polish (can happen anytime)

---

## Section 4: Items That Need Ivan's Decision Before Coding

1. **Trial strategy (Option A/B/C)**: Keep current 7-day Carbon trial for all users, make it opt-in, or drop it entirely? This affects signup text, webhook code, and the entire freemium funnel. See Section 1.

2. **Shared deal name leak (M-8)**: The public shared deal endpoint includes the user's first name. Is this intentional (social proof / trust signal) or a PII leak to fix?

3. **Trial expiry UX**: When a user's 7-day trial expires, they silently lose Pipeline, Portfolio, PDF export, and drop to 3 analyses/month. Should there be a warning banner at day 5-6, a modal on first post-trial login, or just let the feature gates speak for themselves?

4. **PostgreSQL RLS timing**: Database-level RLS (S-1) is 2-3 days of work. Ship before launch (May 12) or defer to post-launch hardening? Current app-level RLS works but doesn't protect against raw SQL or direct DB connections.
