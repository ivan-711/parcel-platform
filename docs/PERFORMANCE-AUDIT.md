# Parcel Platform -- Performance & Build Audit

**Date:** 2026-04-12
**Build tool:** Vite 6.4.1
**Build time:** 3.79s (3,483 modules)

---

## 1. Build Output Analysis

### Total Bundle
| Metric | Value |
|--------|-------|
| Total dist/ size (on disk) | 69 MB |
| Total assets/ size (JS + CSS + fonts) | 3.6 MB |
| JS chunks | 138 files |
| CSS | 1 file, 108 KB (21.15 KB gzipped) |

### Largest JS Chunks (by raw size)

| Chunk | Raw | Gzip | Category |
|-------|-----|------|----------|
| `jspdf.es.min` | 390.5 KB | 128.6 KB | Library -- PDF generation |
| `generateCategoricalChart` (recharts) | 359.6 KB | 100.6 KB | Library -- charting engine |
| `index-C-Cnx_Ma` (Clerk SDK) | 243.4 KB | 68.8 KB | Library -- auth |
| `html2canvas.esm` | 202.4 KB | 48.0 KB | Library -- transitive dep of jsPDF |
| `vendor-react` | 164.8 KB | 53.9 KB | Vendor -- React + ReactDOM + Router |
| `index.es` (cmdk / radix / misc) | 159.5 KB | 53.5 KB | Library -- UI primitives |
| `vendor-motion` (framer-motion) | 144.0 KB | 48.6 KB | Vendor -- animation |
| `AnalyzerFormPage` | 135.5 KB | 34.8 KB | **App code** -- largest page |
| `index-DtQNZ5oB` (tanstack-query) | 117.6 KB | 36.2 KB | Library -- data fetching |
| `Pipeline` | 87.1 KB | 27.0 KB | App code -- kanban board |
| `AppShell` | 86.3 KB | 23.7 KB | App code -- layout shell |
| `DocumentsPage` | 81.0 KB | 22.1 KB | App code |
| `AnalysisResultsPage` | 76.4 KB | 20.1 KB | App code |

**Total JS transferred (gzip):** ~860 KB across all chunks (only relevant ones loaded per route thanks to code splitting).

### Build Warnings

1. **Ambiguous Tailwind class:** `ease-[cubic-bezier(0.25,0.1,0.25,1)]` -- matches multiple utilities. Use the escaped form `ease-&lsqb;...&rsqb;` or the named token `ease-luxury` already defined in tailwind.config.ts.

2. **Static + dynamic import conflict:** `MapsProvider.tsx` is both statically and dynamically imported by `AnalyzePage.tsx`. The dynamic import will not create a separate chunk. The static import wins, bundling it into the AnalyzePage chunk regardless.

---

## 2. Code Splitting Assessment

### Route-Level Splitting: GOOD

All 48 page routes use `React.lazy()` in `App.tsx`. Every page is a separate chunk loaded on demand. This is well-implemented.

### Vendor Splitting: PARTIAL

The `vite.config.ts` defines only two manual chunks:

```
vendor-react: ['react', 'react-dom', 'react-router-dom']
vendor-motion: ['framer-motion']
```

**Missing manual chunks that would improve caching:**
- `recharts` -- 360 KB chunk changes rarely, should be its own vendor chunk
- `@clerk/clerk-react` -- 243 KB chunk, stable between deploys
- `@tanstack/react-query` -- 118 KB chunk
- `@dnd-kit/*` -- only used by Pipeline, currently bundled into Pipeline chunk (acceptable)

### Heavy Library Lazy-Loading

| Library | Size | Lazy? | Notes |
|---------|------|-------|-------|
| jsPDF | 390.5 KB | YES | Dynamic `import('jspdf')` in offer-letter-modal.tsx and pdf-report.ts |
| html2canvas | 202.4 KB | YES | Transitive dep of jsPDF, loaded only when jsPDF is |
| recharts | 359.6 KB | NO | Statically imported across 6+ files; pulled into shared chunk by Vite |
| framer-motion | 144.0 KB | N/A | Vendor chunk, loaded on first page with animation |
| @react-pdf/renderer | in deps | UNUSED? | Listed in package.json but **no imports found** in src/ |
| gsap | in deps | UNUSED | Listed in package.json but **no imports found** in src/ |

---

## 3. Asset Optimization

### Images

| Asset | Size | Format | Issue? |
|-------|------|--------|--------|
| `building-complete.png` | **18 MB** | PNG | CRITICAL -- should be WebP/AVIF, ~500 KB target |
| `building-complete.jpg` | **7.6 MB** | JPEG | HIGH -- duplicate of above in JPEG, still oversized |
| Hero frames (121 files) | 7.2 MB total | WebP | OK -- ~60 KB/frame average is reasonable |
| Atmospheric dwelling frames (48 files) | 1.5 MB | WebP | OK |
| Atmospheric hour frames (48 files) | 1.4 MB | WebP |OK |
| **Total /public/images/** | **36 MB** | Mixed | ~26 MB is the two building-complete files |

**Key finding:** 72% of the images directory (26 MB) is two oversized files (`building-complete.png` and `.jpg`). If these are actually used, they should be converted to WebP at appropriate dimensions (~200-500 KB). If they are source files that were not cleaned up, they should be removed from public/.

### Fonts

| Font | Files | Total Size | Preloaded? | font-display |
|------|-------|------------|------------|--------------|
| Satoshi Variable | 2 (normal + italic) | 85 KB | YES | swap |
| General Sans | 4 weights (Light/Regular/Medium/Semibold) | 91 KB | 2 of 4 preloaded | swap |
| JetBrains Mono | 5 subsets (via Fontsource) | 84 KB | No (loaded via CSS) | N/A (Fontsource) |
| **Total** | **11 files** | **260 KB** | -- | -- |

**Findings:**
- All self-hosted fonts use `font-display: swap` -- good.
- Satoshi and General Sans have proper fallback font-face declarations with `ascent-override`, `descent-override`, and `size-adjust` to minimize CLS -- excellent.
- Only 2 of 4 General Sans weights are preloaded (Regular, Medium). Light and Semibold are not preloaded but are used in the design system. Consider preloading Semibold if it's on critical path (h2/h3 headings).
- Fonts are self-hosted woff2 -- good, no external Google Fonts requests.
- Fonts are NOT subsetted (full character sets). Subsetting to Latin could save ~30-40% on Satoshi.

### Hero Frame Sequence

- 121 WebP frames, averaging ~60 KB each (7.2 MB total)
- Frames are not lazy-loaded from the network -- they are in /public/ and presumably downloaded on landing page visit
- Consider: progressive loading (first 10 frames immediately, rest on scroll), or converting to a short video/Lottie if appropriate

---

## 4. Console.log Inventory

Only **1** console statement found in production source:

```
frontend/src/dev/mockApi.ts:430: console.warn('DEV PREVIEW MODE -- mock data, no backend')
```

This is gated behind `import.meta.env.VITE_DEV_PREVIEW === 'true'` and the entire file is dynamically imported only in that case. It is fully tree-shaken from production builds. **No action needed.**

---

## 5. React Performance Patterns

### Memoization in Heavy Components

| Component | Lines | useMemo | useCallback | React.memo | Assessment |
|-----------|-------|---------|-------------|------------|------------|
| Pipeline.tsx | 526 | YES | YES (8 callbacks) | NO | Good hooks usage; child `DealCard` would benefit from React.memo |
| AnalyzerFormPage.tsx | 1,302 | -- | -- | NO | Needs audit -- largest app page, no memo patterns found at page level |
| AppShell.tsx | 902 | NO | NO | NO | No memoization in a 900-line layout component rendered on every route |
| AnalysisResultsPage.tsx | 460 | -- | YES (6 callbacks) | NO | Good callback usage |
| DocumentsPage.tsx | 163 | NO | NO | NO | Small enough that memoization may not matter |

### React.memo Usage

**Zero** `React.memo()` wrappers found anywhere in the codebase. This is a missed optimization for:
- `DealCard` (rendered N times in kanban columns, re-renders when siblings move)
- Pipeline kanban column components
- Chart wrapper components (Sparkline, CashFlowProjection, etc.)
- List item components in PropertiesListPage, ContactsListPage, etc.

### Inline Object/Array Literals in Props

Not individually audited (would require AST analysis), but with zero React.memo in the codebase, inline literals are less impactful since nothing is memoized to skip anyway.

---

## 6. Bundle-Heavy Import Patterns

### Tree-Shaking Status

| Pattern | Status |
|---------|--------|
| lodash full import (`import _ from 'lodash'`) | NOT FOUND -- good |
| `import * as` patterns | Only used for React and Radix primitives -- these tree-shake correctly |
| recharts | Named imports only (`import { AreaChart, ... }`) -- but recharts does not tree-shake well internally |

### Potentially Unused Dependencies

| Package | In package.json | Imports Found | Action |
|---------|-----------------|---------------|--------|
| `gsap` (6.3 MB node_modules) | YES | **NONE** | Remove from dependencies |
| `@react-pdf/renderer` (3.0 MB node_modules) | YES | **NONE** | Remove from dependencies |

These add no bundle weight (Vite only bundles what is imported), but they bloat `node_modules/` and `npm install` time.

---

## 7. CSS Analysis

### Compiled CSS
- Single file: `index-CuCC6_k2.css`
- Raw: 108 KB / Gzipped: 21.15 KB
- This is a healthy size for a full-featured application with dual-theme support

### Tailwind Configuration
- `content` path correctly set: `['./index.html', './src/**/*.{ts,tsx}']` -- purge is properly configured
- `darkMode: ['class']` -- standard
- Only 1 plugin: `tailwindcss-animate`
- Custom design system is well-structured with luxury color scale, semantic tokens, and type scale

### Potential CSS Issues
- The Tailwind config replaces the entire `colors` key (top-level override, not extend), which means default Tailwind colors (red, blue, green, etc.) are unavailable. This is intentional for the design system but means any accidental use of standard Tailwind color classes produces no output silently.
- Many custom keyframes defined (drift1, drift2, drift3, glow-breathe, pipeline-slide) -- all landing-page specific. These add to CSS size even on app pages, but the impact is negligible (~1 KB).

---

## 8. Recommendations (Priority-Ordered)

### P0 -- Critical (Do First)

1. **Compress or remove `building-complete.png` (18 MB) and `building-complete.jpg` (7.6 MB)**
   - If used: convert to WebP, resize to display dimensions, target < 500 KB
   - If source files: remove from public/ (they ship to production CDN)
   - Impact: -25.6 MB from deployed static assets

### P1 -- High Impact

2. **Add recharts to manual vendor chunks in vite.config.ts**
   ```ts
   manualChunks: {
     'vendor-react': ['react', 'react-dom', 'react-router-dom'],
     'vendor-motion': ['framer-motion'],
     'vendor-charts': ['recharts'],  // 360 KB -- cache separately
   }
   ```
   - Impact: Better long-term caching. App code changes do not invalidate the charts chunk.

3. **Add React.memo() to frequently re-rendered list item components**
   - Priority targets: `DealCard`, `KanbanColumn`, list row components in PropertiesListPage, ContactsListPage
   - Impact: Reduced re-renders during drag-and-drop, filtering, and sorting

4. **Remove unused dependencies: `gsap`, `@react-pdf/renderer`**
   - Impact: Cleaner dependency tree, faster installs, reduced supply chain surface

### P2 -- Medium Impact

5. **Fix MapsProvider static/dynamic import conflict in AnalyzePage.tsx**
   - Remove the static import or the dynamic import -- having both defeats the purpose of dynamic loading
   - Impact: Smaller AnalyzePage initial chunk if MapsProvider can be deferred

6. **Subset fonts to Latin character set**
   - Satoshi and General Sans include full Unicode ranges
   - Subsetting to Latin + Latin Extended could save ~30-40% on font files (~30 KB)
   - Impact: Faster font loading, less data transferred

7. **Preload General Sans Semibold (600 weight)**
   - Currently only Regular and Medium are preloaded; Semibold is used in h2/h3 headings
   - Impact: Reduced FOUT on first meaningful paint for heading text

8. **Add AppShell.tsx memoization**
   - 902-line component with zero useMemo/useCallback; re-renders on every route change
   - Memoize sidebar navigation items, user menu, and notification state
   - Impact: Smoother route transitions

### P3 -- Low Priority / Nice to Have

9. **Consider splitting AnalyzerFormPage.tsx (1,302 lines)**
   - Largest single page component; produces a 135.5 KB chunk
   - Could extract form sections into sub-components for better code organization (may not help bundle size due to same route)

10. **Fix ambiguous Tailwind class warning**
    - Replace `ease-[cubic-bezier(0.25,0.1,0.25,1)]` with the design system token `ease-luxury`
    - Impact: Clean build output, one fewer runtime ambiguity

11. **Hero frame sequence loading strategy**
    - 121 frames x 60 KB = 7.2 MB loaded on landing page
    - Consider progressive loading: first 10 frames immediately, load remaining on scroll/idle
    - Or evaluate converting to a short looping video (H.265/AV1 would be much smaller)

12. **Add @clerk/clerk-react and @tanstack/react-query to vendor chunks**
    - Improves cache stability across deploys
    - Impact: Minor -- these already split into their own chunks by Vite's automatic splitting

---

## Summary

| Area | Grade | Notes |
|------|-------|-------|
| Code splitting | A | All routes lazy-loaded, jsPDF dynamically imported |
| Vendor chunking | B | Two manual chunks defined; recharts and Clerk could be added |
| Image optimization | D | Two files totaling 25.6 MB in public/ |
| Font loading | A- | Self-hosted, preloaded, swap, fallback metrics -- just missing subsetting |
| Console.log hygiene | A+ | Zero console statements in production code |
| Tree-shaking | A | No full-library imports, named imports throughout |
| React memoization | C | Good useCallback usage in heavy components, but zero React.memo in entire codebase |
| CSS | A | 21 KB gzipped, properly purged, clean design system |
| Unused dependencies | B- | gsap and @react-pdf/renderer in package.json with no imports |
