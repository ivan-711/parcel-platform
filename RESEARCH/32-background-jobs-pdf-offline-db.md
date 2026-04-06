# Research Report: Background Jobs, PDF Generation, Offline Mobile Database

**Date:** 2026-04-02  
**Categories:** 5 (Background Jobs), 10 (PDF Generation), 11 (Offline Mobile DB)  
**Context:** Solo founder, Python/FastAPI backend, React frontend, Capacitor iOS app, US-only, 150-10K users over 2 years

---

## CATEGORY 5: BACKGROUND JOBS / TASK QUEUE

### Parcel's Three Job Types

| Type | Examples | Volume | Latency Tolerance |
|------|----------|--------|-------------------|
| **Scheduled/Recurring** | Morning briefings, obligation alerts (balloon dates, insurance), weekly portfolio summaries | ~5-20 jobs/day | Minutes |
| **Event-Triggered** | Property enrichment (RentCast/Bricked), document AI processing, PDF generation, webhook processing | ~50-500/day at scale | Seconds to minutes |
| **Batch Processing** | Skip trace batches (100-500), mail campaigns (Lob API), bulk CSV import | Occasional, 100-5000 items | Minutes to hours |

---

### Tool-by-Tool Evaluation

#### 1. Celery + Redis

| Attribute | Assessment |
|-----------|------------|
| **Python Support** | Excellent. The Python standard for task queues. Sync-only workers (no native async) |
| **Scheduling** | celery-beat for cron-like recurring jobs. Mature and battle-tested |
| **Retry Logic** | Full exponential backoff, max retries, custom retry policies |
| **Monitoring** | Flower web dashboard (real-time), Prometheus integration |
| **Pricing** | Open source. Redis hosting ~$0-15/mo (Railway/Render addon) |
| **Broker** | Redis or RabbitMQ |
| **Solo-Dev Complexity** | **HIGH**. 3-4 separate processes (web, worker, beat, flower). Docker Compose recommended. Config-heavy |
| **All 3 Job Types?** | Yes. Handles all three well |
| **Verdict** | Overkill for a solo dev at 150-user scale. The "enterprise Python" choice. Railway has a one-click deploy template (FastAPI + Celery + Beat + Worker + Flower) which reduces setup pain |

#### 2. ARQ (Async Redis Queue)

| Attribute | Assessment |
|-----------|------------|
| **Python Support** | Native asyncio. Perfect for FastAPI's async paradigm |
| **Scheduling** | Cron-like syntax via `cron()` function. Defer by duration or until datetime |
| **Retry Logic** | Built-in retries with configurable attempts. Pessimistic execution (stuck jobs auto-requeued) |
| **Monitoring** | No built-in dashboard. Logging only |
| **Pricing** | Open source. Needs Redis |
| **Broker** | Redis only |
| **Solo-Dev Complexity** | **LOW-MEDIUM**. 1 worker process + Redis. Simple setup |
| **All 3 Job Types?** | Yes, but batch processing is DIY |
| **Verdict** | **MAINTENANCE-ONLY MODE as of 2025.** v0.27 is likely the last release. Not recommended for new projects |

#### 3. Dramatiq

| Attribute | Assessment |
|-----------|------------|
| **Python Support** | Good. Sync workers with threading. No native async support |
| **Scheduling** | Via `periodiq` extension (cron-like). Not built-in |
| **Retry Logic** | Automatic exponential backoff. Per-actor retry config. Excellent |
| **Monitoring** | `dramatiq_dashboard` (alpha quality). Prometheus/Grafana integration |
| **Pricing** | Open source. Redis or RabbitMQ |
| **Broker** | Redis or RabbitMQ |
| **Solo-Dev Complexity** | **MEDIUM**. Simpler than Celery, more capable than RQ. Good middleware system |
| **All 3 Job Types?** | Yes with periodiq addon |
| **Verdict** | Strong Celery alternative with cleaner API. Dashboard is immature. Good middle ground |

#### 4. Huey

| Attribute | Assessment |
|-----------|------------|
| **Python Support** | Good. Multi-process, multi-thread, or greenlet models. No native async |
| **Scheduling** | Built-in crontab decorator. Delay and scheduled execution |
| **Retry Logic** | Built-in automatic retry with configurable attempts |
| **Monitoring** | No dashboard. Logging + signals |
| **Pricing** | Open source. Redis, SQLite, or in-memory backend |
| **Broker** | Redis, **SQLite**, or in-memory (huge advantage - no Redis required!) |
| **Solo-Dev Complexity** | **LOW**. Single worker process. SQLite backend = zero external dependencies |
| **All 3 Job Types?** | Yes. Scheduling, task execution, pipelines/chains |
| **Verdict** | **Excellent for solo devs.** SQLite backend means no Redis needed initially. Lightweight but full-featured. Task prioritization, locking, pipelines, result storage all built-in |

#### 5. RQ (Redis Queue)

| Attribute | Assessment |
|-----------|------------|
| **Python Support** | Good. Sync only. Simple API |
| **Scheduling** | Built-in since v2.5 (cron syntax). Previously needed rq-scheduler |
| **Retry Logic** | Configurable retries with intervals |
| **Monitoring** | rq-dashboard (web UI). Basic but functional |
| **Pricing** | Open source. Needs Redis |
| **Broker** | Redis only |
| **Solo-Dev Complexity** | **LOW**. Very simple API. 1 worker + scheduler process |
| **All 3 Job Types?** | Yes, but no workflow features (chains, groups) |
| **Verdict** | Simple and reliable. Good for straightforward jobs. Lacks workflow orchestration features |

#### 6. Taskiq

| Attribute | Assessment |
|-----------|------------|
| **Python Support** | **Native async AND sync**. Built for FastAPI. Type-hinted throughout |
| **Scheduling** | Via taskiq-crontab. Cron expressions supported |
| **Retry Logic** | Built-in with configurable policies |
| **Monitoring** | No built-in dashboard (as of 2026) |
| **Pricing** | Open source |
| **Broker** | Redis, RabbitMQ, NATS, Kafka, and more via plugins |
| **Solo-Dev Complexity** | **LOW-MEDIUM**. FastAPI-native integration. Hot reload for workers |
| **All 3 Job Types?** | Yes |
| **Verdict** | **The modern async-native choice for FastAPI.** Inspired by Celery/Dramatiq but built for asyncio. Actively developed (Jan 2026 updates). FastAPI dependency injection reuse is killer for solo devs. Relatively young ecosystem |

#### 7. FastAPI BackgroundTasks (Built-in)

| Attribute | Assessment |
|-----------|------------|
| **Python Support** | Native. Part of FastAPI |
| **Scheduling** | **None** |
| **Retry Logic** | **None** |
| **Monitoring** | **None**. Can't check task status |
| **Pricing** | Free (built-in) |
| **Broker** | None needed |
| **Solo-Dev Complexity** | **ZERO**. Already available |
| **All 3 Job Types?** | No. Event-triggered only, and only lightweight ones |
| **Verdict** | Fine for fire-and-forget tasks (send email, log event). **Not suitable** for Parcel's needs: no retry = lost jobs, no scheduling = no morning briefings, in-process = PDF generation blocks API |

#### 8. Trigger.dev

| Attribute | Assessment |
|-----------|------------|
| **Python Support** | Indirect. TypeScript-first, but has a Python build extension for running Python scripts within tasks |
| **Scheduling** | Built-in cron scheduling (up to 10 free, 1000 on Pro) |
| **Retry Logic** | Built-in with configurable policies |
| **Monitoring** | Excellent web dashboard included |
| **Pricing** | Free: $5 credits/mo, 20 concurrent runs. Hobby: $10/mo. Pro: $50/mo. Compute ~$0.000034/sec |
| **Broker** | Managed (no self-hosting needed) |
| **Solo-Dev Complexity** | **LOW for TypeScript**, **MEDIUM-HIGH for Python** (not first-class) |
| **All 3 Job Types?** | Yes |
| **Verdict** | Great managed service but **TypeScript-first**. Python support is a wrapper, not native. Wrong fit for a Python/FastAPI stack |

#### 9. Inngest

| Attribute | Assessment |
|-----------|------------|
| **Python Support** | **Official Python SDK**. Event-driven durable functions. FastAPI integration |
| **Scheduling** | Built-in cron scheduling |
| **Retry Logic** | Built-in step functions with automatic retry |
| **Monitoring** | Excellent web dashboard. Traces, logs, alerting |
| **Pricing** | Free: 50K executions/mo, 5 concurrent steps. Pro: $75/mo (1M executions). Pay-per-use beyond |
| **Broker** | Managed (no infra to run) |
| **Solo-Dev Complexity** | **LOW**. No queue infrastructure. Declarative function definitions |
| **All 3 Job Types?** | Yes. Cron functions, event-triggered, batch via fan-out |
| **Verdict** | **Strong managed option with real Python SDK.** Zero infra management. Step functions provide built-in retry/durability. Cost scales with usage. Vendor lock-in risk. At 50K free executions/mo, could be free for a long time |

#### 10. Temporal

| Attribute | Assessment |
|-----------|------------|
| **Python Support** | Official Python SDK. Type-safe. Async support |
| **Scheduling** | Full workflow scheduling and timers |
| **Retry Logic** | Comprehensive. Activity-level retries with full configurability |
| **Monitoring** | Temporal UI (web dashboard). Excellent visibility |
| **Pricing** | Cloud: starts $100/mo (Essentials). $50/million actions. Self-hosted: free but complex. $1K startup credits available |
| **Broker** | Self-contained (gRPC-based) |
| **Solo-Dev Complexity** | **HIGH**. Steep learning curve. Workflow-as-code paradigm. Self-hosted requires Cassandra/MySQL + Elasticsearch |
| **All 3 Job Types?** | Yes. Excellent at all three, especially complex workflows |
| **Verdict** | **Massive overkill for Parcel's scale.** Designed for 100+ engineer teams. Learning curve is weeks, not hours. Cloud pricing can balloon unexpectedly (10-50x estimates reported). Skip |

#### 11. Hatchet

| Attribute | Assessment |
|-----------|------------|
| **Python Support** | Official Python SDK (hatchet-sdk). Actively maintained |
| **Scheduling** | Cron scheduling support |
| **Retry Logic** | Built-in with configurable policies |
| **Monitoring** | Web dashboard included |
| **Pricing** | Free: 100K runs. Developer: $10/1M runs. Team: $500/mo. Scale: $1K/mo |
| **Broker** | Managed cloud or self-hosted |
| **Solo-Dev Complexity** | **MEDIUM**. Newer platform, less community content |
| **All 3 Job Types?** | Yes. Concurrency, fairness, rate limiting built-in |
| **Verdict** | Promising newer entrant. Good Python SDK. But smaller community and less battle-tested than alternatives. Free tier generous (100K runs) |

#### 12. Railway Cron Jobs

| Attribute | Assessment |
|-----------|------------|
| **Python Support** | Language-agnostic (runs any container) |
| **Scheduling** | Crontab expressions. Service starts, runs, terminates |
| **Retry Logic** | None built-in. Must implement in your code |
| **Monitoring** | Railway logs only |
| **Pricing** | Part of Railway compute pricing (~$5-20/mo depending on usage) |
| **Broker** | None (standalone service) |
| **Solo-Dev Complexity** | **LOW** for simple cron. No background worker support |
| **All 3 Job Types?** | Scheduled only. Not suitable for event-triggered or batch |
| **Verdict** | Good supplement for simple scheduled jobs (daily briefings). **Cannot replace a task queue** for event-triggered work |

#### 13. Cloud Provider Cron (Render, GCP Cloud Scheduler)

| Attribute | Assessment |
|-----------|------------|
| **Render Cron** | Background workers from $7/mo. Cron jobs as first-class services |
| **GCP Cloud Scheduler** | $0.10/job/month. 3 free jobs. Triggers HTTP endpoints or Pub/Sub |
| **Solo-Dev Complexity** | Low for simple scheduling. Cannot handle task queue needs |
| **Verdict** | Useful for triggering scheduled HTTP endpoints. Not a task queue replacement |

---

### Background Jobs Comparison Matrix

| Tool | Async Native | Scheduling | Retry | Dashboard | No Redis Needed | Solo-Dev Score | Monthly Cost |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Celery** | No | Yes | Excellent | Flower | No | 4/10 | $0 + Redis |
| **ARQ** | Yes | Yes | Good | No | No | 6/10 | $0 + Redis |
| **Dramatiq** | No | Via addon | Excellent | Alpha | No | 6/10 | $0 + Redis |
| **Huey** | No | Yes | Good | No | **Yes (SQLite)** | **8/10** | **$0** |
| **RQ** | No | Yes (v2.5+) | Good | Yes | No | 7/10 | $0 + Redis |
| **Taskiq** | **Yes** | Via plugin | Good | No | Via NATS/other | **8/10** | $0 + broker |
| **FastAPI BG** | Yes | No | No | No | Yes | 10/10 | $0 |
| **Trigger.dev** | No (TS-first) | Yes | Yes | Excellent | Yes | 5/10 | $0-50/mo |
| **Inngest** | Yes (Python SDK) | Yes | Yes | Excellent | Yes | **9/10** | **$0-75/mo** |
| **Temporal** | Yes | Yes | Excellent | Excellent | Yes | 2/10 | $100+/mo |
| **Hatchet** | Yes | Yes | Yes | Yes | Yes | 6/10 | $0-500/mo |

---

### PICK: Background Jobs

**Recommended approach: Tiered strategy**

#### Phase 1 (Launch - 500 users): **Huey + SQLite backend**
- Zero external dependencies (no Redis server needed)
- Built-in cron scheduling for morning briefings, obligation alerts
- Retry logic for API calls (RentCast, Bricked, Lob)
- Task pipelines for multi-step workflows (upload -> extract -> summarize)
- Single worker process alongside FastAPI
- **Total cost: $0**
- Setup time: ~2-4 hours

#### Phase 2 (If you need managed infra): **Inngest**
- Switch to Inngest when you want zero-ops and better observability
- Official Python SDK with FastAPI integration
- Step functions give you durable execution for free
- 50K free executions/mo covers early growth
- Excellent dashboard for debugging failed jobs
- **Total cost: $0-75/mo**

#### Phase 3 (Only if hitting scale limits): **Taskiq + Redis**
- If you need full control + async-native + FastAPI dependency injection
- Or **Celery + Redis** if you need the massive ecosystem

**Why Huey wins for Phase 1:**
- The SQLite backend eliminates the #1 setup tax for solo devs (running Redis)
- Full scheduling, retry, task chains, prioritization built-in
- When you outgrow SQLite backend, swap to Redis backend with one line change
- Created by Charles Leifer (author of Peewee ORM) -- well-maintained, pragmatic design
- Handles all three job types with zero infrastructure beyond your existing server

---

## CATEGORY 10: PDF GENERATION

### Parcel's PDF Requirements

- Custom fonts (Satoshi)
- Logos (user brand kit)
- Charts/graphs (portfolio performance, deal metrics)
- Multi-page layouts (10-20 page investment reports)
- Tables with proper formatting
- Print-quality output (lenders print these)
- Server-side generation (Python backend)

---

### Tool-by-Tool Evaluation

#### 1. WeasyPrint

| Attribute | Assessment |
|-----------|------------|
| **Server/Client** | Server-side (pure Python) |
| **Custom Fonts** | Yes. @font-face CSS rules, TrueType/OpenType. Can load .ttf files |
| **Charts** | **No JavaScript execution.** Must pre-render charts as SVG and embed. CairoSVG renders SVGs as vectors |
| **Multi-Page** | Yes. CSS paged media, page breaks, headers/footers |
| **Print Quality** | Good. Vector output. Small file sizes (8-21KB typical) |
| **Performance** | ~225ms simple, ~380ms complex. No warm mode. Each render is a separate process |
| **Python Integration** | Native Python. `pip install weasyprint`. One function call |
| **Pricing** | Open source (BSD license) |
| **Solo-Dev Effort** | **LOW**. HTML + CSS = PDF. Use your existing web templates |
| **Verdict** | **Best pure-Python option.** The chart limitation is solvable: generate SVG charts server-side with matplotlib/plotly then embed. Custom fonts work. CSS Flexbox and Grid supported. Small output files |

#### 2. Playwright (Headless Chromium)

| Attribute | Assessment |
|-----------|------------|
| **Server/Client** | Server-side (headless browser) |
| **Custom Fonts** | Yes. Full browser font rendering including @font-face |
| **Charts** | **Yes. Full JavaScript execution.** Chart.js, Plotly, any JS library works |
| **Multi-Page** | Yes. CSS @page rules, page-break-before/after |
| **Print Quality** | Excellent. Chromium's print engine. Pixel-perfect |
| **Performance** | Cold: ~680ms. **Warm: 3-13ms** (reuse browser instance). Exceptional |
| **Python Integration** | `playwright` Python package (async). `pip install playwright && playwright install chromium` |
| **Pricing** | Open source. ~200MB Chromium binary to deploy |
| **Solo-Dev Effort** | **MEDIUM**. Need to manage Chromium binary in deployment. ~200MB container size increase |
| **Verdict** | **Best quality option.** Full browser rendering means perfect fidelity. Charts render natively. The 200MB binary is the main drawback. Warm mode makes it blazing fast in production |

#### 3. Puppeteer

| Attribute | Assessment |
|-----------|------------|
| **Server/Client** | Server-side (Node.js, headless Chromium) |
| **Python Integration** | **No native Python.** Would need pyppeteer (unmaintained) or subprocess to Node |
| **Verdict** | **Skip.** Playwright does everything Puppeteer does, with an official Python SDK. Puppeteer is Node.js only |

#### 4. wkhtmltopdf

| Attribute | Assessment |
|-----------|------------|
| **Status** | **ABANDONED.** Archived January 2023. Last release June 2020 |
| **Security** | No patches for vulnerabilities. Known security risks |
| **CSS Support** | Limited. No CSS3 grid, no flexbox, no modern features |
| **Verdict** | **Do not use.** Officially abandonware. Security liability |

#### 5. Prince XML

| Attribute | Assessment |
|-----------|------------|
| **Quality** | **Best-in-class** PDF output. The gold standard for CSS-to-PDF |
| **Custom Fonts** | Full support including OpenType features |
| **Charts** | SVG rendering. No JavaScript |
| **Pricing** | Server license: **$3,800 one-time** or **$2,500/year** subscription |
| **Python Integration** | Subprocess call to binary |
| **Verdict** | **Too expensive for a startup.** The quality is unmatched, but $3,800 for PDF generation when free alternatives are 90% as good is not justified at this stage |

#### 6. Typst

| Attribute | Assessment |
|-----------|------------|
| **Server/Client** | Server-side. CLI or Rust library. Python binding via `typst-py` |
| **Custom Fonts** | Yes. Load custom font files |
| **Charts** | Limited. Typst has its own scripting, not HTML/CSS |
| **Performance** | **Milliseconds.** Orders of magnitude faster than browser-based |
| **Python Integration** | `typst-py` Python binding. Compile .typ files to PDF |
| **Pricing** | Open source |
| **Solo-Dev Effort** | **HIGH**. Must learn Typst markup language (not HTML/CSS). Different paradigm |
| **Verdict** | Blazing fast and high quality, but requires learning a new markup language. Not worth the investment when you already have HTML/CSS templates. Better for LaTeX-replacement use cases |

#### 7. react-pdf (@react-pdf/renderer)

| Attribute | Assessment |
|-----------|------------|
| **Server/Client** | Both. Node.js server-side rendering |
| **Custom Fonts** | Yes. Register fonts via API |
| **Charts** | Via SVG components. No Chart.js/Plotly direct support |
| **Python Integration** | **None.** Node.js/React only. Would need a separate Node service |
| **Pricing** | Open source |
| **Solo-Dev Effort** | **HIGH for Python stack.** Requires running a Node.js service |
| **Verdict** | Great library, wrong stack. You'd need to maintain a separate Node.js PDF microservice. Skip unless you're already running Node |

#### 8. Gotenberg

| Attribute | Assessment |
|-----------|------------|
| **Server/Client** | Server-side Docker microservice. REST API |
| **Custom Fonts** | Yes. Mount fonts in Docker container |
| **Charts** | Yes. Uses headless Chromium internally. Full JS execution |
| **Multi-Page** | Yes. Can merge PDFs, convert Office docs |
| **Print Quality** | Excellent (Chromium-based) |
| **Performance** | Network overhead for HTTP API calls. Chromium startup per request |
| **Python Integration** | HTTP API. Send HTML, get PDF back. Simple `requests.post()` |
| **Pricing** | Open source. Self-hosted via Docker |
| **Solo-Dev Effort** | **LOW-MEDIUM**. Deploy Docker container, call HTTP API. Well-documented |
| **Verdict** | **Excellent if you want to isolate PDF generation.** Wraps Chromium/LibreOffice in a clean API. No Chromium in your main app container. Good for microservice architecture |

#### 9. DocRaptor (SaaS, uses Prince)

| Attribute | Assessment |
|-----------|------------|
| **Quality** | Prince-quality output via API |
| **Pricing** | Basic: $15/mo (125 docs, $0.12/overage). Max: $149/mo (5,000 docs) |
| **Python Integration** | HTTP API. Simple |
| **Verdict** | Good quality but **per-document pricing adds up fast.** At 500 reports/month = ~$60/mo. At scale, self-hosted is cheaper. Consider only if you need Prince quality without the license cost |

#### 10. jsPDF (Current Tool - Client-Side)

| Attribute | Assessment |
|-----------|------------|
| **Custom Fonts** | Possible but painful. Must embed font files as base64 |
| **Charts** | Via html2canvas (rasterizes to image). Not vector. Quality loss |
| **Multi-Page** | Manual page management. No automatic page breaks |
| **Print Quality** | **Poor for branded reports.** Rasterized charts, limited layout control |
| **Verdict** | **Not suitable for 10-20 page branded investment reports.** Fine for simple single-page exports, but lenders need print-quality vector PDFs with proper typography |

#### 11. PDFKit (Python)

| Attribute | Assessment |
|-----------|------------|
| **Note** | Python PDFKit is a wrapper for wkhtmltopdf (deprecated). Not the same as Node.js PDFKit |
| **Verdict** | **Skip.** Depends on wkhtmltopdf which is abandonware |

#### 12. FPDF2

| Attribute | Assessment |
|-----------|------------|
| **Server/Client** | Server-side (pure Python) |
| **Custom Fonts** | Yes. Unicode TrueType font subset embedding |
| **Charts** | Manual drawing only. No HTML/CSS rendering |
| **Multi-Page** | Yes. Auto page breaks, headers/footers |
| **Python Integration** | Native. `pip install fpdf2`. Zero dependencies (nearly) |
| **Pricing** | Open source |
| **Solo-Dev Effort** | **HIGH**. Programmatic layout (like writing PostScript). Every element positioned manually |
| **Verdict** | Lightweight and zero-dependency, but building a 10-page branded report programmatically is extremely tedious. No CSS layout engine. Use only for simple documents (invoices, receipts) |

#### 13. Grover
- Ruby only. **Skip.**

#### 14. pdfme

| Attribute | Assessment |
|-----------|------------|
| **Server/Client** | Both (browser + Node.js). TypeScript/React |
| **Custom Fonts** | Yes |
| **Charts** | Via SVG embedding |
| **Python Integration** | **None.** TypeScript/JavaScript only |
| **WYSIWYG Designer** | Yes. Template designer UI |
| **Pricing** | Open source (MIT) |
| **Verdict** | Interesting template approach but **wrong stack** for Python backend. Would need Node.js service |

---

### PDF Generation Comparison Matrix

| Tool | Custom Fonts | Charts (JS) | Print Quality | Python Native | Setup Effort | Cost |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| **WeasyPrint** | Yes | No (SVG only) | Good | **Yes** | Low | Free |
| **Playwright** | Yes | **Yes** | **Excellent** | Yes (async) | Medium | Free |
| **Gotenberg** | Yes | **Yes** | **Excellent** | HTTP API | Low-Medium | Free |
| **Prince XML** | Yes | No (SVG) | **Best** | Subprocess | Low | $2,500+/yr |
| **Typst** | Yes | Limited | Excellent | Via binding | High | Free |
| **react-pdf** | Yes | SVG only | Good | **No** (Node) | High | Free |
| **DocRaptor** | Yes | No (SVG) | **Best** | HTTP API | Low | $15-149/mo |
| **FPDF2** | Yes | Manual draw | Good | **Yes** | **Very High** | Free |
| **jsPDF** | Painful | Rasterized | Poor | N/A (client) | N/A | Free |
| **wkhtmltopdf** | Limited | No | Poor | Subprocess | - | **DEAD** |
| **pdfme** | Yes | SVG | Good | **No** (TS) | High | Free |

---

### PICK: PDF Generation

**Primary: WeasyPrint + Server-Side SVG Charts**

**Why WeasyPrint wins:**
1. **Pure Python.** `pip install weasyprint`. No Chromium binary, no Docker, no separate service
2. **HTML + CSS = PDF.** Reuse your existing Jinja2 templates. CSS Flexbox/Grid supported
3. **Custom fonts work.** Load Satoshi via @font-face in your PDF stylesheet
4. **Print quality is good.** Vector output, small file sizes, proper typography
5. **Chart strategy:** Generate charts server-side as SVG using `matplotlib` or `plotly` (both can export SVG), embed directly in HTML. WeasyPrint renders SVG as vectors in the PDF -- no quality loss
6. **Multi-page reports:** CSS `@page` rules, page-break-before/after, running headers/footers
7. **Zero operational overhead** for a solo dev

**Chart rendering workflow:**
```
Data (Python) -> Plotly/Matplotlib -> SVG string -> Jinja2 template -> WeasyPrint -> PDF
```

**When to graduate to Playwright/Gotenberg:**
- If you need JavaScript-rendered charts (Chart.js interactive features)
- If WeasyPrint's CSS support hits a wall on a specific layout
- If you need pixel-perfect browser rendering fidelity

**Gotenberg as the upgrade path:**
- Docker microservice wrapping Chromium
- Same HTML templates, just POST to Gotenberg API instead of calling WeasyPrint
- Isolates Chromium from your main app container
- Free, self-hosted

---

## CATEGORY 11: OFFLINE MOBILE DATABASE

### Parcel's Offline Requirements (D4D - Driving for Dollars)

| Feature | Requirement |
|---------|-------------|
| **GPS polylines** | Store driving routes with coordinates offline |
| **Property photos** | Capture photos + notes without connectivity |
| **Property data** | View previously saved properties while offline |
| **Sync** | Push everything to PostgreSQL when online |
| **Conflicts** | Handle user edits offline while server data changed |

---

### Tool-by-Tool Evaluation

#### 1. @capacitor-community/sqlite

| Attribute | Assessment |
|-----------|------------|
| **Capacitor Compat** | **Native plugin.** First-class Capacitor support (iOS, Android, Electron, Web) |
| **Sync Strategy** | **Manual.** Provides JSON import/export tools. You build the sync logic |
| **Conflict Resolution** | **DIY.** No built-in conflict resolution |
| **Data Size** | Device storage limits only. No artificial caps |
| **Encryption** | Yes. SQLCipher on iOS/Android |
| **Maintained** | Yes. Updates documented Jan 2026. Active community |
| **Solo-Dev Complexity** | **MEDIUM.** Plugin is easy; building sync logic is the hard part |
| **Pricing** | Free (open source) |
| **Verdict** | **Solid foundation.** The plugin itself is reliable and well-maintained. But you're building your own sync layer, which is the hardest part of offline-first. Good if you want full control |

#### 2. WatermelonDB

| Attribute | Assessment |
|-----------|------------|
| **Capacitor Compat** | **No official support.** Built for React Native. Capacitor would need custom bridge code |
| **Sync Strategy** | Built-in sync protocol. Push/pull with server |
| **Conflict Resolution** | Server-wins by default. Custom resolution possible |
| **Maintained** | Yes. Active development. Used by Nozbe, tested with 50K+ records |
| **Solo-Dev Complexity** | **HIGH** for Capacitor. Would need significant custom integration work |
| **Pricing** | Free (open source) |
| **Verdict** | **Wrong framework.** Excellent for React Native, but no Capacitor support. Building the bridge would be a major engineering effort. Skip |

#### 3. Realm (MongoDB)

| Attribute | Assessment |
|-----------|------------|
| **Status** | **DEPRECATED AND END-OF-LIFE.** Atlas Device Sync ended September 30, 2025 |
| **Capacitor Compat** | Never had official Capacitor support |
| **Verdict** | **Dead. Do not use.** MongoDB killed Realm/Device Sync. No migration path. The client-side Realm DB continues as open source but without sync support |

#### 4. PouchDB + CouchDB

| Attribute | Assessment |
|-----------|------------|
| **Capacitor Compat** | Yes. Runs in WebView. `pouchdb-adapter-capacitor-sqlite` available for native SQLite backend |
| **Sync Strategy** | **Built-in replication protocol.** Continuous or one-shot sync. Automatic |
| **Conflict Resolution** | **Complex.** CouchDB-style revision trees. Conflict handling is notoriously difficult |
| **Data Size** | WebView: IndexedDB limits (~250MB-1GB). With SQLite adapter: device storage |
| **Encryption** | Via plugins (not built-in) |
| **Maintained** | PouchDB is mature/stable. CouchDB actively maintained (Nov 2025 digest) |
| **Solo-Dev Complexity** | **HIGH.** Sync is automatic but conflict handling is painful. Requires running CouchDB server (different from PostgreSQL) |
| **Pricing** | Free (open source). CouchDB hosting ~$20-50/mo |
| **Verdict** | **Adds infrastructure complexity.** You'd need to run CouchDB alongside PostgreSQL. The sync protocol is powerful but conflict resolution is a known pain point. 2025 community recommends "modern local-first solutions" over this stack |

#### 5. PowerSync

| Attribute | Assessment |
|-----------|------------|
| **Capacitor Compat** | **Official Capacitor SDK** (alpha, built on stable Web SDK). Native SQLite support on mobile |
| **Sync Strategy** | **Automatic.** Postgres -> PowerSync Cloud -> Client SQLite. Real-time streaming |
| **Conflict Resolution** | **Client-wins with server validation.** Write-back via your API (you control conflict logic) |
| **Data Size** | Based on plan (500MB free, 10GB pro) |
| **Encryption** | Via SQLite encryption (platform-dependent) |
| **Maintained** | Yes. Very active development. Native Capacitor SDK announced 2025 |
| **Solo-Dev Complexity** | **LOW.** Handles sync automatically. You define sync rules, PowerSync handles the rest |
| **Pricing** | Free: 2GB sync/mo, 500MB hosted, 50 connections. Pro: **$49/mo.** Self-hosted: free (Open Edition) |
| **Verdict** | **The best fit for Parcel.** Syncs directly with your existing PostgreSQL. No new database to run. Capacitor SDK available. Conflict resolution via your existing FastAPI endpoints. Free tier generous enough for launch. Self-hosted option for cost control |

#### 6. ElectricSQL

| Attribute | Assessment |
|-----------|------------|
| **Capacitor Compat** | **No official Capacitor SDK.** Web-focused. Uses PGlite (Postgres-in-browser via WASM) |
| **Sync Strategy** | Read-path sync from Postgres to client. Partial replication |
| **Conflict Resolution** | Not fully addressed for writes (read-sync focus) |
| **Status** | v1.0 released March 2025. Cloud in public beta |
| **Solo-Dev Complexity** | **HIGH for Capacitor.** No native mobile SDK. WASM Postgres in WebView is experimental |
| **Pricing** | Open source. Cloud pricing TBD (beta) |
| **Verdict** | **Promising but not ready for Capacitor mobile.** Best for web apps with PGlite. No native mobile story. Watch for future Capacitor support |

#### 7. CRDT-based (Automerge, Y.js)

| Attribute | Assessment |
|-----------|------------|
| **Use Case Fit** | Overkill. CRDTs shine for collaborative editing (Google Docs-style). D4D is single-user offline capture |
| **Complexity** | Months to build a production sync layer. File sizes grow over time |
| **Verdict** | **Overkill.** Parcel's D4D is single-user. No collaborative editing needed. Last-write-wins is fine for "I captured this property while driving." CRDTs add complexity without benefit |

#### 8. Expo SQLite

| Attribute | Assessment |
|-----------|------------|
| **Capacitor Compat** | **No.** Expo/React Native only. Not compatible with Capacitor |
| **Verdict** | **Wrong framework.** Skip |

#### 9. op-sqlite

| Attribute | Assessment |
|-----------|------------|
| **Capacitor Compat** | **No.** React Native only (JSI-based). Not compatible with Capacitor |
| **Verdict** | **Wrong framework.** Skip |

---

### Offline Mobile Database Comparison Matrix

| Tool | Capacitor Native | Auto Sync | Conflict Resolution | Works with Postgres | Solo-Dev Score | Cost |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| **@capacitor/sqlite** | **Yes** | No (DIY) | DIY | DIY | 5/10 | Free |
| **WatermelonDB** | No | Yes | Server-wins | DIY | 2/10 | Free |
| **Realm** | No | **DEAD** | N/A | No | 0/10 | N/A |
| **PouchDB+CouchDB** | Yes (adapter) | Yes | Complex | No (needs CouchDB) | 3/10 | Free + CouchDB |
| **PowerSync** | **Yes (SDK)** | **Yes** | Client-wins + API | **Yes (native)** | **9/10** | **Free-$49/mo** |
| **ElectricSQL** | No | Yes (read) | Limited | Yes | 3/10 | Free (beta) |
| **CRDTs** | DIY | DIY | Automatic | DIY | 1/10 | Free |
| **Expo SQLite** | No | No | N/A | N/A | 0/10 | N/A |
| **op-sqlite** | No | No | N/A | N/A | 0/10 | N/A |

---

### PICK: Offline Mobile Database

**Primary: PowerSync (Cloud or Self-Hosted)**

**Why PowerSync wins decisively:**

1. **Syncs directly with PostgreSQL.** No new database to learn or run. Your existing Postgres is the source of truth
2. **Official Capacitor SDK.** Built for exactly your stack (Capacitor + React)
3. **Automatic sync.** Define sync rules (which tables, which rows), PowerSync handles streaming changes to the client's SQLite
4. **Conflict handling via your API.** Client writes go through your FastAPI endpoints. You decide conflict resolution logic in Python -- not some opaque database protocol
5. **Offline-first by design.** Client reads always hit local SQLite (instant). Writes queue locally and sync when online
6. **Free tier covers launch.** 2GB sync/mo, 500MB hosted, 50 concurrent connections
7. **Self-hosted option.** Open Edition is free. Run it yourself when cost matters
8. **GPS polylines + photos workflow:**
   - User drives, app captures GPS coords -> writes to local SQLite via PowerSync
   - User photographs property -> stores photo file locally + metadata in SQLite
   - User adds notes -> local SQLite
   - Signal returns -> PowerSync syncs metadata to Postgres. Photo files upload via separate file upload endpoint
   - FastAPI processes new properties (enrichment, AI analysis)

**Fallback: @capacitor-community/sqlite + custom sync**
- If PowerSync's pricing doesn't work or you want zero vendor dependency
- More engineering effort but full control
- Use the plugin for local SQLite, build a simple sync protocol:
  - Track `updated_at` timestamps
  - On reconnect: POST changed records to FastAPI, GET server changes since last sync
  - Last-write-wins for conflicts (acceptable for D4D single-user capture)

---

## EXECUTIVE SUMMARY

| Category | Pick | Cost | Setup Time |
|----------|------|------|------------|
| **Background Jobs** | Huey (SQLite backend) -> Inngest (managed) | $0 -> $0-75/mo | 2-4 hours |
| **PDF Generation** | WeasyPrint + server-side SVG charts | $0 | 4-8 hours |
| **Offline Mobile DB** | PowerSync (Capacitor SDK) | $0-49/mo | 1-2 days |

**Total infrastructure cost at launch: $0/month**  
**Total infrastructure cost at scale (1K+ users): ~$49-124/month**

All three picks prioritize:
- Zero or minimal external dependencies
- Python-native or Python-compatible
- Solo-dev friendly (minimal ops burden)
- Clear upgrade path when you outgrow them
- No vendor lock-in (open source alternatives available)

---

## Sources

### Background Jobs
- [Python Task Queue Comparison with Load Tests](https://stevenyue.com/blogs/exploring-python-task-queue-libraries-with-load-test)
- [Choosing The Right Python Task Queue](https://judoscale.com/blog/choose-python-task-queue)
- [Dramatiq Documentation](https://dramatiq.io/)
- [Taskiq GitHub](https://github.com/taskiq-python/taskiq)
- [Taskiq FastAPI Integration](https://taskiq-python.github.io/framework_integrations/taskiq-with-fastapi.html)
- [ARQ Documentation](https://arq-docs.helpmanual.io/)
- [ARQ GitHub](https://github.com/python-arq/arq)
- [Huey GitHub](https://github.com/coleifer/huey)
- [Huey Documentation](https://huey.readthedocs.io/)
- [RQ Documentation](https://python-rq.org/)
- [Trigger.dev Pricing](https://trigger.dev/pricing)
- [Inngest Pricing](https://www.inngest.com/pricing)
- [Inngest Python SDK](https://pypi.org/project/inngest/)
- [Temporal Pricing](https://temporal.io/pricing)
- [Hatchet Pricing](https://hatchet.run/pricing)
- [Railway Cron Jobs Docs](https://docs.railway.com/cron-jobs)
- [FastAPI BackgroundTasks](https://fastapi.tiangolo.com/tutorial/background-tasks/)
- [Managing Background Tasks in FastAPI](https://leapcell.io/blog/managing-background-tasks-and-long-running-operations-in-fastapi)
- [FastAPI BackgroundTasks vs ARQ](https://davidmuraya.com/blog/fastapi-background-tasks-arq-vs-built-in/)
- [Google Cloud Scheduler Pricing](https://cloud.google.com/scheduler/pricing)

### PDF Generation
- [HTML to PDF Benchmark 2026 (Playwright vs Puppeteer vs WeasyPrint)](https://pdf4.dev/blog/html-to-pdf-benchmark-2026)
- [Generate PDFs with Python: 8 Best Libraries 2026](https://docupotion.com/blog/generate-pdf-python)
- [Top 10 Python PDF Generator Libraries](https://www.nutrient.io/blog/top-10-ways-to-generate-pdfs-in-python/)
- [WeasyPrint Documentation](https://doc.courtbouillon.org/weasyprint/latest/first_steps.html)
- [Gotenberg](https://gotenberg.dev/)
- [Prince XML Licensing](https://www.princexml.com/purchase/)
- [DocRaptor Pricing](https://docraptor.com/prince)
- [Typst Automated PDF Generation](https://typst.app/blog/2025/automated-generation/)
- [typst-py Python Binding](https://github.com/messense/typst-py)
- [FPDF2 Documentation](https://py-pdf.github.io/fpdf2/index.html)
- [pdfme GitHub](https://github.com/pdfme/pdfme)
- [react-pdf](https://react-pdf.org/)

### Offline Mobile Database
- [@capacitor-community/sqlite GitHub](https://github.com/capacitor-community/sqlite)
- [Capacitor Database Guide (RxDB)](https://rxdb.info/capacitor-database.html)
- [PowerSync](https://www.powersync.com/)
- [PowerSync Capacitor SDK](https://docs.powersync.com/client-sdk-references/capacitor)
- [PowerSync Pricing](https://www.powersync.com/pricing)
- [ElectricSQL 1.0 Release](https://electric-sql.com/blog/2025/03/17/electricsql-1.0-released)
- [WatermelonDB GitHub](https://github.com/Nozbe/WatermelonDB)
- [MongoDB Ends Mobile Support (Realm EOL)](https://www.couchbase.com/blog/realm-mongodb-eol-day-2025/)
- [PouchDB + CouchDB in 2025](https://neighbourhood.ie/blog/2025/03/26/offline-first-with-couchdb-and-pouchdb-in-2025/)
- [Why Cinapse Moved Away from CRDTs](https://www.powersync.com/blog/why-cinapse-moved-away-from-crdts-for-sync)
- [TinyBase vs WatermelonDB vs RxDB 2026](https://www.pkgpulse.com/blog/tinybase-vs-watermelondb-vs-rxdb-offline-first-2026)
