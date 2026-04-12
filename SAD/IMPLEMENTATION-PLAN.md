# Parcel Platform — Definitive Implementation Plan

> **Author:** Claude (independent technical assessment)
> **Date:** April 6, 2026
> **Source material:** MASTER-AUDIT-FINDINGS.md (8 audits merged), CANONICAL-PRODUCT-BLUEPRINT.md, full codebase review of 15+ critical files
> **Principle:** Every fix is the proper solution. No band-aids. No deadline pressure. Long-term quality.

---

# Section 1: Shared Patterns & Conventions

Every sprint MUST follow these patterns. They are established here once and enforced everywhere. If a sprint introduces code that violates these patterns, that is a bug.

---

## 1.1 Backend Error Response Shape

Every HTTP error response from the API uses this shape. No exceptions.

```python
# Standard error detail dict — used in every HTTPException
{"error": "Human-readable message", "code": "MACHINE_READABLE_CODE"}

# Example usage in any endpoint:
raise HTTPException(
    status_code=status.HTTP_400_BAD_REQUEST,
    detail={"error": "Could not parse address. Please check the format.", "code": "ADDRESS_PARSE_FAILED"},
)
```

**Rules:**
- `error` is always a single sentence a user could read. Never a stack trace. Never `str(e)`.
- `code` is always UPPER_SNAKE_CASE. Used by frontend for conditional logic.
- SSE error events use the same shape: `yield _sse("error", {"error": "...", "code": "..."})`
- 500 errors caught by exception handlers log the full traceback server-side but return: `{"error": "Something went wrong. Please try again.", "code": "INTERNAL_ERROR"}`

---

## 1.2 Frontend Error vs Empty State Pattern

Every page that fetches data MUST distinguish three states: loading, error, empty. The check order matters.

```typescript
// CORRECT pattern — check error BEFORE checking empty
const { data, isLoading, isError, error } = useQuery({ ... })

if (isLoading) return <LoadingSkeleton />

if (isError) {
  return (
    <ErrorState
      message={error instanceof Error ? error.message : 'Failed to load data'}
      onRetry={() => queryClient.invalidateQueries({ queryKey: ['...'] })}
    />
  )
}

const items = data?.items ?? []
if (items.length === 0) return <EmptyState />

// Render data...
```

**Anti-pattern (currently in Reports, Sequences, Mail, Skip Tracing):**
```typescript
// WRONG — this shows empty state when fetch fails
const { data, isLoading } = useQuery({ ... })  // no isError!
const items = data ?? []
if (!isLoading && items.length === 0) return <EmptyState />  // lies on error
```

**ErrorState component signature** (to be created in Sprint 4):
```typescript
interface ErrorStateProps {
  message: string
  onRetry?: () => void
  className?: string
}
```

---

## 1.3 "Coming Soon" Pattern for Unconfigured Features

Features that depend on external services (BatchData, Lob, Twilio, SendGrid) show a consistent "Coming Soon" page when the service is not configured. This is NOT a tier gate — it's a service-availability gate.

**Backend: service readiness endpoint**
```python
# GET /api/service-status
# Returns which optional services are configured
@router.get("/service-status")
async def service_status():
    return {
        "skip_tracing": bool(os.getenv("BATCHDATA_API_KEY")),
        "direct_mail": bool(os.getenv("LOB_API_KEY")),
        "sms": bool(os.getenv("TWILIO_ACCOUNT_SID")),
        "email_outbound": bool(os.getenv("SENDGRID_API_KEY")),
    }
```

**Frontend: ComingSoonGate wrapper**
```typescript
interface ComingSoonGateProps {
  service: 'skip_tracing' | 'direct_mail' | 'sms' | 'email_outbound'
  featureName: string
  children: React.ReactNode
}

function ComingSoonGate({ service, featureName, children }: ComingSoonGateProps) {
  const { data: status } = useQuery({
    queryKey: ['service-status'],
    queryFn: () => api.serviceStatus(),
    staleTime: 5 * 60_000,
  })

  if (status && !status[service]) {
    return (
      <AppShell title={featureName}>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#8B7AFF]/10 flex items-center justify-center mx-auto mb-6">
            <Clock size={24} className="text-[#8B7AFF]" />
          </div>
          <h1 className="text-2xl text-text-primary mb-3" style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}>
            Coming Soon
          </h1>
          <p className="text-sm text-text-secondary max-w-sm">
            {featureName} is coming soon. We'll let you know when it's ready.
          </p>
        </div>
      </AppShell>
    )
  }

  return <>{children}</>
}
```

---

## 1.4 Auth Pattern (Post-Clerk Migration)

After Sprint 1 (Auth Foundation), every authenticated request follows this pattern:

**Backend — `get_current_user()` (Clerk-only):**
```python
async def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail={"error": "Not authenticated", "code": "NOT_AUTHENTICATED"})

    token = auth_header[7:]
    claims = verify_clerk_token(token)
    if not claims or not claims.get("sub"):
        raise HTTPException(status_code=401, detail={"error": "Invalid token", "code": "INVALID_TOKEN"})

    user = db.query(User).filter(User.clerk_user_id == claims["sub"]).first()
    # ... JIT provisioning if needed ...

    if not user:
        raise HTTPException(status_code=401, detail={"error": "User not found", "code": "USER_NOT_FOUND"})

    set_rls_context(db, user.id, user.team_id)
    return user
```

**Frontend — every request goes through `api.ts:request()`:**
- `_clerkTokenCache` is set by authStore when Clerk session updates
- `request()` adds `Authorization: Bearer <token>` header automatically
- No cookies used for auth. `credentials: 'include'` removed from auth-related requests.

---

## 1.5 Feature Gate Pattern (Tier-Based)

**Backend:** Already implemented via `require_quota()` dependency — returns 402 with upgrade info.

**Frontend:** Pages for tier-gated features check billing status and show upgrade prompt.

```typescript
// Pattern for pages that require a specific tier
function TierGatedPage({ requiredTier, featureName, children }: {
  requiredTier: 'pro' | 'business'
  featureName: string
  children: React.ReactNode
}) {
  const { data: billing } = useBillingStatus()
  const userTier = billing?.plan ?? 'free'

  const tierOrder = { free: 0, pro: 1, business: 2 }
  if (tierOrder[userTier] < tierOrder[requiredTier]) {
    return <UpgradePrompt featureName={featureName} requiredTier={requiredTier} />
  }

  return <>{children}</>
}
```

This is layered ON TOP of the "Coming Soon" gate. A feature that requires both a tier AND a service key checks service availability first (Coming Soon), then tier (Upgrade Required).

---

## 1.6 SSE Error Sanitization Pattern

SSE endpoints MUST NOT send raw exception strings. Every SSE error goes through a sanitizer:

```python
def _sanitize_sse_error(e: Exception) -> dict:
    """Map internal exceptions to user-safe SSE error events."""
    msg = str(e)
    if "parse" in msg.lower() or "address" in msg.lower():
        return {"error": "Could not parse the address. Please check the format.", "code": "ADDRESS_PARSE_FAILED"}
    if "rate limit" in msg.lower() or "429" in msg:
        return {"error": "Too many requests. Please wait a moment.", "code": "RATE_LIMITED"}
    if "timeout" in msg.lower():
        return {"error": "The request timed out. Please try again.", "code": "TIMEOUT"}
    # Default: never expose internals
    return {"error": "Something went wrong during analysis. Please try again.", "code": "ANALYSIS_ERROR"}
```

---

# Section 2: Sprint Breakdown

---

## Sprint 0: Production Emergency — Mixed Content Fix

**Purpose:** Fix the active production breakage where 5+ pages make `http://` API requests from an `https://` origin.

**Why first:** Nothing else matters if authenticated pages can't load data. This is breaking the live site RIGHT NOW.

### Root Cause Diagnosis

The frontend source code at `api.ts:36-37` already has an HTTPS guard:
```typescript
const _rawUrl = import.meta.env.VITE_API_URL ?? 'https://api.parceldesk.io'
const API_URL = _rawUrl.includes('localhost') || _rawUrl.includes('127.0.0.1')
  ? _rawUrl
  : _rawUrl.replace('http://', 'https://')
```

This guard converts `http://api.parceldesk.io` to `https://api.parceldesk.io` at runtime. However, `VITE_` environment variables are **baked into the bundle at build time** by Vite. If the Vercel production environment has `VITE_API_URL=http://api.parceldesk.io`, the guard works — but only if the deployed bundle includes this guard.

**Most likely cause:** A stale Vercel deployment that was built before the HTTPS guard was added (or before `VITE_API_URL` was correctly set). The fix deployed to Git may not be in the live bundle.

**Secondary cause to check:** `AnalyzePage.tsx:12` has its own `API_URL` for SSE:
```typescript
const API_URL = (import.meta.env.VITE_API_URL ?? 'https://api.parceldesk.io').replace('http://', 'https://')
```
This is fine — it has the same guard. But if other files construct URLs differently, they might bypass it.

### Exact Fix Steps

1. **Verify Vercel environment variables:**
   - Log into Vercel dashboard for the `parcel-platform` frontend project
   - Check `VITE_API_URL` in Production environment settings
   - If it's `http://api.parceldesk.io`, change to `https://api.parceldesk.io`
   - If it's already `https://`, the issue is a stale deploy

2. **Trigger a fresh production deploy:**
   - Either push a no-op commit or trigger a manual redeploy from the Vercel dashboard
   - This ensures the current source code (with HTTPS guard) is in the live bundle

3. **Verify fix in production:**
   - Open `https://www.parceldesk.io/today` in Chrome
   - Open DevTools → Network tab
   - Confirm ALL API requests go to `https://api.parceldesk.io`
   - Check Console for zero mixed-content warnings
   - Repeat for `/properties`, `/reports`, `/sequences`, `/mail-campaigns`

4. **Swap Clerk publishable key (while in Vercel env vars):**
   - Replace `VITE_CLERK_PUBLISHABLE_KEY` with the production key from Clerk dashboard
   - This eliminates the development-key console warning

### Files Created/Modified/Deleted
- No source code changes. Vercel environment variable updates only.

### Acceptance Criteria
- [ ] Zero mixed-content warnings in browser console on all authenticated pages
- [ ] All API requests in Network tab use `https://api.parceldesk.io`
- [ ] No Clerk development-key warning in production console
- [ ] `/today`, `/properties`, `/reports` all load data (not blank/error)

### What This Sprint Must NOT Touch
- No source code changes
- No backend changes
- No configuration changes beyond Vercel env vars

### Regression Risks
- Changing Clerk to production key may require re-testing auth flow end-to-end
- If backend `api.parceldesk.io` doesn't have valid TLS, HTTPS requests will fail → verify Railway has TLS configured

---

## Sprint 1: Auth Foundation — Clerk-Only Migration

**Purpose:** Remove all legacy JWT/cookie authentication code, leaving Clerk Bearer token as the sole auth mechanism.

**Why second:** Every subsequent sprint touches authenticated code paths. Building fixes on a dual-auth foundation means every fix must handle two auth modes. Clean this up once before proceeding.

### Dependency Reasoning
- Depends on Sprint 0 (production must be loading data)
- All subsequent sprints depend on this (clean auth = simpler code paths)

### File Changes

#### `backend/core/security/jwt.py` — Heavy modification
**Current state:** Contains `hash_password`, `verify_password`, `create_access_token`, `create_refresh_token`, `verify_token`, `verify_refresh_token`, and `get_current_user` with dual-mode auth.
**Target state:** Only `get_current_user` remains, accepting Clerk Bearer tokens only. All password/JWT functions removed.

```python
# TARGET STATE of get_current_user():
async def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    """Resolve the authenticated user from a Clerk Bearer token."""
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Not authenticated", "code": "NOT_AUTHENTICATED"},
        )

    bearer_token = auth_header[7:]
    from core.security.clerk import verify_clerk_token, is_clerk_configured

    if not is_clerk_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": "Authentication service not configured", "code": "AUTH_NOT_CONFIGURED"},
        )

    claims = verify_clerk_token(bearer_token)
    if not claims or not claims.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Invalid or expired token", "code": "INVALID_TOKEN"},
        )

    # Lookup by clerk_user_id, fall back to email
    user = db.query(User).filter(User.clerk_user_id == claims["sub"]).first()
    if not user and claims.get("email"):
        user = db.query(User).filter(User.email == claims["email"]).first()
        if user and not user.clerk_user_id:
            user.clerk_user_id = claims["sub"]
            db.commit()

    # JIT provisioning for first Clerk sign-in
    if not user:
        from core.security.clerk import fetch_clerk_user
        clerk_user = fetch_clerk_user(claims["sub"])
        if clerk_user:
            if clerk_user.get("email"):
                user = db.query(User).filter(User.email == clerk_user["email"]).first()
                if user and not user.clerk_user_id:
                    user.clerk_user_id = claims["sub"]
                    db.commit()
            if not user:
                from datetime import datetime as _dt, timedelta as _td
                user = User(
                    email=clerk_user.get("email", f'{claims["sub"]}@clerk.local'),
                    name=clerk_user.get("name") or clerk_user.get("email", "").split("@")[0] or "User",
                    role="investor",
                    clerk_user_id=claims["sub"],
                    plan_tier="free",
                    trial_ends_at=_dt.utcnow() + _td(days=7),
                )
                db.add(user)
                db.commit()
                db.refresh(user)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "User not found", "code": "USER_NOT_FOUND"},
        )

    from core.security.rls import set_rls_context
    set_rls_context(db, user.id, user.team_id)
    return user
```

**What to delete from jwt.py:**
- `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`, `JWT_ISSUER` constants
- `hash_password()`, `verify_password()`
- `create_access_token()`, `create_refresh_token()`
- `verify_token()`, `verify_refresh_token()`
- `bcrypt` import, `jose` import
- Legacy cookie fallback block in `get_current_user()`

#### `backend/routers/auth.py` — Heavy modification
**Current state:** Has register, login, logout (cookies), refresh, me, profile update, forgot-password, reset-password endpoints.
**Target state:** Only `me`, profile read, and profile update remain. All cookie/JWT endpoints removed.

**What to delete:**
- `register()` endpoint (Clerk handles registration)
- `login()` endpoint (Clerk handles login)
- `logout()` endpoint (Clerk handles logout — no cookies to clear)
- `refresh()` endpoint (Clerk manages token lifecycle)
- `forgot_password()` endpoint (Clerk handles password reset)
- `reset_password()` endpoint (Clerk handles password reset)
- `_set_auth_cookie()`, `_set_refresh_cookie()`, `_set_auth_cookies()` helpers
- `_COOKIE_NAME`, `_REFRESH_COOKIE_NAME`, `_COOKIE_MAX_AGE`, `_REFRESH_COOKIE_MAX_AGE` constants
- All `bcrypt`, `secrets`, `hashlib` imports that become unused

**What to keep:**
- `me()` → `GET /api/v1/auth/me` (read current user)
- `get_profile()` → `GET /api/v1/auth/me/` (settings page)
- `update_profile()` → `PUT /api/v1/auth/me/` (name/email update only — remove password change)

#### `frontend/src/lib/api.ts` — Modification
**Current state:** Has `attemptRefresh()` function that calls legacy `/api/v1/auth/refresh` cookie endpoint. `request()` tries cookie refresh on 401.
**Target state:** Remove `attemptRefresh()`. On 401, clear auth state immediately (Clerk handles token lifecycle).

**Changes:**
- Delete `attemptRefresh()` function and `refreshPromise` variable
- Simplify 401 handling in `request()`: just call `clearAuth()` and throw
- Remove `auth.login`, `auth.register`, `auth.logout`, `auth.refresh`, `auth.forgotPassword`, `auth.resetPassword` from the `api` object
- Remove `credentials: 'include'` from requests (no cookies needed)

#### `frontend/src/hooks/useAuth.ts` — Modification
**Current state:** Has `useRegister`, `useLogin` hooks that call legacy API endpoints.
**Target state:** Remove legacy hooks. Auth is handled entirely by Clerk components.

#### `frontend/src/pages/Login.tsx`, `Register.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx` — Delete or redirect
**Current state:** Full auth forms that call legacy API endpoints.
**Target state:** These pages become thin wrappers around Clerk's `<SignIn>`, `<SignUp>` components, OR redirect to Clerk's hosted pages.

Note: Register.tsx will be modified again in Sprint 5 (TOS checkbox). For Sprint 1, convert it to use Clerk's SignUp. Sprint 5 will then add the TOS checkbox to the Clerk-wrapped version.

#### `backend/requirements.txt` — Modification
**What to remove:** `geoalchemy2>=0.15.0` (unused — Property model has no geo column per investigation)
**What to remove:** `bcrypt` (if no longer used after auth cleanup — verify no other module uses it)

#### `frontend/src/stores/onboardingStore.ts` — Fix
**Current state:** `fetchStatus` catch block sets `completed: true` on error, silently bypassing onboarding.
**Target state:** On error, set `completed: false, fetched: false` so it retries. Or better: leave `completed: false, fetched: true` and let the ProtectedRoute show onboarding.

```typescript
// FIX: Don't assume completed on error
catch {
  set({ completed: false, fetched: true })
}
```

#### `frontend/src/hooks/useAuth.ts` — Fix routing
**Current state:** Both login and register redirect to `/dashboard`.
**Target state:** Both redirect to `/today` (the default authenticated landing page per GuestRoute logic).

#### `frontend/src/pages/OnboardingPage.tsx` — Fix routing
**Current state:** Continue and skip both route to `/dashboard`.
**Target state:** Both route to `/today`.

### Patterns Applied
- Auth Pattern (1.4)
- Error Response Shape (1.1)

### Acceptance Criteria
- [ ] `get_current_user()` accepts only Clerk Bearer tokens — cookie fallback removed
- [ ] No code anywhere references `access_token` cookie or `refresh_token` cookie
- [ ] App works end-to-end: sign up via Clerk → onboarding → /today → analyze
- [ ] `geoalchemy2` removed from requirements.txt
- [ ] Login/register redirect to `/today`, not `/dashboard`
- [ ] Onboarding fetch failure does NOT bypass onboarding
- [ ] `npx vite build 2>&1 | tail -5` succeeds with zero errors

### What This Sprint Must NOT Touch
- Do NOT add new auth features (MFA, session management)
- Do NOT change the Clerk configuration or token validation logic
- Do NOT modify any page content or styling
- Do NOT touch calculators or analysis endpoints

### Regression Risks
- Users with existing legacy JWT cookies will be logged out → acceptable, Clerk handles re-auth
- Any endpoint that imports password utilities from jwt.py will break → search for all imports before deleting
- Frontend pages that reference `api.auth.login` etc. will break → must update all references

### Files That Future Sprints Touch
- `Register.tsx`: Sprint 5 adds TOS checkbox. Sprint 1 leaves it as a Clerk SignUp wrapper.
- `api.ts`: Sprint 2 may adjust SSE auth headers. Sprint 1 removes legacy refresh logic.
- `App.tsx`: Sprint 7 moves /pricing to public route. Sprint 1 only changes routing destinations.

---

## Sprint 2: Analysis Core — Make the Product Loop Work

**Purpose:** Fix the SSE analysis flow, wire Save/Pipeline buttons to real API calls, auto-create Deal on analysis completion.

**Why third:** The core product loop is completely broken. Users can't successfully analyze a property (SSE hangs), can't save their work (button is fake), and can't track deals (no Deal created). This is the #1 reason a user would leave.

### Dependency Reasoning
- Depends on Sprint 1 (auth must be clean — SSE needs Clerk Bearer)
- Sprint 3 depends on this (can't verify financial accuracy if analysis doesn't complete)
- Sprint 4 depends on this (dashboard activity needs deals to exist)
- Sprint 8 depends on this (theme fixes touch same files — but different code paths)
- Sprint 9 depends on this (mobile fixes touch same layout — but different responsive behavior)

### File Changes

#### `backend/routers/analysis.py` — Fix SSE detached-object bug

**Root cause (confirmed by investigation):** Lines 422-446 create a thread-local `SessionLocal()`, run enrichment, expunge ORM objects, close the session. At line 456, `PropertyResponse.model_validate(enrichment.property)` operates on a detached ORM object. Any lazy-loaded attribute access causes `DetachedInstanceError`.

**Fix approach:** Serialize response models INSIDE the thread session, before expunging. Return plain dicts, not ORM objects, from the thread.

```python
# BEFORE (broken):
def _enrich_sync():
    if _use_thread:
        thread_db = SessionLocal()
        try:
            result = enrich_property(...)
            thread_db.commit()
            if result.property:
                thread_db.expunge(result.property)  # Object becomes detached
            if result.scenario:
                thread_db.expunge(result.scenario)  # Object becomes detached
            return result
        finally:
            thread_db.close()
# ... later:
prop_data = PropertyResponse.model_validate(enrichment.property).model_dump(mode="json")  # CRASH

# AFTER (fixed):
def _enrich_sync():
    if _use_thread:
        thread_db = SessionLocal()
        try:
            result = enrich_property(...)
            thread_db.commit()
            # Serialize BEFORE detaching — while objects are still attached to session
            serialized = {
                "property": PropertyResponse.model_validate(result.property).model_dump(mode="json") if result.property else None,
                "scenario": ScenarioResponse.model_validate(result.scenario).model_dump(mode="json") if result.scenario else None,
                "enrichment": result,  # enrichment metadata doesn't need ORM
                "is_existing": result.is_existing,
                "provider_statuses": result.provider_statuses,
            }
            # Still need the raw ORM objects for later stages (calculator, narrative)
            if result.property:
                thread_db.expunge(result.property)
            if result.scenario:
                thread_db.expunge(result.scenario)
            serialized["_property_obj"] = result.property
            serialized["_scenario_obj"] = result.scenario
            return serialized
        finally:
            thread_db.close()
    else:
        # Non-threaded path — objects stay attached
        result = enrich_property(...)
        return {
            "property": PropertyResponse.model_validate(result.property).model_dump(mode="json") if result.property else None,
            "scenario": ScenarioResponse.model_validate(result.scenario).model_dump(mode="json") if result.scenario else None,
            "enrichment": result,
            "is_existing": result.is_existing,
            "provider_statuses": result.provider_statuses,
            "_property_obj": result.property,
            "_scenario_obj": result.scenario,
        }
```

Then use `serialized["property"]` (already a dict) for SSE emission instead of calling `model_validate()` on a detached object.

**SSE error sanitization:** Replace the bare `except` at line 555-557:
```python
# BEFORE:
except Exception as e:
    logger.exception("SSE stream error")
    yield _sse("error", {"error": str(e), "code": "STREAM_ERROR"})  # Leaks internals

# AFTER:
except Exception as e:
    logger.exception("SSE stream error")
    yield _sse("error", _sanitize_sse_error(e))
```

#### `backend/routers/analysis.py` — Auto-create Deal on analysis

After successful analysis, auto-create a Deal with status "draft":

```python
# Add after db.commit() at line 271 (in quick_analysis) and after scenario creation in SSE:
from models.deals import Deal
from models.pipeline_entries import PipelineEntry

if enrichment.scenario and not enrichment.is_existing:
    # Auto-create draft deal
    existing_deal = db.query(Deal).filter(
        Deal.property_id == enrichment.property.id,
        Deal.user_id == current_user.id,
        Deal.deleted_at.is_(None),
    ).first()
    if not existing_deal:
        deal = Deal(
            property_id=enrichment.property.id,
            user_id=current_user.id,
            address=enrichment.property.address_line1,
            city=enrichment.property.city,
            state=enrichment.property.state,
            zip_code=enrichment.property.zip_code,
            strategy=strategy,
            status="draft",
        )
        db.add(deal)
        db.commit()
```

#### `frontend/src/pages/analyze/AnalyzePage.tsx` — SSE error recovery

**Current state:** On SSE `error` event, marks step 1 as failed but doesn't exit loading state or offer retry.

**Target state:** On error, show readable message and "Try Again" button.

Changes to `handleSSEEvent`:
```typescript
case 'error':
  // Mark current active step as failed
  setSteps(prev => prev.map(s =>
    s.status === 'active' ? { ...s, status: 'failed' as StepStatus, detail: data.error || 'Error' } : s
  ))
  // Exit loading state after a beat so user sees the failure
  setTimeout(() => setState('input'), 2000)
  setError(data.error || 'Analysis failed. Please try again.')
  break
```

Also handle the `enrichment_update` SSE event (currently ignored):
```typescript
case 'enrichment_update':
  // Bricked degradation status — non-critical, just update state
  if (data.bricked_status === 'failed') {
    // Bricked data unavailable — analysis continues with RentCast data only
    // No user-facing error needed
  }
  break
```

#### `frontend/src/pages/analyze/AnalysisResultsPage.tsx` — Wire Save and Pipeline buttons

**Current state (line 158-164):**
```typescript
const handleSave = () => { setSaved(true) }           // FAKE — no API call
const handlePipeline = () => { navigate('/pipeline') } // FAKE — no deal creation
```

**Target state:**
```typescript
const handleSave = useCallback(async () => {
  if (!property || saved) return
  try {
    // The deal was auto-created during analysis.
    // "Save" confirms the user wants to keep it (no additional API call needed
    // if deal auto-creation is in place — the deal already exists as "draft").
    setSaved(true)
    toast.success('Deal saved')
    try { ;(window as any).posthog?.capture?.('deal_saved', { property_id: propertyId }) } catch {}
  } catch {
    toast.error('Could not save deal')
  }
}, [property, propertyId, saved])

const handlePipeline = useCallback(async () => {
  if (!property) return
  try {
    // Find the auto-created deal for this property
    const deals = await api.deals.list({ property_id: propertyId })
    const deal = deals.find(d => d.property_id === propertyId)
    if (deal) {
      // Add to pipeline with default stage "lead"
      await api.pipeline.add({ deal_id: deal.id, stage: 'lead' })
      toast.success('Added to pipeline')
      navigate('/pipeline')
    } else {
      toast.error('No deal found for this property')
    }
    try { ;(window as any).posthog?.capture?.('deal_added_to_pipeline', { property_id: propertyId }) } catch {}
  } catch {
    toast.error('Could not add to pipeline')
  }
}, [property, propertyId, navigate])
```

Note: The exact API depends on whether `api.deals.list` supports a `property_id` filter. If not, we need to store the deal_id from the analysis response and pass it through router state.

**Better approach:** Return the auto-created `deal_id` from the analysis endpoint in the response, and store it in the analysis result state. Then Save/Pipeline can use it directly.

### Patterns Applied
- Error Response Shape (1.1) — SSE error sanitization
- Auth Pattern (1.4) — SSE uses Clerk Bearer via `getAuthHeaders()`

### Acceptance Criteria
- [ ] Full SSE analysis flow completes for a valid US address (e.g., "123 Main St, Austin, TX 78701")
- [ ] If SSE fails mid-stream, user sees a single readable error sentence and returns to input state
- [ ] If SSE connection fails entirely, fallback to POST `/api/analysis/quick` works
- [ ] After analysis, a Deal with status "draft" exists in the database
- [ ] "Save" button shows "Saved" state (deal already exists from auto-creation)
- [ ] "Pipeline" button creates a pipeline entry and navigates to `/pipeline` with the deal visible
- [ ] Dashboard "Total Deals" count increases after analysis
- [ ] No raw exception text is ever visible to users in SSE errors

### What This Sprint Must NOT Touch
- Do NOT add address autocomplete (Sprint 4)
- Do NOT refactor the SSE architecture (just fix the current flow)
- Do NOT change chart rendering or financial calculations
- Do NOT change visual layout or colors (Sprint 8/9 will)

### Regression Risks
- Changing SSE serialization could break the data shape that `AnalysisResultsPage` expects → verify `routerState.property` and `routerState.scenario` still work
- Auto-creating deals could create duplicates on re-analysis → check for existing deal before creating
- Pipeline button depends on deal existing → handle case where deal doesn't exist

### Files Left for Future Sprints
- `AnalysisResultsPage.tsx`: Sprint 8 (theme colors), Sprint 9 (mobile action bar). Sprint 2 only changes button handlers — does not touch layout/styling.
- `AnalyzePage.tsx`: Sprint 4 (autocomplete), Sprint 9 (mobile). Sprint 2 only changes error handling — does not touch input UI.
- `analysis.py`: Sprint 3 may adjust calculator output rendering. Sprint 2 changes SSE serialization and deal creation — doesn't touch calculator logic.

---

## Sprint 3: Financial Accuracy — Make the Numbers Right

**Purpose:** Fix incorrect chart projections, billing copy discrepancies, and the reverse calculator race condition.

**Why fourth:** Parcel is an underwriting tool. Users make $200K+ decisions based on these numbers. If the projections are wrong, trust is destroyed permanently.

### Dependency Reasoning
- Depends on Sprint 2 (analysis must complete to verify financial accuracy)
- Sprint 8 depends on this (theme fixes touch chart components — Sprint 3 changes data/math, Sprint 8 changes colors)

### File Changes

#### `frontend/src/pages/analyze/components/CashFlowChart.tsx` — Fix creative finance projection
**Current bug (F5):** Fixed debt service (e.g., $1,600/mo) is compounded at 3%/year as if it were a growing expense. This makes 10/20/30-year projections materially wrong.
**Fix:** Keep fixed payment flat. Only grow variable expenses (maintenance, insurance, taxes) at the inflation rate.

#### `frontend/src/pages/analyze/components/CashFlowBreakdown.tsx` — Include monthly_expenses for creative finance
**Current bug (F4):** Creative finance strategy omits `monthly_expenses` from the waterfall breakdown, understating costs. The bars and the cash flow number disagree.
**Fix:** Add `monthly_expenses` to the expense breakdown when strategy is `creative_finance`.

#### `frontend/src/pages/analyze/components/BreakEvenChart.tsx` — Handle never-break-even and long timelines
**Current bug (F6):** Chart only plots months 0-60 but labels months beyond 60. Zero/negative cash flow deals silently disappear.
**Fix:** If break-even month > 60, extend the chart horizon to the break-even month. If cash flow is permanently negative, show an explicit "This deal never breaks even at current terms" state instead of an empty chart.

#### `frontend/src/pages/analyze/components/KeyMetrics.tsx` — Restore debt_yield for buy-and-hold
**Current bug (F7):** Backend still computes `debt_yield` but the frontend removed it from the UI.
**Fix:** Add `debt_yield` back to the buy-and-hold metrics grid. Display as percentage with tooltip explaining: "Annual NOI / Total Debt. Above 10% is typically safe for lenders."

#### `frontend/src/pages/analyze/components/ReverseCalculatorModal.tsx` — Fix race condition
**Current bug (F11):** No request cancellation. Slower older responses overwrite newer results.
**Fix:** Use monotonic request counter. Each request increments a counter. When response arrives, only apply it if its counter matches the latest.

```typescript
const requestIdRef = useRef(0)

const calculate = useCallback(async (inputs: Record<string, number | string>) => {
  const thisRequestId = ++requestIdRef.current
  setLoading(true)
  try {
    const result = await api.analysis.reverseCalculate(strategy, targetMetric, targetValue, inputs)
    // Only apply if this is still the latest request
    if (thisRequestId === requestIdRef.current) {
      setResult(result)
    }
  } catch {
    if (thisRequestId === requestIdRef.current) {
      setError('Calculation failed')
    }
  } finally {
    if (thisRequestId === requestIdRef.current) {
      setLoading(false)
    }
  }
}, [strategy, targetMetric, targetValue])
```

#### `frontend/src/pages/PricingPage.tsx` — Align billing copy with backend truth

**Current discrepancies (B1):**
| What | PricingPage says | tier_config.py says |
|------|-----------------|---------------------|
| Steel analyses | "3 analyses per month" | 3 | Correct |
| Steel AI messages | "5 AI chat messages per month" | 5 | Correct |
| Steel saved deals | "5 saved deals" | 5 | Correct |
| Carbon skip traces | "Skip tracing (25/month)" | 25 | Correct |
| Titanium mail | "Direct mail (50 pieces/month)" | 100 | **WRONG** |
| Titanium skip traces | "Skip tracing (200/month)" | 200 | Correct |

**Fix:** Change Titanium direct mail feature text from "50 pieces/month" to "100 pieces/month" to match `tier_config.py` line 101: `mail_pieces_per_month=100`.

Also fix the trial copy: "Start with a 7-day Carbon trial. No credit card required." — verify this matches actual Stripe configuration (Sprint 6 will configure Stripe trial, but Sprint 3 ensures the copy matches whatever the current state is).

### Patterns Applied
- Error Response Shape (1.1) — reverse calculator errors

### Acceptance Criteria
- [ ] Creative-finance 30-year projection with fixed $1,600/mo payment shows a flat debt line
- [ ] CashFlowBreakdown bars sum correctly for creative_finance strategy (expenses include monthly_expenses)
- [ ] BreakEvenChart shows "Never breaks even" for permanently negative cash flow
- [ ] BreakEvenChart extends beyond 60 months if break-even is at month 72
- [ ] `debt_yield` metric appears in buy-and-hold KeyMetrics
- [ ] Rapidly changing reverse calculator inputs produce correct (non-stale) results
- [ ] Titanium mail feature text says "100 pieces/month" (matches backend)
- [ ] `npx vite build 2>&1 | tail -5` succeeds

### What This Sprint Must NOT Touch
- Do NOT change calculator formulas in `backend/core/calculators/` (no-touch zone per CLAUDE.md)
- Do NOT change chart colors or styling (Sprint 8)
- Do NOT change chart responsive behavior (Sprint 9)

### Regression Risks
- Changing CashFlowChart projection logic could break other strategies → test all 5 strategies
- Changing BreakEvenChart could affect existing correct visualizations → test with positive-CF and negative-CF scenarios

### Files Left for Future Sprints
- `CashFlowChart.tsx`: Sprint 8 (theme colors). Sprint 3 changes data/math only.
- `BreakEvenChart.tsx`: Sprint 8 (theme colors). Sprint 3 changes data/math only.
- `KeyMetrics.tsx`: Sprint 8 (theme colors). Sprint 3 adds debt_yield metric only.
- `PricingPage.tsx`: Sprint 6 (Stripe config alignment), Sprint 7 (make public). Sprint 3 fixes copy accuracy.

---

## Sprint 4: Product Loop Completion — Make Everything Else Work

**Purpose:** Fix the Today page crash, make dashboard activity navigable, fix false empty states systemically, add Google Places autocomplete, fix AI chat and PDF generation.

**Why fifth:** The analysis works and the numbers are right. Now make the rest of the product functional so users can actually use the app day-to-day.

### Dependency Reasoning
- Depends on Sprint 2 (deals must exist for dashboard activity to be meaningful)
- Depends on Sprint 3 (financial accuracy must be correct before users can find past analyses)

### File Changes

#### `backend/routers/today.py` — Wrap sub-builders in try/except

**Current bug (P2):** Any sub-builder failure (`_build_portfolio_summary`, `_build_briefing_items`, etc.) crashes the entire `/today/` endpoint.

**Fix:** Wrap each builder individually:

```python
@router.get("/", response_model=TodayResponse)
async def get_today(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TodayResponse:
    # ... greeting, sample data detection (keep as-is) ...

    # Each builder fails independently
    try:
        portfolio = _build_portfolio_summary(db, current_user.id)
    except Exception:
        logger.exception("Portfolio summary builder failed")
        portfolio = PortfolioSummary()

    try:
        briefing = _build_briefing_items(db, current_user.id, now, has_sample_data, has_real_data)
    except Exception:
        logger.exception("Briefing items builder failed")
        briefing = []

    try:
        pipeline = _build_pipeline_summary(db, current_user.id)
    except Exception:
        logger.exception("Pipeline summary builder failed")
        pipeline = PipelineSummary()

    try:
        activity = _build_recent_activity(db, current_user.id, limit=8)
    except Exception:
        logger.exception("Recent activity builder failed")
        activity = []

    return TodayResponse(...)
```

#### `frontend/src/pages/Dashboard.tsx` — Make activity items clickable (P3)

**Current bug:** Activity items in the right column are not clickable. `entity_id` and `entity_type` exist but aren't used for navigation.

**Fix:** Wrap each activity item in a navigation handler:

```typescript
const handleActivityClick = (item: ActivityItem) => {
  if (!item.entity_id) return
  switch (item.entity_type) {
    case 'property':
      navigate(`/analyze/results/${item.entity_id}`)
      break
    case 'deal':
      navigate(`/analyze/deal/${item.entity_id}`)
      break
    case 'document':
      navigate(`/documents`)
      break
  }
}
```

Make each activity row a `<button>` or add `onClick` and `cursor-pointer`.

#### Create `frontend/src/components/ui/ErrorState.tsx` — Shared error state component

```typescript
import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({ message = 'Something went wrong', onRetry, className }: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className ?? ''}`}>
      <div className="w-12 h-12 rounded-full bg-[#D4766A]/10 flex items-center justify-center mb-4">
        <AlertCircle size={20} className="text-[#D4766A]" />
      </div>
      <p className="text-sm text-text-primary mb-1">Unable to load data</p>
      <p className="text-xs text-text-secondary mb-4 max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 text-xs text-[#8B7AFF] hover:text-[#A89FFF] transition-colors"
        >
          <RefreshCw size={12} />
          Try again
        </button>
      )}
    </div>
  )
}
```

#### Fix false empty states in 4 pages (P15)
Apply the error-vs-empty pattern (1.2) to:
- `frontend/src/pages/reports/ReportsListPage.tsx`
- `frontend/src/pages/sequences/SequencesListPage.tsx`
- `frontend/src/pages/mail/MailCampaignsPage.tsx`
- `frontend/src/pages/skip-tracing/SkipTracingPage.tsx`

Each needs: add `isError, error` to useQuery destructuring, check `isError` before checking empty, render `<ErrorState>` on error.

#### `frontend/src/pages/analyze/AnalyzePage.tsx` — Google Places autocomplete (P6)

Replace the plain `<input>` with a Google Places autocomplete component. Implementation approach:
1. Add `@react-google-maps/api` package (or use the Places API directly with a thin wrapper)
2. Load the Places script with `VITE_GOOGLE_PLACES_API_KEY`
3. Replace the input with an autocomplete input that returns full addresses
4. On place selection, extract the formatted address and submit

#### Fix AI chat (P12)
**Files:** `frontend/src/components/chat/ChatPanel.tsx`, `backend/routers/chat.py`
- Add 30-second timeout around Anthropic streaming call
- On timeout/error, show "Something went wrong — try again" instead of blank assistant message
- Don't persist user message to DB until assistant reply starts streaming

#### Fix PDF generation (P13)
**Files:** `backend/routers/reports.py`, `backend/core/tasks/pdf_generation.py`
- Add 60-second timeout to PDF generation task
- On timeout, set report PDF status to "failed"
- Frontend: if PDF status is "failed" after polling, show error with retry button

### Acceptance Criteria
- [ ] `/today` loads even when one sub-builder throws an exception
- [ ] Dashboard activity items navigate to correct analysis results
- [ ] Reports, Sequences, Mail, Skip Tracing show `<ErrorState>` on API failure (not empty state)
- [ ] Address input has Google Places autocomplete with full address selection
- [ ] AI chat shows error message within 30 seconds of sending (not blank forever)
- [ ] PDF generation shows "failed" state after 60 seconds (not "generating" forever)

### What This Sprint Must NOT Touch
- Do NOT change dashboard layout or add new widgets
- Do NOT change sidebar navigation
- Do NOT refactor the Today page API response shape

---

## Sprint 5: Legal & Compliance

**Purpose:** Link legal documents from the app, add TOS acceptance to registration, implement cookie consent and account deletion.

**Why sixth:** Before marketing drives traffic, legal bases must be covered. Privacy policy and TOS exist but are unreachable.

### Dependency Reasoning
- Depends on Sprint 1 (auth cleanup — account deletion needs Clerk user handling)
- Sprint 7 depends on this (sitemap needs /privacy and /terms pages to exist)

### File Changes

#### Create public routes for `/privacy` and `/terms`
- Create `frontend/src/pages/PrivacyPage.tsx` — renders LEGAL/PRIVACY-POLICY.md as formatted HTML
- Create `frontend/src/pages/TermsPage.tsx` — renders LEGAL/TERMS-OF-SERVICE.md as formatted HTML
- Add routes in `App.tsx` as public (not behind ProtectedRoute)

#### `frontend/src/components/landing/footer.tsx` — Fix placeholder links
Change `{ label: 'Terms', href: '#' }` to `{ label: 'Terms', href: '/terms' }` and same for Privacy.

#### `frontend/src/pages/Register.tsx` (or Clerk SignUp wrapper) — TOS checkbox + fix trial copy
- Add "I agree to the Terms of Service and Privacy Policy" checkbox
- Change "Start your 7-day free Pro trial" to "Start your 7-day free Carbon trial"
- Disable submit until checkbox is checked

#### Create cookie consent banner
- Simple banner: "We use cookies for analytics. Accept / Essential only"
- On "Essential only", don't load PostHog
- Store preference in localStorage

#### Build account deletion flow
- Settings page: "Delete Account" section
- Confirmation dialog with typed confirmation (per COMPLIANCE-COPY.md)
- Backend endpoint: soft-delete user, cancel Stripe subscription if active, delete Clerk user

### Acceptance Criteria
- [ ] `/privacy` and `/terms` are publicly accessible and render full policy text
- [ ] All footer links on public pages point to real URLs
- [ ] Registration requires TOS checkbox
- [ ] Cookie consent banner appears on first visit
- [ ] Account deletion works end-to-end

### What This Sprint Must NOT Touch
- Do NOT build GDPR data export
- Do NOT change billing logic

---

## Sprint 6: Billing & Feature Gate Fixes

**Purpose:** Make billing truthful — Stripe configuration matches copy, tier gates actually gate, trial banners are accurate.

**Why seventh:** Product works, legal is covered. Now ensure billing is honest before anyone pays.

### File Changes

#### Stripe configuration (production env vars)
- Either configure Stripe for real 7-day free trial (no card required) or remove trial copy
- Either switch to live mode or add "Beta" messaging

#### `frontend/src/pages/mail/MailCampaignsPage.tsx` — Add tier gate
- Carbon users: show "Upgrade to Titanium" instead of full campaign UI
- Use TierGatedPage pattern (1.5)

#### `frontend/src/pages/sequences/SequencesListPage.tsx` — Add tier gate + service check
- Check both tier and service availability

#### `frontend/src/components/billing/TrialBanner.tsx` — Fix day calculation
- Change `Math.ceil` to `Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))` or use `Math.round`

#### `frontend/src/components/billing/PlanBadge.tsx` — Fix upgrade link
- Change `/settings` to `/pricing`

#### `frontend/src/pages/settings/BillingSettings.tsx` — Add trial-period CTA
- During active trial, show prominent "Upgrade to Carbon" button

#### `backend/core/tasks/mail_campaign.py` — Fix campaign status on failure
- If all recipients failed, set campaign status to `"failed"` not `"sent"`
- If some failed, set to `"partial"` (add this status)

### Acceptance Criteria
- [ ] Stripe checkout matches pricing page copy exactly
- [ ] Mail campaigns page shows upgrade prompt for non-Titanium users
- [ ] Trial banner shows correct day count (7 on day 1, not 8)
- [ ] "Upgrade" links everywhere go to `/pricing`
- [ ] Campaign with 100% failed recipients shows status "failed"

---

## Sprint 7: SEO & Public Presence

**Purpose:** Make public pages discoverable and professional.

**Why eighth:** Product works, legal is covered, billing is truthful. Now make the site look professional to search engines and social shares.

### File Changes

#### `frontend/index.html` — Fix meta tags
- Replace og:description with user-facing copy
- Add twitter:title, twitter:description, twitter:image
- Add canonical URL
- Add JSON-LD structured data (SoftwareApplication schema)

#### `frontend/src/App.tsx` — Move /pricing to public route
- Change from `<ProtectedRoute>` to direct route (like /login)

#### `frontend/public/robots.txt` — Create
```
User-agent: *
Allow: /
Allow: /pricing
Allow: /privacy
Allow: /terms
Disallow: /today
Disallow: /dashboard
Disallow: /analyze
Disallow: /deals
Disallow: /pipeline
Disallow: /settings
Disallow: /api/
Sitemap: https://www.parceldesk.io/sitemap.xml
```

#### `frontend/public/sitemap.xml` — Create
Include: /, /pricing, /privacy, /terms, /login, /register

#### Install and use `react-helmet-async` — Per-page titles for public pages

#### `frontend/vercel.json` — Add security headers and asset caching
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ],
  "rewrites": [{"source": "/(.*)", "destination": "/index.html"}]
}
```

#### `frontend/src/components/landing/HeroSection.tsx` + `FeatureSection.tsx` — Remove "coming soon" placeholders
Replace "Dashboard preview coming soon" and "Screenshot coming soon" with actual product screenshots or a minimal placeholder that doesn't say "coming soon."

### Acceptance Criteria
- [ ] Each public page has unique `<title>` and `<meta description>`
- [ ] `/pricing` accessible without authentication
- [ ] OG preview shows user-facing description (test with LinkedIn post inspector)
- [ ] robots.txt and sitemap.xml accessible at root
- [ ] No "coming soon" text on landing page
- [ ] Security headers present in Vercel responses

---

## Sprint 8: Theme Consistency — Hardcoded Colors

**Purpose:** Replace hardcoded dark-theme hex colors on analysis surfaces with semantic CSS variables.

**Why ninth:** Analysis surfaces are where users make decisions. Hardcoded colors break light theme.

### File Changes

Audit and fix these files (identified in F8):
- `AnalysisResultsPage.tsx` — action bar button colors
- `BreakEvenChart.tsx` — chart colors
- `CashFlowChart.tsx` — chart colors
- `KeyMetrics.tsx` — metric card colors
- `NarrativeCard.tsx` — card border/bg
- `ReverseCalculatorModal.tsx` — modal colors
- `PropertyDetailPage.tsx` — page colors

Replace patterns like `text-[#F0EDE8]` with `text-text-primary`, `bg-[#141311]` with `bg-layer-2`, `border-[#1E1D1B]` with `border-border-default`, etc.

### Acceptance Criteria
- [ ] Zero hardcoded hex colors in analysis components (except brand violet #8B7AFF)
- [ ] Both themes pass visual inspection on analysis results page
- [ ] Charts use chart-theme getter functions

### What This Sprint Must NOT Touch
- Only analysis and property pages. Do NOT theme the entire app.

---

## Sprint 9: Critical Mobile Fixes

**Purpose:** Fix the three most impactful mobile breakages per Ivan's directive.

### File Changes

#### `frontend/src/components/ui/dialog.tsx` + `alert-dialog.tsx` — Viewport clamp
Add `max-w-[calc(100vw-2rem)]` to dialog content to prevent overflow.

#### `frontend/src/pages/analyze/AnalysisResultsPage.tsx` — Action bar overflow
Wrap action buttons in a responsive container: horizontal scroll on mobile or use a dropdown menu for secondary actions.

#### `frontend/src/components/layout/AppShell.tsx` — Topbar CTAs below sm
Ensure primary CTAs (Analyze Property, Add Contact) are accessible on phones — either in hamburger menu or as floating action buttons.

### Acceptance Criteria
- [ ] All dialogs render within viewport on 375px screen
- [ ] Analysis results action buttons usable on phone
- [ ] Primary CTAs accessible on Properties/Contacts pages at 375px

---

## Sprint 10: Coming Soon Gates & Service Availability

**Purpose:** Features depending on unconfigured external services show "Coming Soon" instead of broken states.

### File Changes

#### Create `backend/routers/service_status.py` — Service readiness endpoint
Returns which optional services have API keys configured.

#### Create `frontend/src/components/ComingSoonGate.tsx` — Wrapper component
Uses Pattern 1.3.

#### Wrap pages:
- Skip tracing → `ComingSoonGate service="skip_tracing"`
- Mail campaigns → `ComingSoonGate service="direct_mail"` (layered under tier gate from Sprint 6)
- Sequences → `ComingSoonGate service="email_outbound"`

#### Fix document upload 500 (BQ9)
- Wrap S3 upload in try/except, return structured error
- If S3 not configured, return 503 with clear message

### Acceptance Criteria
- [ ] With empty `BATCHDATA_API_KEY`, skip tracing shows "Coming Soon"
- [ ] With empty `LOB_API_KEY`, mail campaigns shows "Coming Soon"
- [ ] Document upload returns structured error on storage failure (not 500)

---

## Sprint 11: Backend Housekeeping

**Purpose:** Infrastructure and CI improvements that don't affect UX.

### File Changes

#### CI pipeline — Add `tsc --noEmit` step
Prevents TypeScript errors from accumulating silently.

#### `backend/routers/today.py` line 96 — Fix strftime
```python
# BEFORE:
date_str = now.strftime("%A, %B %-d, %Y")  # %-d is GNU extension, fails on some platforms

# AFTER:
date_str = now.strftime("%A, %B %d, %Y").replace(" 0", " ")  # Cross-platform
```

#### Alembic migrations — Make idempotent
Add `CREATE INDEX IF NOT EXISTS` and conditional checks to prevent failures on retry.

#### Add worker health endpoint
`GET /health/worker` — returns Dramatiq broker connectivity status.

### Acceptance Criteria
- [ ] CI fails on TypeScript type errors
- [ ] Today page loads on Railway Linux
- [ ] `alembic upgrade head` succeeds on retry
- [ ] `/health/worker` returns status

---

# Section 3: Cross-Sprint Dependency Map

## File-Level Overlap Matrix

| File | Sprint 1 | Sprint 2 | Sprint 3 | Sprint 4 | Sprint 5 | Sprint 6 | Sprint 7 | Sprint 8 | Sprint 9 |
|------|----------|----------|----------|----------|----------|----------|----------|----------|----------|
| `jwt.py` | HEAVY: remove legacy code | - | - | - | - | - | - | - | - |
| `auth.py` | HEAVY: remove endpoints | - | - | - | - | - | - | - | - |
| `analysis.py` | - | HEAVY: SSE fix, deal creation | - | - | - | - | - | - | - |
| `api.ts` | Remove refresh logic | - | - | - | - | - | - | - | - |
| `App.tsx` | Fix routing | - | - | - | Add /privacy, /terms routes | - | Move /pricing to public | - | - |
| `AnalyzePage.tsx` | - | SSE error handling | - | Google Places autocomplete | - | - | - | - | - |
| `AnalysisResultsPage.tsx` | - | Wire Save/Pipeline | - | - | - | - | - | Theme colors | Mobile action bar |
| `PricingPage.tsx` | - | - | Fix copy accuracy | - | - | Stripe alignment | Pricing public | - | - |
| `Register.tsx` | Convert to Clerk | - | - | - | TOS checkbox + copy | - | - | - | - |
| `Dashboard.tsx` | - | - | - | Clickable activity | - | - | - | - | - |
| `today.py` | - | - | - | Error handling | - | - | - | - | - |
| `CashFlowChart.tsx` | - | - | Fix projection math | - | - | - | - | Theme colors | - |
| `BreakEvenChart.tsx` | - | - | Fix horizon + never-breaks-even | - | - | - | - | Theme colors | - |
| `KeyMetrics.tsx` | - | - | Add debt_yield | - | - | - | - | Theme colors | - |
| `vercel.json` | - | - | - | - | - | - | Add headers | - | - |
| `index.html` | - | - | - | - | - | - | Fix meta tags | - | - |
| `TrialBanner.tsx` | - | - | - | - | - | Fix Math.ceil | - | - | - |
| `PlanBadge.tsx` | - | - | - | - | - | Fix /settings link | - | - | - |
| `dialog.tsx` | - | - | - | - | - | - | - | - | Viewport clamp |
| `AppShell.tsx` | - | - | - | - | - | - | - | - | Mobile CTAs |
| `tier_config.py` | - | - | - | - | - | - | - | - | - |
| `footer.tsx` | - | - | - | - | Fix # links | - | - | - | - |

### Conflict Resolution Notes

1. **`AnalysisResultsPage.tsx`** is touched by Sprints 2, 8, and 9. Sprint 2 changes only the `handleSave` and `handlePipeline` functions (button behavior). Sprint 8 changes CSS classes on the entire page (colors). Sprint 9 changes the layout structure of the action bar (responsive). These are independent code paths — no conflicts.

2. **`PricingPage.tsx`** is touched by Sprints 3, 6, and 7. Sprint 3 fixes feature list text. Sprint 6 may update trial/checkout copy based on Stripe config. Sprint 7 doesn't change PricingPage content, just its route. These are independent — no conflicts.

3. **Chart components** (`CashFlowChart`, `BreakEvenChart`, `KeyMetrics`) are touched by Sprints 3 and 8. Sprint 3 changes data processing and rendering logic (what data goes into the chart). Sprint 8 changes color values (hex → CSS vars). These touch different parts of each component — no conflicts.

4. **`App.tsx`** is touched by Sprints 1, 5, and 7. Sprint 1 changes routing destinations. Sprint 5 adds new routes for /privacy and /terms. Sprint 7 changes /pricing from ProtectedRoute to public. These are additive changes to the route list — no conflicts.

5. **`Register.tsx`** is touched by Sprints 1 and 5. Sprint 1 converts it to use Clerk SignUp (structural change). Sprint 5 adds a TOS checkbox to whatever Sprint 1 produced. Sprint 1 must leave the component in a state where a checkbox can be added — this means Sprint 1 should preserve a custom form wrapper around Clerk's SignUp (not use Clerk's hosted page), so Sprint 5 can add the checkbox.

---

# Section 4: Production Emergency Fix — Detailed Diagnosis

## The Problem
Multiple pages (`/today`, `/properties`, `/reports`, `/sequences`, `/mail-campaigns`) make `http://api.parceldesk.io` requests from the `https://www.parceldesk.io` origin. Browsers block these as mixed content. Pages either show generic errors, false empty states, or half-render.

## Root Cause Analysis

**The code is correct.** `api.ts:36-37` has:
```typescript
const _rawUrl = import.meta.env.VITE_API_URL ?? 'https://api.parceldesk.io'
const API_URL = _rawUrl.includes('localhost') || _rawUrl.includes('127.0.0.1')
  ? _rawUrl
  : _rawUrl.replace('http://', 'https://')
```

This guard ensures non-localhost URLs use HTTPS. The bug is therefore in the **deployment**, not the code.

### Scenario A: `VITE_API_URL` is set to `http://` in Vercel
- `VITE_` env vars are replaced at build time by Vite's `define` plugin
- If Vercel has `VITE_API_URL=http://api.parceldesk.io`, the build output contains the literal string `http://api.parceldesk.io`
- The runtime `replace('http://', 'https://')` guard then converts it to HTTPS
- **But:** `AnalyzePage.tsx:12` duplicates this logic independently. If any other file constructs URLs without the guard, those would be `http://`
- **Verdict:** This alone wouldn't cause mixed content (the guard works). UNLESS there's a Vite optimization that inlines the env var AFTER the replace.

### Scenario B: Stale deploy
- The HTTPS guard was added in a recent commit. If Vercel's production deployment is from before that commit, the live bundle doesn't have the guard.
- **Verdict:** Most likely cause. Fix: trigger a fresh deploy.

### Scenario C: Build-time replacement defeats runtime guard
- Vite replaces `import.meta.env.VITE_API_URL` with the literal value at build time
- After replacement, the code becomes: `const _rawUrl = 'http://api.parceldesk.io'`
- The `.replace('http://', 'https://')` then runs and fixes it
- This should work. But if Vite aggressively optimizes and the replace happens before the variable is assigned...
- **Verdict:** Unlikely but worth verifying in the built output.

## The Fix

1. Set `VITE_API_URL=https://api.parceldesk.io` in Vercel production environment
2. Trigger fresh deploy
3. Verify in browser DevTools

See Sprint 0 for full steps.

---

# Section 5: Verification Plan

After ALL sprints are complete, this is the end-to-end verification walkthrough. Every step has an expected behavior.

## Journey 1: New User Signup
1. Visit `https://www.parceldesk.io` → Landing page loads, no "coming soon" text, footer links work
2. Click "Get Started" → Clerk sign-up form appears
3. Fill form, check TOS checkbox → Account created
4. Redirected to `/onboarding` → Onboarding wizard loads
5. Complete onboarding → Redirected to `/today`
6. Today page shows welcome state → No errors, briefing items load

**Expected:** User goes from landing to Today in under 60 seconds with no errors.

## Journey 2: Property Analysis
1. From `/today`, click "Analyze a Property" → Navigate to `/analyze`
2. Start typing address → Google Places autocomplete suggestions appear
3. Select full address → Autocomplete fills input
4. Click "Analyze" → Loading state with 4 steps appears
5. Steps progress: parsing → fetching → analyzing → generating → complete
6. Redirected to `/analyze/results/:propertyId` → Full analysis results page
7. Verify: key metrics show numbers, verdict badge is correct, narrative loads
8. Click "Save" → Toast "Deal saved", button changes to "Saved"
9. Navigate away and back to `/analyze/results/:propertyId` → Data loads from API, "Saved" state persists
10. Click "Pipeline" → Deal added to pipeline, redirected to `/pipeline`

**Expected:** Analysis completes in under 60 seconds. Deal auto-created. Save and Pipeline work.

## Journey 3: Analysis Failure Recovery
1. Enter gibberish address → "Could not parse address" error appears
2. Enter valid address, but simulate network failure → Error message appears, "Try Again" button
3. Click "Try Again" → Analysis restarts

**Expected:** Never shows raw exception text. Always recoverable.

## Journey 4: Financial Accuracy
1. Analyze a property with Buy & Hold strategy
2. Check KeyMetrics → `debt_yield` metric present
3. Switch to Creative Finance → CashFlowBreakdown includes all expenses
4. View CashFlowChart → Fixed debt line is flat, variable expenses grow
5. View BreakEvenChart for a negative-CF deal → "Never breaks even" message
6. Open Reverse Calculator, rapidly change inputs → Final result matches most recent input

**Expected:** All numbers match backend calculations. No stale data.

## Journey 5: Today & Dashboard
1. After analysis, visit `/today` → Briefing shows deal-related items
2. Visit `/dashboard` → "Total Deals" reflects new deal
3. Click an activity item → Navigates to correct analysis results
4. Force-kill one Today sub-builder (simulate) → Page still loads, shows partial content

**Expected:** Dashboard reflects real state. Activity is navigable.

## Journey 6: Feature Gates
1. As Steel (free) user, visit `/mail-campaigns` → If Lob not configured: "Coming Soon". If configured: upgrade prompt for Titanium.
2. Visit `/skip-tracing` → If BatchData not configured: "Coming Soon". If configured: normal page.
3. Visit `/sequences` → If SendGrid not configured: "Coming Soon".

**Expected:** No broken states. Clear messaging about what's available.

## Journey 7: Reports & Documents
1. Create a report from analysis results → Report created
2. Request PDF → Status shows generating, then completes (or shows "failed" after timeout)
3. Upload a document → Upload succeeds (or shows structured error if storage not configured)
4. Visit `/reports` when API is down → Error state with retry, NOT empty state

**Expected:** Error states are honest. Never shows "no data" when data can't be fetched.

## Journey 8: Billing
1. Visit `/pricing` without auth → Page loads (public route)
2. Feature lists match `tier_config.py` exactly → Titanium says 100 mail pieces
3. Trial banner shows correct days → "7 days" on day 1 (not "8 days")
4. Click "Upgrade" in PlanBadge → Navigates to `/pricing` (not `/settings`)

**Expected:** All billing copy is truthful. No discrepancies between frontend and backend.

## Journey 9: Legal
1. Visit `/terms` → Full Terms of Service renders
2. Visit `/privacy` → Full Privacy Policy renders
3. Check landing footer → Links go to real pages
4. Register flow → TOS checkbox required
5. Cookie banner appears on first visit → Can accept or choose essential only

**Expected:** Legal requirements met.

## Journey 10: Mobile
1. Open analysis results on 375px phone → Action buttons wrap/scroll, all usable
2. Open any dialog → Fits within viewport
3. Open Properties page → "Analyze Property" CTA accessible

**Expected:** Critical mobile flows work.

## Journey 11: SEO
1. Check `https://www.parceldesk.io/robots.txt` → Returns valid robots.txt
2. Check `https://www.parceldesk.io/sitemap.xml` → Returns valid sitemap
3. Paste URL in LinkedIn post inspector → Shows user-facing description and image
4. Check `<title>` on /pricing, /privacy, /terms → Each has unique title
5. View-source: JSON-LD structured data present on landing page

**Expected:** Search engines can discover and index public pages correctly.

---

# Appendix: Deferred Work (Not In This Plan)

| Item | Why Deferred |
|------|-------------|
| Landing page redesign (hero, sections, screenshots) | Research complete. Ship product fixes first. Ivan's decision. |
| Full mobile responsiveness (all 30+ issues) | Only critical fixes now. Dedicated mobile pass later. |
| Dynamic OG tags for share pages | Requires Vercel Edge Functions. Low ROI vs effort. |
| Bricked API key purchase + integration polish | ~$49/mo. Analysis works without it. |
| Blog / content pages | No content exists. SEO foundations first. |
| Plus tier decision | Ivan leans 3-tier. Do as deliberate marketing move, not mid-fix. |
| Interactive landing demo | Weeks of work. Ship product first. |
| Full accessibility audit | Save for dedicated a11y sprint. |
| Business tier margin analysis | Structural pricing, not a code fix. |
| Dashboard redesign / new widgets | Fix what exists before adding features. |
