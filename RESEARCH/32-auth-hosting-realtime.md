# Research Report: Authentication, Hosting/Deployment, and Real-Time
**Date:** 2026-04-02  
**Context:** Parcel Platform — solo founder, Python/FastAPI backend, React frontend (Vercel), US-only, 150-10K users over 2 years, $29-149/mo SaaS

---

## CATEGORY 4: AUTHENTICATION

### Requirements Recap
- Email/password, Google OAuth (now)
- Magic links, team invites with RBAC, API keys, MFA (future)
- Token revocation, CSRF protection
- Python/FastAPI backend

---

### Option 1: Custom JWT (Roll Your Own)

**Stack:** python-jose (or PyJWT) + passlib (or pwdlib/argon2) + FastAPI OAuth2 utilities

| Aspect | Details |
|--------|---------|
| **Cost** | $0 (your time) |
| **Effort estimate** | 2-4 weeks for email/password + Google OAuth. 1-2 weeks per additional feature (magic links, RBAC, MFA). Ongoing maintenance forever. |
| **Security risks** | Token revocation requires a blocklist store (Redis). No built-in brute-force protection. Must implement CSRF, rate limiting, password reset flows manually. JWT replay attacks if jti tracking is skipped. Every CVE in your auth stack is your problem. |
| **Ongoing burden** | Password hashing algorithm upgrades, session management, OAuth provider API changes, security audits, account recovery flows, email deliverability for verification/reset emails. |
| **Python SDK** | Native — you ARE the SDK |
| **Self-hosted** | By definition |
| **Vendor lock-in** | None |
| **Solo-dev complexity** | HIGH — auth is the #1 thing solo devs get wrong. Every hour spent here is an hour not spent on the product. |
| **Honest downsides** | You become your own security team. One mistake = user data breach. Building team/org management, SAML SSO, and MFA from scratch is months of work. |

**Verdict:** Only makes sense if you have deep auth expertise AND enjoy maintaining it. For a solo founder building a real estate SaaS, this is a trap.

---

### Option 2: Clerk

| Metric | Details |
|--------|---------|
| **100 MAU** | $0 (Hobby plan — 50K MAU free) |
| **1,000 MAU** | $0 |
| **10,000 MAU** | $0 |
| **50,000 MAU** | $0 (just at the limit) |
| **Beyond 50K** | Pro plan: $25/mo base + $0.02/MAU (50,001-100K), tiered down to $0.012 at 10M+ |
| **Email/password** | Yes |
| **OAuth** | Yes (3 social connections on Hobby, unlimited on Pro) |
| **Magic links** | Yes |
| **Team/org** | Yes — B2B add-on at $100/mo ($85 annually) |
| **API keys** | Not a core feature; would need custom implementation |
| **MFA** | Pro plan and above |
| **Python SDK** | Official `clerk-backend-api` SDK + `fastapi-clerk-auth` middleware. Released Oct 2024. Works but is newer/less battle-tested than JS SDK. |
| **Self-hosted** | No |
| **Vendor lock-in** | MODERATE — pre-built React components create tight coupling. User data exportable. |
| **Solo-dev complexity** | LOW — best DX in the category. React components drop in. |
| **Honest downsides** | B2B/org support is a $100/mo add-on. Python SDK is newer. No self-hosted option. If you outgrow their model, migration is painful because of tight UI integration. 3 social connections limit on free tier. |

---

### Option 3: Auth0 (by Okta)

| Metric | Details |
|--------|---------|
| **100 MAU** | $0 (Free plan — 25K MAU) |
| **1,000 MAU** | $0 |
| **10,000 MAU** | $0 |
| **50,000 MAU** | ~$1,750/mo (Essentials B2C) or requires Enterprise |
| **B2C Essentials** | 500 MAU = $35, 1K = $70, 5K = $350, 10K = $700 |
| **B2C Professional** | 500 MAU = $240, 1K = $240, 5K = $1,000, 10K = $1,600 |
| **Email/password** | Yes |
| **OAuth** | Yes (unlimited social connections on all plans) |
| **Magic links** | Yes (passwordless) |
| **Team/org** | Yes — 5 orgs on Free, more on paid. B2B plans start at $150/mo. |
| **API keys** | M2M tokens available ($40/mo for 10K tokens) |
| **MFA** | Pro MFA on Essentials, Enterprise MFA on Professional |
| **Python SDK** | Mature, well-documented. Battle-tested. |
| **Self-hosted** | No (cloud only since Okta acquisition) |
| **Vendor lock-in** | HIGH — complex configuration, Universal Login customization, Rules/Actions/Hooks ecosystem |
| **Solo-dev complexity** | MEDIUM-HIGH — powerful but over-engineered for early-stage. Dashboard is overwhelming. |
| **Honest downsides** | Pricing escalates brutally ("growth penalty"). At 10K MAU B2C, you're paying $700/mo minimum. Configuration complexity is notorious. Okta acquisition has degraded DX. Documentation is sprawling and inconsistent. |

---

### Option 4: Supabase Auth

| Metric | Details |
|--------|---------|
| **100 MAU** | $0 (Free plan — 50K MAU for auth) |
| **1,000 MAU** | $0 |
| **10,000 MAU** | $0 |
| **50,000 MAU** | $0 on Free; Pro at $25/mo includes 100K MAU |
| **Beyond 100K (Pro)** | $0.00325/MAU overage |
| **Email/password** | Yes |
| **OAuth** | Yes |
| **Magic links** | Yes |
| **Team/org** | Basic — RLS-based. No built-in org management UI. |
| **API keys** | Not built-in |
| **MFA** | Yes |
| **Python SDK** | `supabase-py` — functional but less mature than JS SDK |
| **Self-hosted** | Yes (Docker) |
| **Vendor lock-in** | LOW-MODERATE — requires Supabase project (DB included). Auth is tightly coupled to their Postgres + RLS model. |
| **Solo-dev complexity** | LOW if you adopt Supabase as your DB. HIGH if you want auth-only. |
| **Honest downsides** | Auth is coupled to Supabase DB — you can't easily use it standalone with your own FastAPI/Postgres backend. If you're not using Supabase as your primary database, this creates an awkward dual-database architecture. RLS is powerful but adds complexity. Python SDK is second-class citizen. |

---

### Option 5: Firebase Auth

| Metric | Details |
|--------|---------|
| **100 MAU** | $0 (50K MAU free) |
| **1,000 MAU** | $0 |
| **10,000 MAU** | $0 |
| **50,000 MAU** | $0 |
| **Beyond 50K** | ~$0.0055/MAU (via Identity Platform upgrade), tiered down |
| **Email/password** | Yes |
| **OAuth** | Yes |
| **Magic links** | Yes (email link sign-in) |
| **Team/org** | No built-in org/team management |
| **API keys** | Not built-in |
| **MFA** | Yes (requires Identity Platform upgrade) |
| **Python SDK** | `firebase-admin` — mature, well-maintained by Google |
| **Self-hosted** | No |
| **Vendor lock-in** | HIGH — deep Google ecosystem coupling. User UIDs permeate your codebase. |
| **Solo-dev complexity** | LOW for basic auth. MEDIUM when you need advanced features. |
| **Honest downsides** | No org/team management at all — you'd build it yourself. Requires Identity Platform upgrade for MFA and multi-tenancy (adds cost + complexity). Vendor lock-in to Google. Phone auth SMS costs can surprise you. No RBAC built-in. |

---

### Option 6: Lucia Auth

| Metric | Details |
|--------|---------|
| **Status** | DEPRECATED / maintenance mode since 2025. Now a learning resource only. |
| **Python support** | None — TypeScript/JavaScript only |
| **Verdict** | **SKIP.** Not a viable option for a Python backend. |

---

### Option 7: Better Auth

| Metric | Details |
|--------|---------|
| **What is it** | Open-source TypeScript authentication framework (MIT license) |
| **Python support** | No native support. Community-generated Python SDK exists (beta, 0.0.1b) via OpenAPI spec. Not production-ready. |
| **Self-hosted** | Yes (it's a library, not a service) |
| **Verdict** | **SKIP.** TypeScript-first library. Python support is afterthought/community-generated. Not suitable for a FastAPI backend. |

---

### Option 8: WorkOS

| Metric | Details |
|--------|---------|
| **100 MAU** | $0 (1M MAU free with AuthKit!) |
| **1,000 MAU** | $0 |
| **10,000 MAU** | $0 |
| **50,000 MAU** | $0 |
| **Beyond 1M MAU** | $2,500/mo per additional 1M block |
| **SSO connections** | $125/connection/mo (1-15), tiered down to $50 at 200+ |
| **Email/password** | Yes |
| **OAuth** | Yes (social login included) |
| **Magic links** | Yes (magic auth) |
| **Team/org** | Yes — built for B2B. Organizations, roles, directory sync. |
| **API keys** | Not a core feature |
| **MFA** | Yes (included in AuthKit) |
| **Python SDK** | Official `workos-python` SDK. Mature, well-documented. |
| **Self-hosted** | No |
| **Vendor lock-in** | MODERATE — AuthKit provides pre-built UI. Less tightly coupled than Clerk. |
| **Solo-dev complexity** | LOW-MEDIUM — AuthKit is simpler than raw WorkOS. Enterprise SSO config is where complexity lives. |
| **Honest downsides** | Enterprise SSO per-connection pricing ($125/mo each) gets expensive fast if many customers need SAML. Primarily B2B-focused — less consumer-oriented. AuthKit UI is less polished than Clerk's. 1M free MAU seems too good to be true (and may change). |

---

### Option 9: Stytch

| Metric | Details |
|--------|---------|
| **100 MAU** | $0 (10K MAU free) |
| **1,000 MAU** | $0 |
| **10,000 MAU** | $0 |
| **50,000 MAU** | ~$400/mo (Essentials: $0.01/MAU x 40K overage) |
| **Consumer (Essentials)** | $0.01/MAU after 10K free |
| **B2B (Growth)** | $0.05/MAU after 10K free |
| **Email/password** | Yes |
| **OAuth** | Yes |
| **Magic links** | Yes — passwordless is their specialty |
| **Team/org** | Yes (B2B plan) |
| **API keys** | M2M tokens included (1K free) |
| **MFA** | Yes (all features ungated from day 1) |
| **Python SDK** | Official `stytch-python` — async + sync support. Well-maintained. |
| **Self-hosted** | No |
| **Vendor lock-in** | MODERATE |
| **Solo-dev complexity** | LOW-MEDIUM — all features available on free tier. Good DX. |
| **Honest downsides** | Smaller community than Clerk/Auth0. B2B pricing ($0.05/MAU) adds up. Documentation can be sparse in places. Less ecosystem/tutorial content available. |

---

### Option 10: Kinde

| Metric | Details |
|--------|---------|
| **100 MAU** | $0 (10,500 MAU free) |
| **1,000 MAU** | $0 |
| **10,000 MAU** | $0 |
| **50,000 MAU** | Pro: $25/mo + $0.0175 x 39,500 = ~$716/mo |
| **Email/password** | Yes |
| **OAuth** | Yes |
| **Magic links** | Yes |
| **Team/org** | Yes (organizations built-in) |
| **API keys** | Not documented |
| **MFA** | Yes |
| **Python SDK** | Official SDK exists. Setup in ~5 minutes per docs. |
| **Self-hosted** | No |
| **Vendor lock-in** | MODERATE |
| **Solo-dev complexity** | LOW — good DX, feature flags included |
| **Honest downsides** | Newer company — longevity risk. Python SDK less documented than JS. Also includes billing (0.7% transaction fee on free/pro) which you may not want. At 50K MAU, pricing rivals Auth0. |

---

### Option 11: Hanko

| Metric | Details |
|--------|---------|
| **100 MAU** | $0 (10K MAU free) |
| **1,000 MAU** | $0 |
| **10,000 MAU** | $0 |
| **50,000 MAU** | Pro: $29/mo + $0.01 x 40K = ~$429/mo |
| **Email/password** | Yes (passwords + passkeys) |
| **OAuth** | Yes (social SSO) |
| **Magic links** | Yes (passwordless) |
| **Team/org** | Limited — no built-in org management |
| **API keys** | No |
| **MFA** | Yes |
| **Python SDK** | No official Python SDK. REST API available. |
| **Self-hosted** | Yes (AGPL v3) — free forever |
| **Vendor lock-in** | LOW (open source, self-hostable) |
| **Solo-dev complexity** | MEDIUM — self-hosting requires ops work. Cloud is simpler. |
| **Honest downsides** | Passkey-first philosophy may confuse users who expect passwords. No Python SDK. Small team, smaller community. No org/team management. AGPL license may be restrictive for some use cases. |

---

### Option 12: Stack Auth

| Metric | Details |
|--------|---------|
| **What is it** | YC S24 open-source Auth0/Clerk alternative (MIT + AGPL) |
| **Python support** | No — Next.js/JavaScript only. REST API available. |
| **Self-hosted** | Yes (free) |
| **Pricing** | Open source / self-hosted free. Managed pricing not well-documented. |
| **Verdict** | **SKIP for now.** Next.js-first. No Python SDK. Very early stage. Worth watching but not production-ready for a Python backend. |

---

### Option 13: PropelAuth

| Metric | Details |
|--------|---------|
| **100 MAU** | $0 (10K MAU free) |
| **1,000 MAU** | $0 |
| **10,000 MAU** | $0 |
| **50,000 MAU** | Free: $0 + $0.05 x 40K = $2,000/mo. Growth: $150/mo + $0.05 x 40K = $2,150/mo |
| **Email/password** | Yes |
| **OAuth** | Yes |
| **Magic links** | Yes |
| **Team/org** | Yes — B2B-first. Unlimited orgs on free tier. |
| **API keys** | Yes (Growth plan — M2M/API keys) |
| **MFA** | Yes (2FA on all plans) |
| **Python SDK** | Yes — official, with decorators for Python frameworks |
| **Self-hosted** | No |
| **Vendor lock-in** | MODERATE |
| **Solo-dev complexity** | LOW — pre-built UIs, good docs |
| **Honest downsides** | $0.05/MAU is expensive at scale. Smaller company. B2B-focused may be overbuilt for consumer-first SaaS. At 50K MAU, you're paying $2K+/mo. |

---

### Option 14: Descope

| Metric | Details |
|--------|---------|
| **100 MAU** | $0 (7,500 MAU free) |
| **1,000 MAU** | $0 |
| **10,000 MAU** | Pro: $249/mo (includes 10K MAU) |
| **50,000 MAU** | Growth: $799/mo (includes 25K) + overage for remaining 25K |
| **Email/password** | Yes |
| **OAuth** | Yes |
| **Magic links** | Yes (all auth methods included) |
| **Team/org** | Yes (tenant management, 10 free tenants) |
| **API keys** | M2M exchanges available |
| **MFA** | Yes (risk-based MFA, step-up auth) |
| **Python SDK** | Yes — official SDK |
| **Self-hosted** | No |
| **Vendor lock-in** | MODERATE-HIGH |
| **Solo-dev complexity** | MEDIUM — visual flow builder is cool but adds abstraction |
| **Honest downsides** | Expensive. $249/mo just to get past free tier. Enterprise-focused pricing doesn't fit early-stage SaaS. Visual flow builder is a double-edged sword. |

---

### Authentication Pricing Comparison Table

**Monthly cost at each MAU tier (cheapest applicable plan):**

| Provider | 100 MAU | 1K MAU | 10K MAU | 50K MAU | Python SDK | Org/Team | Self-Host |
|----------|---------|--------|---------|---------|------------|----------|-----------|
| **Custom JWT** | $0 | $0 | $0 | $0 | Native | DIY | Yes |
| **Clerk** | $0 | $0 | $0 | $0 | Official | $100/mo add-on | No |
| **Auth0** | $0 | $0 | $0 | ~$1,750 | Mature | Yes | No |
| **Supabase Auth** | $0 | $0 | $0 | $0 | Yes | Basic | Yes |
| **Firebase Auth** | $0 | $0 | $0 | $0 | Mature | No | No |
| **WorkOS** | $0 | $0 | $0 | $0 | Official | Yes | No |
| **Stytch** | $0 | $0 | $0 | ~$400 | Official | Yes (B2B) | No |
| **Kinde** | $0 | $0 | $0 | ~$716 | Official | Yes | No |
| **Hanko** | $0 | $0 | $0 | ~$429 | REST only | No | Yes (AGPL) |
| **PropelAuth** | $0 | $0 | $0 | ~$2,000 | Official | Yes | No |
| **Descope** | $0 | $0 | $249 | ~$799+ | Official | Yes | No |

---

### PICK: Authentication

**Primary recommendation: Clerk**

**Reasoning:**
1. **$0 through 50K MAU** — covers your entire 2-year growth trajectory at zero cost
2. **Best DX in the category** — React components drop into your frontend, Python SDK handles the backend
3. **All core features included** on free/pro: email/password, OAuth, magic links, MFA, passkeys
4. **Future-proof for teams**: B2B add-on ($100/mo) available when you need org/team management
5. **50K MAU free tier** is the most generous among providers with good Python support

**Runner-up: WorkOS AuthKit**
- 1M MAU free is absurdly generous and covers you essentially forever
- Better B2B/org support built-in (no add-on needed)
- Why it's #2: AuthKit UI is less polished, and the 1M free tier feels like a land-and-expand play that could change. Clerk's React components provide faster time-to-ship for a solo dev.

**Why not custom JWT?** You're a solo founder with 25-30 hrs/week. Every hour spent on auth plumbing is an hour not building the deal pipeline, obligation tracker, or AI analysis that differentiates Parcel. The security liability alone disqualifies this.

**Why not Supabase Auth?** It couples you to Supabase's database. You already have a FastAPI + Postgres architecture. Adding Supabase Auth means either migrating your DB or running a dual-database setup.

**Why not Auth0?** Pricing escalates too aggressively. At 10K MAU you're already at $700/mo on Essentials. The DX has degraded since the Okta acquisition.

---

## CATEGORY 8: HOSTING / DEPLOYMENT

### Requirements Recap
- Host: FastAPI API server, background workers (Celery/similar), cron jobs
- Frontend already on Vercel
- Auto-deploy from GitHub
- Custom domains + SSL
- WebSocket/SSE support (for AI chat streaming)

---

### Option 1: Railway

| Aspect | Details |
|--------|---------|
| **Pricing model** | Usage-based (per-second billing for CPU + RAM) |
| **Startup (1 service)** | ~$5-10/mo (Hobby plan $5/mo minimum + usage) |
| **Growth (3-4 services)** | ~$20-40/mo (API + worker + cron + Redis) |
| **Scale** | Pro plan $20/mo min, scales linearly with usage |
| **Resource costs** | CPU: $0.000463/vCPU-min, RAM: $0.000231/GB-min |
| **Auto-deploy** | Yes — push to GitHub, auto-builds via Nixpacks |
| **Background workers** | Yes — separate service in same project |
| **Custom domains + SSL** | Yes (free SSL) |
| **WebSocket/SSE** | Yes |
| **Cron jobs** | Yes — native cron service (50 on Hobby, 100 on Pro) |
| **DX for solo dev** | EXCELLENT — visual project canvas, one-click databases, instant deploys. Best DX in category. |
| **Downsides** | No free tier (only $5 trial credit). No fixed pricing — usage can be unpredictable. Hobby plan has resource limits (48 vCPU, 48GB RAM total — more than enough). |

---

### Option 2: Render

| Aspect | Details |
|--------|---------|
| **Pricing model** | Fixed monthly per instance size |
| **Startup (1 service)** | $7/mo (Starter: 512MB, 0.5 CPU) or $0 (Free: spins down after inactivity) |
| **Growth (3-4 services)** | ~$28-100/mo (Starter $7 x 3-4 services + DB $7+) |
| **Scale** | Standard $25/mo per service (2GB, 1 CPU) |
| **Auto-deploy** | Yes — GitHub integration |
| **Background workers** | Yes — dedicated background worker service type (same pricing as web) |
| **Custom domains + SSL** | Yes (free SSL via Let's Encrypt) |
| **WebSocket/SSE** | Yes |
| **Cron jobs** | Yes — per-minute billing, $1/mo minimum |
| **DX for solo dev** | GOOD — straightforward, predictable pricing. Less flashy than Railway. |
| **Downsides** | Free tier services spin down after 15 min inactivity (30-sec cold starts). Starter tier is underpowered (0.5 CPU). PostgreSQL free tier expires after 30 days. Can feel sluggish on lower tiers. |

---

### Option 3: Fly.io

| Aspect | Details |
|--------|---------|
| **Pricing model** | Pay-as-you-go per resource |
| **Startup (1 service)** | ~$5-15/mo (1 shared-cpu VM + small volume) |
| **Growth (3-4 services)** | ~$30-60/mo |
| **Scale** | $50-300/mo for multi-region |
| **Auto-deploy** | Yes (via `flyctl deploy` in CI/CD) |
| **Background workers** | Yes — separate Fly Machine |
| **Custom domains + SSL** | Yes (free SSL). Dedicated IPv4: $2/mo per app. |
| **WebSocket/SSE** | Yes |
| **Cron jobs** | No native cron — use fly-cron community tool or scheduled Machines |
| **DX for solo dev** | MEDIUM — `flyctl` CLI is good but requires more config than Railway/Render. Debugging is harder. |
| **Downsides** | Removed free tier for new customers (2024). $2/mo per dedicated IPv4 adds up. Persistent volumes billed on provisioned size even when stopped. Operational overhead for a solo dev. Multi-region is its strength but unnecessary for US-only SaaS. |

---

### Option 4: DigitalOcean App Platform

| Aspect | Details |
|--------|---------|
| **Pricing model** | Fixed monthly per component |
| **Startup (1 service)** | ~$5-12/mo (Basic tier) |
| **Growth (3-4 services)** | ~$25-60/mo |
| **Scale** | $12-50/mo per component |
| **Auto-deploy** | Yes — GitHub integration |
| **Background workers** | Yes — worker component type |
| **Custom domains + SSL** | Yes (free managed SSL) |
| **WebSocket/SSE** | Yes |
| **Cron jobs** | Yes — job component type |
| **DX for solo dev** | GOOD — straightforward. DO has excellent documentation. |
| **Downsides** | Less modern DX than Railway. App Platform is a managed layer on top of DO infrastructure — occasional quirks. Smaller community of App Platform users (most DO users use Droplets directly). Build times can be slow. |

---

### Option 5: AWS (ECS Fargate / Lambda / EC2)

| Aspect | Details |
|--------|---------|
| **Pricing model** | Pay-per-second (Fargate), per-invocation (Lambda), hourly (EC2) |
| **Startup (1 Fargate task)** | ~$15-30/mo (0.25 vCPU, 0.5GB) + ALB ($16/mo) + NAT Gateway ($32/mo) |
| **Growth (3-4 services)** | ~$80-200/mo (including ALB, NAT, CloudWatch) |
| **Scale** | Scales infinitely but costs scale with complexity |
| **Auto-deploy** | Yes (via CodePipeline, or GitHub Actions + ECR) — complex setup |
| **Background workers** | Yes — ECS tasks, SQS + Lambda, Step Functions |
| **Custom domains + SSL** | Yes (Route53 + ACM — free SSL) |
| **WebSocket/SSE** | Yes (ALB supports WebSocket, API Gateway for Lambda) |
| **Cron jobs** | Yes (EventBridge + Lambda/ECS) |
| **DX for solo dev** | POOR — overwhelming for a solo developer. 200+ services, each with its own pricing page. Hidden costs (NAT Gateway, CloudWatch, data transfer) routinely surprise. |
| **Downsides** | Actual costs 30-50% higher than compute alone due to ALB, NAT, logging, etc. Massive operational overhead. Overkill for <10K users. The "enterprise premium" for a solo dev is real time and money. |

---

### Option 6: Google Cloud Run

| Aspect | Details |
|--------|---------|
| **Pricing model** | Per-second billing for CPU + RAM while handling requests |
| **Startup (1 service)** | ~$0-10/mo (generous free tier: 2M requests, 360K vCPU-seconds, 180K GiB-seconds free) |
| **Growth (3-4 services)** | ~$10-40/mo |
| **Scale** | Scales to zero, scales up automatically |
| **Auto-deploy** | Yes (Cloud Build + GitHub trigger) |
| **Background workers** | PARTIAL — Cloud Run Jobs for batch work. Not ideal for long-running workers. Use Cloud Tasks or Pub/Sub for queuing. |
| **Custom domains + SSL** | Yes (free managed SSL) |
| **WebSocket/SSE** | Yes (HTTP/2 streaming supported, configurable timeout up to 60 min) |
| **Cron jobs** | Yes (Cloud Scheduler triggers Cloud Run) |
| **DX for solo dev** | MEDIUM — simpler than raw AWS but still GCP complexity. Cold starts are real (mitigated with min instances at ~$10-12/mo). |
| **Downsides** | Cold starts add 1-5 seconds latency without min instances. Background workers require separate GCP services (Cloud Tasks, Pub/Sub). Not a simple "push and forget" — requires GCP console familiarity. Vendor lock-in to Google. |

---

### Option 7: Coolify (Self-Hosted PaaS)

| Aspect | Details |
|--------|---------|
| **Pricing model** | Free (self-hosted) or $5/mo per server (Coolify Cloud) |
| **Startup** | VPS cost only (~$4-8/mo on Hetzner) + $0 for Coolify |
| **Growth** | Same VPS + potentially second server (~$8-16/mo total) |
| **Scale** | Add servers as needed |
| **Auto-deploy** | Yes — GitHub/GitLab integration |
| **Background workers** | Yes — deploy any Docker container |
| **Custom domains + SSL** | Yes (Let's Encrypt auto-provisioning) |
| **WebSocket/SSE** | Yes |
| **Cron jobs** | Yes (via container scheduling) |
| **DX for solo dev** | MEDIUM — Heroku-like UI but YOU are the ops team. Server maintenance, updates, backups, monitoring are all on you. |
| **Downsides** | You're responsible for the server. Security patches, uptime, backups. If your server goes down at 3am, that's your problem. Initial setup takes 1-2 hours. Not as polished as Railway/Render. |

---

### Option 8: Kamal (37signals)

| Aspect | Details |
|--------|---------|
| **Pricing model** | Free (open source, MIT). You pay for the VPS only. |
| **Startup** | VPS cost only (~$4-8/mo on Hetzner/DO) |
| **Growth** | Same VPS (~$8-20/mo) |
| **Auto-deploy** | Yes (via `kamal deploy` in CI/CD) |
| **Background workers** | Yes — accessory containers |
| **Custom domains + SSL** | Yes (Traefik reverse proxy with Let's Encrypt) |
| **WebSocket/SSE** | Yes |
| **Cron jobs** | Yes (via accessory containers) |
| **DX for solo dev** | MEDIUM-LOW — designed for Rails, requires Docker knowledge. Config is YAML-based. Less intuitive for Python devs. No web dashboard. |
| **Downsides** | Ruby-centric community. All config is YAML + CLI — no dashboard. You manage the server. Less community support for Python deployments. Version 2 improved things but still requires ops knowledge. |

---

### Option 9: Hetzner + Dokku

| Aspect | Details |
|--------|---------|
| **Pricing model** | VPS cost only (Dokku is free, open source) |
| **Startup** | ~$4-8/mo (Hetzner CX22: 2 vCPU, 4GB RAM, 40GB disk) |
| **Growth** | ~$8-16/mo (larger VPS or second server) |
| **Scale** | Vertical scaling on single server; horizontal requires manual setup |
| **Auto-deploy** | Yes — `git push dokku main` (Heroku-style) |
| **Background workers** | Yes — Dokku supports Procfile-based worker processes |
| **Custom domains + SSL** | Yes (Let's Encrypt plugin) |
| **WebSocket/SSE** | Yes |
| **Cron jobs** | Yes (via cron plugin or system cron) |
| **DX for solo dev** | MEDIUM — Heroku-like git-push workflow is great. But you manage the VPS. |
| **Downsides** | Hetzner is EU-based (Germany/Finland) — latency to US users (~100-150ms). You're the sysadmin. No dashboard (CLI only). Backup/monitoring is DIY. Hetzner raised prices April 2026 (CX22 still ~$4-8/mo). Single point of failure on one server. |

---

### Option 10: Koyeb

| Aspect | Details |
|--------|---------|
| **Pricing model** | Per-second billing + plan fee |
| **Startup** | ~$0-5/mo (Starter plan: free web service + free Postgres) |
| **Growth** | Pro $29/mo + compute (~$10-20/mo for 3-4 services) |
| **Scale** | Scale plan $299/mo (99.9% SLA) |
| **Auto-deploy** | Yes — GitHub auto-build and deploy |
| **Background workers** | Yes — worker service type |
| **Custom domains + SSL** | Yes (free SSL) |
| **WebSocket/SSE** | Yes |
| **Cron jobs** | Limited — no native cron. Use external scheduler. |
| **DX for solo dev** | GOOD — clean UI, auto-scaling, scale-to-zero |
| **Downsides** | Acquired by Mistral AI (Feb 2026) — future direction uncertain, likely pivoting to AI workloads. Smaller community. Free tier is minimal. Cron jobs not natively supported. |

---

### Hosting Pricing Comparison Table

**Monthly cost at different scales (API + worker + DB):**

| Provider | Startup (1 svc) | Growth (3-4 svc) | Auto-deploy | Workers | Cron | Solo DX |
|----------|-----------------|-------------------|-------------|---------|------|---------|
| **Railway** | $5-10 | $20-40 | Yes | Yes | Yes | Excellent |
| **Render** | $0-7 | $28-100 | Yes | Yes | Yes | Good |
| **Fly.io** | $5-15 | $30-60 | CI/CD | Yes | No* | Medium |
| **DO App Platform** | $5-12 | $25-60 | Yes | Yes | Yes | Good |
| **AWS Fargate** | $60-100+ | $150-300+ | Complex | Yes | Yes | Poor |
| **Cloud Run** | $0-10 | $10-40 | Yes | Partial | Yes | Medium |
| **Coolify** | $4-8 | $8-16 | Yes | Yes | Yes | Medium |
| **Kamal** | $4-8 | $8-20 | CI/CD | Yes | Yes | Medium-Low |
| **Hetzner+Dokku** | $4-8 | $8-16 | Yes | Yes | Yes | Medium |
| **Koyeb** | $0-5 | $30-50 | Yes | Yes | No* | Good |

---

### PICK: Hosting / Deployment

**Primary recommendation: Railway**

**Reasoning:**
1. **Best DX for a solo developer** — visual project canvas shows your entire architecture (API, worker, Redis, Postgres). Push to GitHub and it auto-deploys.
2. **Usage-based pricing** — you pay for what you use. A lightly-used startup app costs $5-10/mo. No paying for idle resources.
3. **Native support for everything you need**: web services, background workers, cron jobs, databases, Redis — all in one project.
4. **WebSocket/SSE support** — critical for your AI chat streaming.
5. **Nixpacks auto-detection** — push Python code, it figures out the build. No Dockerfile needed (though supported).
6. **Growth path is smooth** — Pro plan ($20/mo) handles serious production workloads. No migration needed.

**Runner-up: Render**
- More predictable fixed pricing (no usage surprises)
- Free tier useful for staging/preview environments
- Background worker support is solid
- Why it's #2: Starter tier is underpowered (0.5 CPU). Free tier cold starts hurt UX. Railway's DX edge is significant for a solo dev.

**Budget alternative: Hetzner + Dokku**
- If budget is paramount, a $7/mo Hetzner VPS running Dokku gives you everything Railway does at 1/3 the cost
- Trade-off: you're the sysadmin, EU-based servers add latency to US users
- Good for: a future cost-optimization move when you understand your resource needs

**Why not AWS?** Overkill. The ALB + NAT Gateway alone cost more than your entire Railway bill. You'd spend more time configuring IAM policies than building features.

**Why not Cloud Run?** Cold starts are a real problem for an API that needs sub-second response times. Min instances fix this but add cost and complexity. Background workers require separate GCP services. Railway is simpler.

**Why not Fly.io?** Over-engineered for US-only SaaS. Multi-region is its strength, and you don't need it. No native cron. More config than Railway. Removed free tier.

---

## CATEGORY 9: REAL-TIME

### Does Parcel NEED Real-Time?

**Honest answer: Not yet. And maybe not for a long time.**

Let me evaluate each potential use case:

| Use Case | Real-Time Needed? | When? | Why / Why Not |
|----------|-------------------|-------|---------------|
| **Pipeline board: deal card moves** | Only with teams | Wave 9+ (teams layer) | Solo users don't need to see their own actions reflected — they just did them. Real-time only matters when User A needs to see User B's changes. |
| **Obligation alerts** | No — push notifications | Wave 7+ | This is a notification problem, not a real-time problem. Use email, SMS, or mobile push. A daily digest or webhook suffices. |
| **Today view: new tasks** | No | N/A | Tasks are created by the user or by cron jobs. Either way, a page refresh or polling handles this. |
| **AI chat streaming** | Yes — already solved | Now | You're already using SSE for this. It works. Don't change it. |

**Bottom line:** SSE (which you already have) covers the only real-time need you have today (AI streaming). Everything else is either a notification problem or a team-collaboration problem that doesn't exist until you have teams.

### At What Team Size Does Real-Time Matter?

Real-time pipeline updates matter when:
- 2+ people are looking at the same pipeline board simultaneously
- Changes by one person need to be visible to others within seconds (not minutes)
- Conflict resolution matters (two people editing the same deal)

For Parcel's user base (real estate investors), most accounts will be solo users or very small teams (2-3 people). The odds of two team members staring at the same pipeline board simultaneously are low. **Polling every 30-60 seconds would be indistinguishable from real-time for this use case.**

**Recommendation: Defer real-time until Wave 9 (teams layer). When you get there, evaluate based on actual team usage patterns.**

---

### Real-Time Options (For Future Reference)

If/when you need real-time (Wave 9+), here are your options ranked:

#### Option 1: SSE (Server-Sent Events) — ALREADY IN USE

| Aspect | Details |
|--------|---------|
| **Cost** | $0 (built into HTTP) |
| **Setup** | Already done for AI chat |
| **Capabilities** | Server-to-client only (one-way). Text-based. Auto-reconnect built into browser. |
| **Limitations** | One-way only (client can't push to server via SSE). Limited to ~6 concurrent connections per domain in HTTP/1.1 (not an issue with HTTP/2). No binary data. |
| **When sufficient** | Notifications, live feeds, AI streaming, dashboard updates — anything where server pushes to client. |
| **Python/FastAPI** | Native support via `StreamingResponse`. |

#### Option 2: Long Polling

| Aspect | Details |
|--------|---------|
| **Cost** | $0 |
| **Complexity** | Very low — regular HTTP requests on a timer |
| **When sufficient** | Dashboard refreshes, "check for updates" patterns, low-frequency updates |
| **Downsides** | Higher latency (30-60 second delay). More server load than SSE/WebSocket. Not truly "real-time." |

#### Option 3: Pusher

| Aspect | Details |
|--------|---------|
| **Sandbox (free)** | 100 connections, 200K messages/day |
| **Startup** | $49/mo — 500 connections, 1M messages/day |
| **Pro** | $99/mo — 2K connections, 4M messages/day |
| **Business** | $299/mo — 5K connections, 10M messages/day |
| **Python SDK** | Official `pusher` package |
| **Ease of use** | HIGH — drop-in client + server libraries |
| **Downsides** | Gets expensive at scale. Message counting model is confusing (1 publish to 50 subscribers = 51 messages). Vendor lock-in. |

#### Option 4: Ably

| Aspect | Details |
|--------|---------|
| **Free tier** | Experimental use |
| **Per-minute pricing** | Messages: $2.50/M consumed. Connections: $1.00/M minutes. |
| **MAU pricing** | $0.05/MAU (down to $0.01 at volume) |
| **Python SDK** | Official `ably` package |
| **Downsides** | Complex pricing model. Overkill for simple use cases. |

#### Option 5: Supabase Realtime

| Aspect | Details |
|--------|---------|
| **Pricing** | $2.50/M messages, $10/1K peak connections (on top of Supabase plan) |
| **Requires Supabase?** | Yes — tightly integrated with Supabase Postgres. Listens to DB changes via Postgres logical replication. |
| **Downsides** | Requires Supabase as your database. Not standalone. |

#### Option 6: Socket.io (Self-Hosted)

| Aspect | Details |
|--------|---------|
| **Cost** | $0 (open source) |
| **Python** | `python-socketio` — works with FastAPI via ASGI |
| **Complexity** | MEDIUM — WebSocket connection management, rooms, namespaces. Scaling requires Redis adapter for multi-process. |
| **Downsides** | You manage the infrastructure. Scaling across multiple server instances requires Redis pub/sub. Debugging WebSocket issues is harder than HTTP. |

#### Option 7: Liveblocks

| Aspect | Details |
|--------|---------|
| **Free tier** | 500 monthly active rooms |
| **Pro** | $29/mo + overage |
| **Focus** | Collaborative editing (Figma-like multiplayer, comments, notifications) |
| **Downsides** | Wrong tool for Parcel. Designed for document/design collaboration, not SaaS dashboard updates. |

#### Option 8: PartyKit (Cloudflare)

| Aspect | Details |
|--------|---------|
| **Pricing** | Usage-based on Cloudflare Workers pricing. Free tier available. |
| **Focus** | Stateful serverless — each "party" is a Durable Object |
| **Downsides** | JavaScript/TypeScript only. No Python support. Acquired by Cloudflare — direction may shift. |

---

### PICK: Real-Time

**Now: Keep SSE (already working for AI chat). Add 30-second polling for dashboard/Today view if needed.**

**Wave 9 (teams): Self-hosted Socket.io via `python-socketio`**

**Reasoning:**
1. SSE handles your only current real-time need (AI streaming). It's free, built-in, and already working.
2. Polling every 30-60 seconds is sufficient for solo-user dashboard updates and costs $0.
3. When teams arrive (Wave 9), `python-socketio` integrates natively with FastAPI, costs $0, and gives you full bidirectional communication.
4. If Socket.io scaling becomes a concern (unlikely before 10K+ concurrent users), you can add Pusher as a drop-in managed replacement.
5. Liveblocks and PartyKit are wrong tools for this use case. Supabase Realtime requires their DB. Ably is overpriced for simple use cases.

**Don't pre-optimize for real-time.** Build the product. If/when two team members complain that they can't see each other's pipeline changes, that's when you invest in real-time infrastructure — and you'll know exactly what to build because you'll have real user feedback.

---

## SUMMARY OF PICKS

| Category | Pick | Monthly Cost (Year 1) | Monthly Cost (Year 2 / 10K users) |
|----------|------|----------------------|-----------------------------------|
| **Authentication** | Clerk (Hobby/Pro) | $0 | $0 (under 50K MAU) |
| **Hosting** | Railway (Hobby → Pro) | $5-15 | $20-40 |
| **Real-Time** | SSE (existing) + polling | $0 | $0 |

**Total incremental infrastructure cost: $5-15/mo at launch, $20-40/mo at 10K users.**

This keeps your burn rate minimal while giving you production-grade auth, deployment, and (eventual) real-time — all without premature complexity or vendor lock-in traps.
