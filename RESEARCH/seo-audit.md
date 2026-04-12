# SEO Audit — parceldesk.io

> Date: April 6, 2026
> Status: **Critical gaps found**

---

## Executive Summary

Parcel has basic OG tags in `index.html` but is missing every other SEO fundamental: no robots.txt, no sitemap, no per-page titles, no canonical URLs, no structured data, and the pricing page is behind auth. The OG description reads like a developer portfolio pitch, not a user-facing value proposition.

---

## 1. Meta Tags (index.html)

**File:** `frontend/index.html`

### Present

| Tag | Value | Verdict |
|-----|-------|---------|
| `<title>` | "Parcel — Real Estate Intelligence Platform" | OK |
| `meta description` | "Deal analysis, document processing, pipeline management, and AI-powered insights for real estate professionals." | OK |
| `og:title` | "Parcel — AI-Powered Real Estate Deal Analysis Platform" | OK |
| `og:description` | "Full-stack SaaS platform with 5 investment strategy calculators, Claude AI integration, and Kanban deal pipeline. **Built with React, TypeScript, FastAPI, and PostgreSQL.**" | **BAD** — reads like a GitHub README, not a product pitch |
| `og:image` | `https://www.parceldesk.io/og-preview.png` | OK (file exists in `public/`) |
| `og:type` | `website` | OK |
| `og:url` | `https://www.parceldesk.io` | OK |
| `twitter:card` | `summary_large_image` | OK |

### Missing

| Tag | Impact |
|-----|--------|
| `<link rel="canonical">` | Duplicate content risk — Google may index `www` and non-`www` as separate pages |
| `twitter:title` | Falls back to `og:title` (acceptable but suboptimal) |
| `twitter:description` | Falls back to `og:description` — which is the dev-facing one |
| `twitter:image` | Falls back to `og:image` (acceptable) |
| `twitter:site` | No Twitter handle associated |
| `meta robots` | Defaults to `index,follow` (OK, but explicit is better) |

### Fix: og:description

```html
<!-- BEFORE -->
<meta property="og:description" content="Full-stack SaaS platform with 5 investment strategy calculators, Claude AI integration, and Kanban deal pipeline. Built with React, TypeScript, FastAPI, and PostgreSQL." />

<!-- AFTER -->
<meta property="og:description" content="Paste any US address. Get a full investment analysis across 5 strategies — wholesale, BRRRR, flip, buy & hold, and creative finance — with AI-driven insights, in under 60 seconds." />
```

### Fix: Add missing tags to index.html `<head>`

```html
<link rel="canonical" href="https://www.parceldesk.io/" />
<meta name="twitter:title" content="Parcel — Real Estate Intelligence Platform" />
<meta name="twitter:description" content="Paste any US address. Get a full investment analysis across 5 strategies — wholesale, BRRRR, flip, buy & hold, and creative finance — with AI-driven insights, in under 60 seconds." />
<meta name="twitter:image" content="https://www.parceldesk.io/og-preview.png" />
```

---

## 2. Per-Page Titles & Descriptions

**Status:** Not implemented. Every page serves the same root-level `<title>` and `<meta description>`.

**Library needed:** `react-helmet-async` (lightweight, works with React Router).

### Pages that need unique meta

| Route | Suggested Title | Suggested Description |
|-------|----------------|----------------------|
| `/` | Parcel — Real Estate Intelligence Platform | Paste any US address and get a full investment analysis across 5 strategies with AI-driven insights, in under 60 seconds. |
| `/login` | Log In — Parcel | Sign in to your Parcel account to analyze deals, manage your pipeline, and track your portfolio. |
| `/register` | Create Account — Parcel | Start analyzing real estate deals for free. 5 investment strategies, AI insights, and pipeline management. |
| `/forgot-password` | Reset Password — Parcel | Reset your Parcel account password. |
| `/pricing` | Pricing — Parcel | Compare Starter, Professional, and Enterprise plans. Start free, upgrade as you scale. |
| `/share/:dealId` | Deal Analysis — Parcel | (Dynamic: pull deal address from API if possible) |

### Implementation pattern

```bash
npm install react-helmet-async
```

Wrap `<App>` in `<HelmetProvider>` in `main.tsx`, then per page:

```tsx
import { Helmet } from 'react-helmet-async';

export default function Login() {
  return (
    <>
      <Helmet>
        <title>Log In — Parcel</title>
        <meta name="description" content="Sign in to your Parcel account." />
        <link rel="canonical" href="https://www.parceldesk.io/login" />
      </Helmet>
      {/* ... existing JSX */}
    </>
  );
}
```

---

## 3. robots.txt

**Status:** Missing. No file at `frontend/public/robots.txt`.

### Fix: Create `frontend/public/robots.txt`

```
User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /analyze
Disallow: /pipeline
Disallow: /portfolio
Disallow: /documents
Disallow: /chat
Disallow: /settings
Disallow: /onboarding
Disallow: /today
Disallow: /properties
Disallow: /contacts
Disallow: /transactions
Disallow: /reports
Disallow: /obligations
Disallow: /financing
Disallow: /rehabs
Disallow: /buyers
Disallow: /dispositions
Disallow: /sequences
Disallow: /skip-tracing
Disallow: /mail-campaigns
Disallow: /d4d
Disallow: /compliance
Disallow: /compare

Sitemap: https://www.parceldesk.io/sitemap.xml
```

---

## 4. sitemap.xml

**Status:** Missing. No file at `frontend/public/sitemap.xml`, no generation library.

### Fix: Create `frontend/public/sitemap.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.parceldesk.io/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.parceldesk.io/login</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://www.parceldesk.io/register</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://www.parceldesk.io/pricing</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

---

## 5. Pricing Page Access — CRITICAL

**File:** `frontend/src/App.tsx:180`

```tsx
// CURRENT — behind auth, crawlers can't access
<Route path="/pricing" element={<ProtectedRoute><PageErrorBoundary><PricingPage /></PageErrorBoundary></ProtectedRoute>} />
```

**Fix:** Move `/pricing` out of `ProtectedRoute` so it's publicly accessible and crawlable:

```tsx
// Either make it fully public:
<Route path="/pricing" element={<PageErrorBoundary><PricingPage /></PageErrorBoundary>} />

// Or if pricing needs to show differently for logged-in vs logged-out users,
// conditionally render without blocking access
```

This is the single highest-impact fix. A pricing page behind auth cannot be crawled by Google, cannot be shared on social media, and breaks the standard SaaS buying flow.

---

## 6. Structured Data (JSON-LD)

**Status:** Not implemented anywhere in the frontend.

### Fix: Add to `LandingPage.tsx` (or inject via Helmet)

```tsx
<Helmet>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Parcel",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "url": "https://www.parceldesk.io",
      "description": "AI-powered real estate deal analysis platform with 5 investment strategies.",
      "offers": {
        "@type": "AggregateOffer",
        "lowPrice": "0",
        "highPrice": "149",
        "priceCurrency": "USD",
        "offerCount": "3"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "reviewCount": "1"
      }
    })}
  </script>
</Helmet>
```

**Note:** Only add `aggregateRating` once you have real reviews. Remove it until then to avoid Google penalties for fake structured data.

Also add Organization schema:

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Parcel",
  "url": "https://www.parceldesk.io",
  "logo": "https://www.parceldesk.io/og-preview.png",
  "sameAs": []
}
```

---

## 7. Vercel Configuration

**File:** `frontend/vercel.json`

**Current:** Only has SPA rewrite rule.

### Fix: Add SEO and security headers

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
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
    },
    {
      "source": "/fonts/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/images/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=86400, stale-while-revalidate=604800" }
      ]
    }
  ]
}
```

---

## 8. Share Pages (Low Priority)

Routes `/share/:dealId`, `/reports/view/:shareToken`, `/packets/view/:shareToken` are public but serve generic meta tags. When shared on social media, they all show "Parcel — Real Estate Intelligence Platform" instead of the deal address or report title.

**Fix (requires backend support):** These pages would need to either:
1. Fetch deal data and set `document.title` + inject meta via Helmet (works for title, not for social crawlers which don't execute JS)
2. Use Vercel Edge Functions to inject OG tags server-side before the SPA loads (proper fix for social previews)

This is a medium-term optimization — not urgent.

---

## Priority Matrix

| # | Fix | Effort | Impact | Files |
|---|-----|--------|--------|-------|
| 1 | Fix og:description (remove dev jargon) | 5 min | High | `index.html` |
| 2 | Create robots.txt | 5 min | High | `public/robots.txt` (new) |
| 3 | Create sitemap.xml | 5 min | High | `public/sitemap.xml` (new) |
| 4 | Add canonical + Twitter tags | 5 min | Medium | `index.html` |
| 5 | Make /pricing public | 10 min | **Critical** | `App.tsx` |
| 6 | Install react-helmet-async + per-page titles | 30 min | High | `package.json`, `main.tsx`, 5 page files |
| 7 | Add JSON-LD structured data | 15 min | Medium | `LandingPage.tsx` |
| 8 | Update vercel.json headers | 10 min | Medium | `vercel.json` |
| 9 | Share page dynamic meta (Edge Functions) | 2-4 hrs | Low | New edge function |

**Total for items 1-8: ~1.5 hours of work.**
