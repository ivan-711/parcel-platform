# 05 -- Technical Stack Verification Audit

**Date:** 2026-04-02  
**Auditor:** Claude (automated research audit)  
**Reference document:** `RESEARCH/14-mobile-ios-strategy.md` (2026-04-02)  
**Method:** Web research across official docs, release notes, npm registries, and platform changelogs  

---

## 1. Capacitor

**Status: CHANGED -- Action Required**

### What the research assumed
- Capacitor as the hybrid framework for wrapping the React + Vite app
- Migration steps referencing `@capacitor/core` and `@capacitor/cli` (implicitly Capacitor 6.x era)
- Xcode and iOS deployment targets not explicitly versioned beyond standard requirements
- CocoaPods as the iOS dependency manager

### Current state (April 2026)
- **Capacitor 8** is the current major version, released late 2025
- Capacitor now follows a faster release cadence (annual major versions)
- **Breaking changes in Capacitor 8:**
  - Requires **Node.js 22+** (research did not specify a Node version)
  - Requires **Xcode 26.0+** and **iOS deployment target 15.0+**
  - **Swift Package Manager (SPM)** is the default for new iOS projects, replacing CocoaPods (existing CocoaPods projects still work)
  - Android edge-to-edge is mandatory; `adjustMarginsForEdgeToEdge` config removed in favor of new System Bars core plugin and CSS `env()` variables
  - Android targets SDK 36, requires Android Studio Otter 2025.2.1+
- Ionic team is **actively maintaining** Capacitor -- backlog cleanup announced Feb 2026, regular releases on GitHub
- A CLI migration tool exists: `npx cap migrate` handles most upgrade steps automatically

### Impact on Parcel
- Since Parcel has not yet initialized Capacitor, starting fresh on Capacitor 8 is actually simpler than migrating -- no legacy CocoaPods project to deal with
- Node.js 22 requirement may require updating the Railway runtime and local dev environments
- The research's setup steps (`npm install @capacitor/core`, `npx cap init`, etc.) remain valid but will produce a Capacitor 8 / SPM project instead of Capacitor 6 / CocoaPods
- Edge-to-edge CSS handling aligns well with the safe-area-inset work already done in Phase 10-D

### Recommended action
- Pin setup instructions to Capacitor 8 when starting the mobile initiative
- Ensure Node.js 22+ in Railway Dockerfile and local `.nvmrc`
- No architectural changes needed -- Capacitor 8 is a better starting point than assumed

---

## 2. Apple WebView Policies

**Status: CONCERN -- Manageable with planned approach**

### What the research assumed
- Capacitor apps pass App Store review if they include native features (push, biometrics, etc.)
- Guideline 4.2 (Minimum Functionality) is the main risk, mitigated by adding native capabilities
- App Store approval rate "comparable to native apps"

### Current state (April 2026)
- **UIWebView is fully banned** -- all apps must use WKWebView. Capacitor has used WKWebView for years, so this is a non-issue
- **Guideline 4.2 rejections remain the primary risk** for WebView-based apps. Apple routinely rejects apps that are "not sufficiently different from a mobile web browsing experience"
- Apple's 2025 policies added **stricter privacy, security, and performance requirements** for Capacitor apps specifically
- **OTA updates** (Capgo/Appflow) are permitted only for JavaScript and asset changes -- no native code modifications or unreviewed feature additions allowed; apps using unencrypted updates face rejection
- **Privacy manifests** and **third-party SDK signatures** are now required for all submissions
- Starting April 2026, all submissions must use the **iOS 26 SDK** (aligns with Capacitor 8's Xcode 26 requirement)
- **Nearly 40% of all iOS submissions** face delays or rejection due to preventable issues (not Capacitor-specific)
- No evidence of a blanket ban on Capacitor/hybrid apps -- rejections are case-by-case based on feature depth

### Impact on Parcel
- The research's Phase 1 plan (push notifications + biometric auth + deep linking + haptics) is the correct approach to pass Guideline 4.2
- Privacy manifests and SDK signatures add a checklist item but not a blocker
- The planned Capgo OTA updates strategy is valid but must stay within JS/asset-only boundaries
- AI data disclosure requirement is relevant given Parcel's Claude AI integration

### Recommended action
- Ensure Phase 1 Sprint 1A includes at least 3 native features (push, biometrics, haptics) before first submission
- Prepare privacy manifests and AI data disclosure (Claude integration) as part of the submission checklist
- Budget 1-2 extra weeks for potential 4.2 rejection and resubmission cycle

---

## 3. Transistor Background GPS Plugin

**Status: VERIFIED -- Minor version change**

### What the research assumed
- `@transistorsoft/capacitor-background-geolocation` is the gold standard
- $299 one-time license
- Battery-conscious motion detection, SQLite persistence, HTTP sync layer
- Compatible with Capacitor

### Current state (April 2026)
- Plugin is at **version 9.0.2** (published within the last week as of this audit)
- **Actively maintained** -- regular releases, responsive issue tracker
- Now on **major version 9** (research did not specify a version; likely referenced v4-v5 era)
- **v8.x license keys do NOT work with v9** -- a license upgrade may be required
- Requires **Capacitor 5+** (Capacitor 8 should be compatible)
- All core features remain: SQLite persistence, HTTP sync, battery-conscious tracking, geofencing
- A single license works across all plugin variants (React Native, Cordova, Capacitor, Flutter) -- no need for separate platform licenses
- **No better-maintained alternative exists** -- this remains the definitive background geolocation plugin for Capacitor

### Impact on Parcel
- The $299 price point referenced in the research may have changed with v9 (exact pricing requires checking the Transistor Software shop directly at `shop.transistorsoft.com`)
- Since Parcel hasn't purchased a license yet, this is a non-issue -- just buy the v9 license when ready
- Plugin API may have changed between the version era referenced and v9; consult v9 migration docs

### Recommended action
- Verify current v9 license pricing on shop.transistorsoft.com before budgeting
- Use v9 documentation (not older docs) when implementing D4D in Phase 2
- No alternative needed -- Transistor remains the clear choice

---

## 4. PostgreSQL on Railway (pgvector + PostGIS)

**Status: VERIFIED**

### What the research assumed
- PostgreSQL on Railway as the primary database
- pgvector for embedding storage (RAG/semantic search)
- PostGIS availability implied for geospatial queries

### Current state (April 2026)
- **pgvector is fully supported** on Railway -- pre-compiled and installed in Railway's container image, deployed with a single click via official template
- **PostGIS is supported** but requires either a custom Docker image or one of Railway's pre-built templates (e.g., PostgreSQL 18 HA Cluster which includes pgvector + PostGIS + pg_cron + pg_partman)
- Railway also offers **Supabase Postgres** template with 50+ extensions including both pgvector and PostGIS
- **pgvectorscale** (enhanced vector indexing by Timescale) is also available as a Railway template for higher-performance vector search
- No pricing changes specific to PostgreSQL extensions -- standard Railway usage rates apply

### Impact on Parcel
- The assumed stack is fully supported and has actually gotten easier to deploy since the research was written
- If Parcel needs both pgvector and PostGIS in the same database, the PostgreSQL 18 HA Cluster template is the path of least resistance
- pgvectorscale is a potential upgrade for better vector search performance at scale

### Recommended action
- No changes needed. Consider the PostgreSQL 18 HA Cluster template when deploying to get pgvector + PostGIS + pg_cron in one image
- Evaluate pgvectorscale if vector search performance becomes a bottleneck

---

## 5. Embedding Pricing

**Status: VERIFIED -- Prices have gotten cheaper**

### What the research assumed
- OpenAI `text-embedding-3-small` and `text-embedding-3-large` as the embedding models
- Ollama for local/self-hosted embedding as a cost alternative

### Current state (April 2026)
- **OpenAI text-embedding-3-small: $0.02 per million tokens** (unchanged, still the best price/performance ratio for most RAG use cases)
- **OpenAI text-embedding-3-large: ~$0.13 per million tokens** (unchanged)
- **Batch API discount:** 50% off ($0.01/MTok for text-embedding-3-small) for non-real-time workloads
- **Cheaper commercial alternatives exist:**
  - Mistral Embed: $0.01/MTok (cheapest commercial option)
  - Google Gemini Embedding: free tier via AI Studio, or $0.20/MTok for Gemini Embedding 2
  - Voyage AI voyage-3.5: $0.06/MTok (higher quality for domain-specific tasks)
  - Cohere Embed 4: $0.12/MTok
- **Open-source alternatives:** NV-Embed-v2, Qwen3-Embedding (free, competitive on benchmarks, self-hosted)
- **Ollama for production:**
  - Viable for low-concurrency, single-user or small-team deployments
  - Models like `nomic-embed-text` and `mxbai-embed-large` run fully offline
  - **Not viable for high-concurrency production** -- at 128 simultaneous users, latency spikes to 673ms (vs sub-100ms for vLLM)
  - For production serving at scale, vLLM or TGI are recommended over Ollama

### Impact on Parcel
- At Parcel's current scale, OpenAI text-embedding-3-small at $0.02/MTok is negligible cost
- Google Gemini free tier is worth evaluating for development/testing to reduce API costs
- Ollama is fine for local dev but should not be the production embedding provider if Parcel scales beyond a few dozen concurrent users

### Recommended action
- Stay with OpenAI text-embedding-3-small for production -- proven, cheap, well-integrated
- Use Batch API for bulk re-embedding operations (property database indexing) at 50% discount
- Revisit embedding provider if monthly costs exceed $50/mo (unlikely at current scale)

---

## 6. Railway Platform

**Status: VERIFIED -- Minor pricing clarification**

### What the research assumed
- Railway as the deployment platform for FastAPI + PostgreSQL
- Suitable for production SaaS

### Current state (April 2026)
- **No free tier** -- only a 30-day trial with $5 one-time credit
- **Hobby plan: $5/mo** -- includes $5 of resource credits, up to 48 vCPU / 48 GB RAM, single developer, 7-day logs
- **Pro plan: $20/mo** -- includes $20 of resource credits, up to 1,000 vCPU / 1 TB RAM, unlimited seats, 30-day logs, Railway support
- **Usage rates after credits:**
  - Memory: $0.000231/GB-min (~$10/GB-month)
  - CPU: $0.000463/vCPU-min (~$20/vCPU-month)
  - Volumes: $0.21/GB-month
  - Egress: $0.05/GB
  - Object Storage: $0.015/GB-month
- Platform is **actively maintained and production-ready** -- considered one of the fastest deployment platforms
- No major reliability incidents or concerns reported
- Railway vs. Render comparisons show Railway winning on deployment speed and DX

### Impact on Parcel
- Parcel is likely on the Hobby or Pro plan, both of which remain viable
- For production SaaS with paying customers, the **Pro plan ($20/mo)** is recommended for 30-day logs and support access
- No pricing surprises -- the usage-based model is transparent and predictable

### Recommended action
- Ensure Parcel is on the Pro plan before launching to paying customers
- Monitor monthly usage against credits -- at early scale, the $20 credit likely covers most usage
- No platform migration needed

---

## 7. Vite / React Ecosystem

**Status: CHANGED -- Migration path available, not urgent**

### What the research assumed
- React 18 + TypeScript + Vite (current `package.json` confirms React ^18.3.1, Vite ^6.0.5)
- Standard Vite + React plugin build toolchain

### Current state (April 2026)
- **Vite 8.0.3** is the latest version (Parcel is on Vite 6.x)
  - Vite 7.0 (June 2025): dropped Node.js 18 support
  - Vite 8.0: replaced esbuild and Rollup with **Rolldown and Oxc-based tools**; React plugin no longer requires Babel for React Refresh
  - Default browser targets updated to Chrome 111, Edge 111, Firefox 114, Safari 16.4
- **React 19.2.4** is the latest version (Parcel is on React 18.3.1)
  - React 19 introduced: `ref` as prop (no more `forwardRef`), Actions, Server Components as core, `useActionState`, `useOptimistic`
  - React 19.2 added: Activity (pre-rendering), updated `useId` prefix
  - No React 20 has been announced or released
  - `create-react-app` officially deprecated (Feb 2025) -- Vite is the de facto React starter
- **No breaking changes** that would prevent Parcel from continuing on React 18 + Vite 6 for the foreseeable future
- React 18 is still supported and receives security patches

### Impact on Parcel
- **Vite 6 is two major versions behind** -- still functional but will stop receiving security patches eventually
- **React 18 is one major version behind** -- still fully supported, but new libraries and plugins are increasingly targeting React 19
- The Capacitor 8 requirement for Node.js 22+ is compatible with both current and latest Vite/React versions
- Upgrading Vite 6 -> 8 would require testing the Rolldown bundler (replaces esbuild/Rollup) but no code changes in most cases
- Upgrading React 18 -> 19 would require auditing `forwardRef` usage, deprecated lifecycle methods, and testing with the new React compiler (optional)

### Recommended action
- **Do not upgrade during the Capacitor mobile initiative** -- introducing Vite 8 + React 19 simultaneously with Capacitor 8 creates too many variables
- Plan a dedicated upgrade sprint after the mobile app is stable:
  1. Vite 6 -> 8 (bundler change, run full test suite)
  2. React 18 -> 19 (API changes, `forwardRef` removal, new features)
- Ensure Node.js 22+ is adopted first (required by both Capacitor 8 and Vite 7+)

---

## 8. Supabase Auth

**Status: NOT APPLICABLE**

### What the research assumed
- Supabase Auth is not referenced in `14-mobile-ios-strategy.md`
- Supabase is mentioned only in `05-database-architecture.md` as a potential future migration target for managed PostgreSQL

### Current state (April 2026)
- Parcel does **not use Supabase Auth** -- the codebase has no Supabase dependencies
- For reference, Supabase Auth has undergone significant changes in 2025-2026:
  - New API key model: publishable keys replace `anon` key, secret keys replace `service_role` key
  - RLS enabled by default on new tables
  - Leaked key auto-revocation via GitHub Secret Scanning
  - Column-level security added
  - 2026 roadmap includes push protection, grant toggles, and OpenFGA integration
- If Parcel ever migrates to Supabase for database hosting, the auth system would be available but is not required

### Impact on Parcel
- None. Parcel uses its own FastAPI-based authentication.

### Recommended action
- No action needed. Revisit only if Parcel considers migrating from Railway PostgreSQL to Supabase.

---

## Summary Table

| Topic | Status | Action Required? |
|-------|--------|-----------------|
| Capacitor | CHANGED (v8) | Use Capacitor 8, ensure Node.js 22+ |
| Apple WebView policies | CONCERN | Plan for 4.2 rejection cycle, prepare privacy manifests |
| Transistor GPS plugin | VERIFIED (v9) | Verify v9 license pricing before purchase |
| PostgreSQL on Railway | VERIFIED | No changes needed |
| Embedding pricing | VERIFIED | Stay with OpenAI, use Batch API for bulk ops |
| Railway platform | VERIFIED | Upgrade to Pro plan before launch |
| Vite/React ecosystem | CHANGED (Vite 8, React 19) | Defer upgrades; do not combine with mobile initiative |
| Supabase Auth | N/A | Not used by Parcel |

---

## Sources

- [Announcing Capacitor 8 - Ionic Blog](https://ionic.io/blog/announcing-capacitor-8)
- [Updating to 8.0 - Capacitor Documentation](https://capacitorjs.com/docs/updating/8-0)
- [Capacitor 8 Migration Guide](https://noumansehgal.com/blog/migrating-capacitor-7-to-8-guide)
- [New Capacitor Release Cadence - Ionic Blog](https://ionic.io/blog/introducing-a-new-capacitor-release-cadence)
- [Apple Policy Updates for Capacitor Apps 2025](https://capgo.app/blog/apple-policy-updates-for-capacitor-apps-2025/)
- [App Store Review Guidelines: WebView Apps](https://www.mobiloud.com/blog/app-store-review-guidelines-webview-wrapper)
- [Capacitor OTA Updates: App Store Approval Guide](https://capgo.app/blog/capacitor-ota-updates-app-store-approval-guide/)
- [@transistorsoft/capacitor-background-geolocation - npm](https://www.npmjs.com/package/@transistorsoft/capacitor-background-geolocation)
- [Transistor Software - Capacitor Background Geolocation](https://www.transistorsoft.com/shop/products/capacitor-background-geolocation)
- [Railway: Deploy Postgres with pgVector](https://railway.com/deploy/postgres-with-pgvector-engine)
- [Railway: Hosting Postgres with pgvector](https://blog.railway.com/p/hosting-postgres-with-pgvector)
- [Railway Pricing Plans](https://docs.railway.com/pricing/plans)
- [Railway Review 2026](https://www.srvrlss.io/provider/railway/)
- [Embedding Models Pricing - March 2026](https://awesomeagents.ai/pricing/embedding-models-pricing/)
- [Best Embedding Models in 2026](https://elephas.app/blog/best-embedding-models)
- [Vite 7.0 Changes](https://syntackle.com/blog/vite-7-is-here/)
- [Vite Releases](https://vite.dev/releases)
- [React v19](https://react.dev/blog/2024/12/05/react-19)
- [React 19.2](https://react.dev/blog/2025/10/01/react-19-2)
- [Supabase Security Retro 2025](https://supabase.com/blog/supabase-security-2025-retro)
