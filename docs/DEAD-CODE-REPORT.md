> **Status:** Cleanup executed April 13, 2026. Most items in this report have been resolved. See `git log` for details.

# Dead Code Report

Generated: 2026-04-12 (read-only scan, no files modified)

---

## Summary

| Category | Count |
|---|---|
| Dead frontend files (never imported) | 10 |
| Unused frontend exports | 35 |
| Unused npm packages | 4 |
| Unused CSS classes (index.css) | 8 |
| Unused Tailwind config tokens | 30 |
| Unused backend Python imports | 144 |
| **Total findings** | **231** |

---

## 1. Dead Frontend Files (Never Imported)

These files exist but are never imported by any other file in the codebase.

### Dead Components

| File | Notes |
|---|---|
| `frontend/src/components/charts/ChartContainer.tsx` | Exported but never imported anywhere |
| `frontend/src/components/charts/ChartSkeleton.tsx` | Exported but never imported anywhere |
| `frontend/src/components/charts/AnimatedNumber.tsx` | Exported but never imported anywhere |
| `frontend/src/components/charts/GradientDef.tsx` | Exported but never imported anywhere |
| `frontend/src/components/charts/FrostedTooltip.tsx` | Exported but never imported anywhere |
| `frontend/src/components/charts/Sparkline.tsx` | Exported but never imported anywhere |
| `frontend/src/components/financing/RecordPaymentModal.tsx` | Exported but never imported anywhere |
| `frontend/src/components/billing/LimitReachedModal.tsx` | Exported but never imported anywhere |
| `frontend/src/components/edit-portfolio-modal.tsx` | Never imported; only reference is the file itself |

### Dead Hooks

| File | Notes |
|---|---|
| `frontend/src/hooks/useDocumentStatus.ts` | Never imported by any file |
| `frontend/src/hooks/usePlacesAutocomplete.ts` | Never imported; superseded by PlaceAutocompleteInput headless approach |

### Dead Lib Files

| File | Notes |
|---|---|
| `frontend/src/lib/maps-config.ts` | Never imported by any file |

---

## 2. Unused Frontend Exports

### `frontend/src/lib/motion.ts` -- 17 unused exports

This file has the highest concentration of dead exports. Many are legacy aliases or variants that were defined speculatively but never adopted.

| Line | Export | Notes |
|---|---|---|
| 69 | `SPRING` | Legacy alias, never used (unlike `spring` which is used) |
| 84 | `pageVariants` | Never used directly |
| 91 | `pageTransitionConfig` | Never used directly |
| 96 | `pageTransition` | Legacy compat alias, never used |
| 112 | `cardContainerVariants` | Never used directly |
| 117 | `cardVariants` | Never used directly |
| 124 | `safePageVariants` | Never used |
| 128 | `safeCardContainerVariants` | Never used |
| 132 | `safeCardVariants` | Never used |
| 136 | `safeTransition` | Never used |
| 142 | `fadeIn` | Never used |
| 150 | `slideUp` | Never used |
| 180 | `safeFadeIn` | Never used |
| 200 | `tableRowDelay` | Never used |
| 215 | `hoverLift` | Never used |
| 244 | `fadeInUp` | Never used |
| 253 | `scrollStagger` | Never used |

Note: `DURATION` and `EASING` (legacy aliases) ARE used by `command-palette.tsx`.

### `frontend/src/lib/chart-theme.ts` -- 12 unused exports

| Line | Export | Notes |
|---|---|---|
| 56 | `getChartAxis()` | Function defined but never called |
| 67 | `getChartGrid()` | Function defined but never called |
| 78 | `getChartTooltip()` | Function defined but never called |
| 112 | `getChartLegend()` | Function defined but never called |
| 126 | `getChartPolar()` | Function defined but never called |
| 152 | `CHART_TOOLTIP` | Object defined but never referenced |
| 181 | `tooltipProps` | Object defined but never referenced |
| 188 | `CHART_LEGEND` | Object defined but never referenced |
| 225 | `getGradientOpacity()` | Function defined but never called |
| 235 | `getChartCursor()` | Function defined but never called |
| 245 | `FINANCIAL_COLORS` | Object defined but never referenced |
| 251 | `getFinancialColor()` | Function defined but never called |

### `frontend/src/components/landing/constants.ts` -- 3 unused exports

| Line | Export | Notes |
|---|---|---|
| 6 | `DemoMetrics` (type) | Type defined but never imported |
| 22 | `PricingTier` (type) | Type defined but never imported |
| 63 | `TICKER_DEALS` | Array defined but never imported |

### `frontend/src/lib/strategy-kpis.ts` -- 1 unused export

| Line | Export | Notes |
|---|---|---|
| 3 | `RenderMode` (type) | Type defined but only used internally by `KPIDefinition`; never imported externally |

---

## 3. Unused npm Packages

Detected by `depcheck`. Runtime dependencies with zero import references:

| Package | Notes |
|---|---|
| `@react-pdf/renderer` | Zero imports in any .ts/.tsx file. Likely replaced or never integrated. |
| `gsap` | Zero imports. Possibly planned but never used. |
| `next-themes` | Zero imports. Theme system uses custom `lib/theme.ts` instead. |

Dev dependencies flagged but may be false positives:

| Package | Notes |
|---|---|
| `@testing-library/user-event` | Not imported in any test file; but may be intended for future tests |
| `@types/google.maps` | Used implicitly (provides global `google.maps` types for PlaceAutocompleteInput) |
| `autoprefixer` / `postcss` | Used by Tailwind CSS build pipeline (referenced in PostCSS config) |
| `shadcn` | CLI tool, not a runtime import |

---

## 4. Unused CSS Classes (`frontend/src/index.css`)

These custom utility classes are defined in `index.css` but never referenced in any `.ts`/`.tsx` file:

| Class | Line (approx) | Notes |
|---|---|---|
| `.label-caps` | 377 | Defined but never applied |
| `.shadow-card-light` | 425 | Light-mode shadow, never used in components |
| `.shadow-elevated-light` | 428 | Light-mode shadow, never used in components |
| `.blob-1` | 487 | Landing page blob animation, never applied |
| `.blob-2` | 488 | Landing page blob animation, never applied |
| `.blob-3` | 489 | Landing page blob animation, never applied |
| `.ticker-animate` | 498 | Ticker animation class, never applied |
| `.skeleton-shimmer` | 513 | Shimmer class, never applied (Tailwind `animate-shimmer` may be used instead) |

---

## 5. Unused Tailwind Config Tokens (`frontend/tailwind.config.ts`)

### Unused Animations (8)

| Token | Tailwind Class |
|---|---|
| `pulse-glow` | `animate-pulse-glow` |
| `fade-in` | `animate-fade-in` |
| `slide-up` | `animate-slide-up` |
| `drift1` | `animate-drift1` |
| `drift2` | `animate-drift2` |
| `drift3` | `animate-drift3` |
| `glow-breathe` | `animate-glow-breathe` |
| `pipeline-slide` | `animate-pipeline-slide` |

Note: `animate-shimmer` and `animate-blink` ARE used in the codebase.

### Unused Shadows (7)

| Token | Tailwind Class |
|---|---|
| `glow-violet` | `shadow-glow-violet` |
| `glow-success` | `shadow-glow-success` |
| `glow-error` | `shadow-glow-error` |
| `focus-violet` | `shadow-focus-violet` |
| `inset-sm` | `shadow-inset-sm` |
| `inset-md` | `shadow-inset-md` |
| `edge-highlight` | `shadow-edge-highlight` |

### Unused Background Layers (2)

| Token | Tailwind Class |
|---|---|
| `layer-5` | `bg-layer-5` |
| `layer-6` | `bg-layer-6` |

### Unused Letter Spacing (4)

| Token | Tailwind Class |
|---|---|
| `display` | `tracking-display` |
| `body` | `tracking-body` |
| `normal` | `tracking-normal` |
| `caps` | `tracking-caps` |

### Unused Font Sizes (8)

These custom design-system font sizes are defined but the codebase uses Tailwind's legacy sizes (`text-base`, `text-lg`, etc.) instead:

| Token | Tailwind Class |
|---|---|
| `hero` | `text-hero` |
| `display` | `text-display` |
| `h1` | `text-h1` |
| `h2` | `text-h2` |
| `h3` | `text-h3` |
| `body-lg` | `text-body-lg` |
| `body` | `text-body` |
| `micro` | `text-micro` |

### Unused Colors (8)

| Token | Example Class |
|---|---|
| `violet-800` | `text-violet-800`, `bg-violet-800` |
| `violet-900` | `text-violet-900`, `bg-violet-900` |
| `success-strong` | `text-success-strong` |
| `warning-strong` | `text-warning-strong` |
| `info-strong` | `text-info-strong` |
| `loss-strong` | `text-loss-strong` |
| `gray-5` | `bg-gray-5`, `text-gray-5` |
| `gray-7` | `bg-gray-7`, `text-gray-7` |

### Unused Border Colors (2)

| Token | Tailwind Class |
|---|---|
| `ghost` | `border-ghost` |
| `accent-strong` | `border-accent-strong` |

### Unused Easing Functions (2)

| Token | Tailwind Class |
|---|---|
| `ease-luxury` | `ease-ease-luxury` |
| `ease-vercel` | `ease-ease-vercel` |

### Unused Font Families (1)

| Token | Tailwind Class |
|---|---|
| `body` | `font-body` (identical to `font-sans`, so redundant) |

---

## 6. Unused Backend Python Imports (144 total)

### Genuine Unused Imports in Application Code

These are actual unused imports in routers, core modules, and models that should be cleaned up.

**Routers (16 unused imports):**

| File | Line | Import |
|---|---|---|
| `backend/routers/activity.py` | 4 | `datetime` |
| `backend/routers/activity.py` | 9 | `String`, `cast`, `literal`, `union_all` from sqlalchemy |
| `backend/routers/analysis.py` | 182 | `get_inputs_hash` from core.ai.deal_narrator |
| `backend/routers/auth.py` | 8 | `datetime` |
| `backend/routers/calculators.py` | 8 | `Session` from sqlalchemy.orm |
| `backend/routers/calculators.py` | 11 | `get_db` from database |
| `backend/routers/contacts.py` | 15 | `limiter` from limiter |
| `backend/routers/financing.py` | 9 | `func` from sqlalchemy |
| `backend/routers/mail_campaigns.py` | 4 | `Optional` from typing |
| `backend/routers/pipeline.py` | 8 | `func` from sqlalchemy |
| `backend/routers/portfolio_v2.py` | 4 | `timedelta` from datetime |
| `backend/routers/properties.py` | 260 | `desc` from sqlalchemy |
| `backend/routers/reports.py` | 47 | `BrandKitSchema` from schemas.reports |
| `backend/routers/skip_tracing.py` | 12 | `Tier` from core.billing.tier_config |
| `backend/routers/today.py` | 517 | `FI` (FinancingInstrument) from models |
| `backend/routers/transactions.py` | 4, 9 | `datetime`, `func` |

**Core modules (17 unused imports):**

| File | Line | Import |
|---|---|---|
| `backend/core/ai/deal_narrator.py` | 13 | `Optional` from typing |
| `backend/core/calculators/projections.py` | 4 | `pmt` from utils |
| `backend/core/calculators/reverse_valuation.py` | 16 | `pmt` from utils |
| `backend/core/communications/service.py` | 12 | `normalize_phone` |
| `backend/core/communications/twilio_sms.py` | 11 | `urlencode` from urllib.parse |
| `backend/core/direct_mail/service.py` | 6, 11 | `datetime`, `COST_CENTS` |
| `backend/core/dispositions/match_engine.py` | 10 | `Decimal` |
| `backend/core/documents/extractor.py` | 5 | `Optional` from typing |
| `backend/core/property_data/address_parser.py` | 7, 9 | `field`, `quote_plus` |
| `backend/core/property_data/providers/bricked.py` | 13 | `json` |
| `backend/core/property_data/providers/rentcast.py` | 14 | `Any` from typing |
| `backend/core/security/clerk.py` | 60, 61 | `jwk`, `RSAKey` from jose |
| `backend/core/skip_tracing/batchdata_provider.py` | 16 | `field` from dataclasses |
| `backend/core/tasks/mail_campaign.py` | 195 | `timezone` from datetime |

**Models (14 unused imports in individual model files):**

| File | Line | Import |
|---|---|---|
| `backend/models/base.py` | 9 | `Base` from database (re-defined locally) |
| `backend/models/deal_contacts.py` | 3 | `DateTime` from sqlalchemy |
| `backend/models/import_jobs.py` | 3 | `ForeignKey` from sqlalchemy |
| `backend/models/password_reset_tokens.py` | 3, 4 | `uuid`, `datetime` |
| `backend/models/properties.py` | 3 | `Float` from sqlalchemy |
| `backend/models/rehab_projects.py` | 4 | `Boolean`, `Integer` from sqlalchemy |
| `backend/models/subscriptions.py` | 3, 5 | `datetime`, `Integer` |
| `backend/models/usage_records.py` | 3 | `datetime` |
| `backend/models/users.py` | 3, 4 | `uuid`, `datetime` |
| `backend/models/webhook_events.py` | 3 | `datetime` |

**Schemas (2 unused imports in individual schema files):**

| File | Line | Import |
|---|---|---|
| `backend/schemas/onboarding.py` | 3, 4 | `datetime`, `Any` |
| `backend/schemas/portfolio.py` | 4 | `datetime` |

### Intentional Re-export / Side-effect Imports (NOT dead code)

These were detected as unused but serve a purpose:

- **`backend/models/__init__.py`** (30+ imports): Re-exports all models for Alembic autogenerate. Imported as `import models` in `alembic/env.py`. These are required.
- **`backend/schemas/__init__.py`** (20+ imports): Convenience re-exports. Some are used via this module.
- **`backend/core/tasks/__init__.py`** (5 imports): Side-effect imports that register Dramatiq actors. Required for worker process.
- **`backend/core/calculators/__init__.py`** (6 imports): Convenience re-exports used by `scripts/seed_demo.py`.

---

## 7. Backend Package Audit (`requirements.txt`)

All 25 packages in `requirements.txt` are used. Packages like `uvicorn` (Procfile), `psycopg2-binary` (SQLAlchemy driver), and `python-multipart` (FastAPI file uploads) are used indirectly rather than via direct import statements.

No unused backend packages found.

---

## Cleanup Priority Recommendations

### High Priority (safe, immediate savings)

1. **Remove 3 unused npm packages**: `@react-pdf/renderer`, `gsap`, `next-themes` -- reduces bundle and install time
2. **Remove 9 dead component/hook/lib files** -- reduces cognitive load and bundle size
3. **Clean up ~47 unused Python imports in routers and core** -- improves code clarity

### Medium Priority (design system hygiene)

4. **Prune 17 unused motion.ts exports** -- the file is 257 lines; over half is unused
5. **Prune 12 unused chart-theme.ts exports** -- similar situation
6. **Remove 8 unused CSS classes from index.css** -- blob/ticker animations appear to be remnants
7. **Remove 30 unused Tailwind tokens** -- the custom design system font sizes (text-hero, text-h1, etc.) are defined but all components use legacy Tailwind sizes instead

### Low Priority (cleanup when touching these files)

8. **Remove 3 unused landing/constants.ts exports** (`DemoMetrics`, `PricingTier`, `TICKER_DEALS`)
9. **Clean up models __init__.py** -- while the re-exports are needed for Alembic, the unused individual model imports (`DateTime`, `Float`, `Integer`, etc.) in the model files themselves can be removed
