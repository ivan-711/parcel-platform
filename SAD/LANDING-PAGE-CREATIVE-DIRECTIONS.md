# Parcel Landing Page — Creative Directions

**Date:** 2026-04-09
**Inputs:** LANDING-PAGE-REDESIGN-RESEARCH.md, CANONICAL-PRODUCT-BLUEPRINT.md, current landing page audit

**Shared constraints:**
- Dark theme default (#0C0B0A bg, #F0EDE8 text, #8B7AFF violet accent)
- Satoshi 300 for brand/display, Inter for body
- WCAG AA minimum, reduced-motion support
- Performance budget: <3s LCP, <100ms FID, lazy-load below fold
- Target persona: Carlos (creative finance), Desiree (wholesaler), Tamara (hybrid investor)
- Core promise: "Enter an address, get a credible AI-narrated analysis in under 60 seconds"

---

## CHOSEN DIRECTION: "The Architect"

### Name & Vibe
**Cinematic authority.** A building assembles itself piece by piece as the user scrolls — structural, deliberate, almost meditative. The message is visceral before it's verbal: "We construct the full picture." The site feels like a premium architecture firm's portfolio crossed with an intelligence platform. Dark, confident, unhurried. The hero is pure cinema; the product sells itself below.

### Hero Concept
**First 50ms:** Full-viewport #0C0B0A darkness. A striking building/property begins mid-assembly — steel beams, walls, windows partially visible, frozen in time. Headline in Satoshi 300 at 56px overlays the video:

**"We build the full picture."**
**Subhead (Inter 16px, text-secondary):** "AI-powered deal analysis across 5 investment strategies. Any US address. Under 60 seconds."

**On scroll:** The building continues assembling — walls rise, windows slot in, roof completes, landscaping appears. The video plays forward on scroll-down, reverses on scroll-up. The headline fades out as the building nears completion. When the building is fully assembled, the hero section ends and the product preview begins.

**No product UI in the hero. No address input. No auto-typing.** The hero is purely cinematic — it sets the emotional tone. The product earns its own section below.

**Video generation pipeline:**
1. Nano Banana 2 (2048 resolution): Generate two images of the same building — (A) partially constructed/exploded view, (B) fully assembled
2. Wan 2.7 or Kling 3.0: Feed A as start frame, B as end frame → 3-5 second transition video
3. Export as WebM (VP9) + MP4 (H.264) for browser compatibility
4. Scroll sync: HTML5 `<video>` with `currentTime` mapped to scroll position

**Reduced motion fallback:** Static image of the completed building. Headline + subhead visible immediately. No scroll lock.

### Section Flow (Daniel Priestley Sales Framework)

| # | Section | Framework Stage | Content | Peak? |
|---|---------|----------------|---------|-------|
| 1 | **Hero** | Framing | Scroll-driven building assembly video. Headline: "We build the full picture." Sets emotional tone — precision, completeness, authority. | |
| 2 | **Product Preview** | Desired Outcome | Real screenshots/videos of the Parcel analysis page. Show the 5-strategy results, the AI narrative, the key metrics. This is what the user gets. Placeholder screenshots fine until analysis page is polished. | |
| 3 | **Problem** | Present Situation + Frustration | Full-viewport dark section. Single line, centered: **"You're running numbers across 4 tabs, 3 spreadsheets, and a prayer."** Below, smaller: "Your competitor just did it in 60 seconds." Confrontational — creates tension. (Borrowed from Direction 2.) | |
| 4 | **How It Works** | Solution | 3-step horizontal flow: **Paste an address → Get 5-strategy analysis → Make confident decisions.** Each step gets a card with an icon, title, one sentence. Clean, structural. | |
| 5 | **Strategy Breakdown** | Solution (deep) | 5 strategies in a tabbed or accordion layout — not 5 full-viewport panels (too heavy). Each tab shows: strategy name, 3 key metrics it calculates, one-line explanation, example output. Wholesale / BRRRR / Buy & Hold / Flip / Creative Finance. | |
| 6 | **AI Narrative Demo** | Proof | Show a real AI narrative excerpt. Glass card with typing animation: *"The data shows an 8% equity cushion — tight for a 1965 build. At 7.25% financing, monthly cash flow is $127 — positive but thin."* Confidence badge fades in: "HIGH." This is the **peak moment** — proves the AI says something real. (Borrowed from Direction 3.) | YES |
| 7 | **Social Proof** | Proof | Stats strip: "X properties analyzed" + "5 investment strategies" + "14 financial calculators." If testimonials exist, add 2-3 short quotes. Otherwise, persona archetypes: "Built for wholesalers, flippers, and buy-and-hold investors." | |
| 8 | **Pricing** | Offer | Current Steel/Carbon/Titanium 3-tier layout. Monthly/annual toggle. Carbon highlighted with violet glow. 7-day free Carbon trial callout. | |
| 9 | **CTA** | Close | Dark section. **"Ready to see what your next deal is really worth?"** Single "Get Started Free" button + "No credit card required" subtext. Clean, confident, no input field. | |
| 10 | **Footer** | — | Links, legal, copyright. Minimal. | |

### Signature Interaction (Peak Moment)
**The AI narrative typing reveal** (Section 6). A glass-style card enters the viewport. A cursor blinks, then two sentences of real analyst-voice narrative type out character by character (40ms/char, natural pauses on punctuation). When complete, a "Confidence: HIGH" badge fades in with a subtle green glow. This single moment proves Parcel's AI is not a gimmick — it has an opinion, it speaks in specifics, it sounds like an analyst, not a chatbot.

Secondary peak: The scroll-driven building assembly in the hero. The user controls the construction by scrolling — agency + spectacle.

### Animation Strategy
- **Hero:** HTML5 `<video>` with `currentTime` driven by Framer Motion `useScroll`. Lenis provides smooth scroll normalization. Headline fade-out keyed to scroll progress via `useTransform`. No scroll hijack — native scroll, video just syncs.
- **Product Preview:** Screenshots/mockups fade in with `whileInView` (opacity 0→1, y 16→0). Staggered if multiple images.
- **Problem section:** No animation. Static text. The words do the work.
- **How It Works:** 3 cards stagger in left-to-right on scroll (200ms delay between each).
- **Strategy tabs:** Instant tab switch (no transition). Content fades in 150ms.
- **AI Narrative:** Character-by-character typing via Framer Motion `useMotionValue`. Cursor blink via CSS `@keyframes blink`.
- **Pricing:** Existing AnimatePresence for monthly/annual toggle. Cards fade in on scroll.
- **All animations:** `ease-luxury` (0.25, 0.1, 0.25, 1), 200-300ms duration. Reduced motion: everything appears instantly without animation.

### Technical Approach
**Framer Motion + Lenis.** Remove GSAP and SpiralBackground entirely.

| Component | Technology | Why |
|-----------|-----------|-----|
| Scroll-driven video | HTML5 `<video>` + `useScroll` + RAF | Native video element, no Three.js needed for simple playback sync |
| Smooth scroll | Lenis (already installed) | Normalizes scroll across browsers, buttery feel |
| Section animations | Framer Motion `whileInView` | Consistent with existing codebase pattern |
| AI typing effect | Framer Motion `useMotionValue` | Lightweight, no GSAP timeline needed |
| Code splitting | React.lazy + Suspense | Keep existing pattern — lazy below hero |
| Navbar | Keep existing floating pill | Already works well, scroll-aware glass morphism |

**Video hosting:** Self-hosted in `/public/videos/`. WebM (VP9, ~1-2MB) as primary, MP4 (H.264, ~2-3MB) as fallback. Preload `metadata` only. Start loading full video when hero enters viewport.

**Mobile:** Video plays as a simple autoplay loop (no scroll sync — `IntersectionObserver` triggers play/pause). Reduced to 720p. All scroll-driven effects degrade to simple fade-ins.

**Performance budget:**
- Hero LCP: headline text (<500ms, video loads async)
- Total hero JS: ~5KB (vs current ~50KB with GSAP + SpiralBackground)
- Video: lazy-loaded, doesn't block render
- Below fold: all lazy-loaded (existing pattern preserved)

### What Makes It Different
The building assembly metaphor is specific to real estate — not a generic SaaS hero. It communicates Parcel's core thesis (we construct the complete picture from raw data) through imagery rather than words. The scroll-driven video creates the $10K agency feel without the $10K agency. The confrontational problem section creates emotional urgency. The AI narrative typing proves the product has substance. And the structural layout (clean sections, no organic/anti-grid experimentation) signals professionalism — this is a tool for people who manage millions in real estate, not a design experiment.

**Not doing:** No live terminal/demo API (revisit later). No auto-typing hero (product preview section handles this). No glass card hero (glass elements used selectively in AI narrative and pricing, not as the dominant language). No Magic UI Pro (not purchasing — building with shadcn + Framer Motion + our design tokens).

**Reference sites:** Apple product pages (scroll-driven video), Linear.app (dark + structured), Stripe (confident typography), Architecture firm portfolios (building imagery + precision).

---
---

# Explored Alternatives

The following 4 directions were brainstormed and evaluated. The chosen direction ("The Architect") borrows the AI narrative typing from Direction 3 and the confrontational problem section from Direction 2.

---

## Direction 1: "The Analyst's Desk"

### Name & Vibe
**Archival intelligence.** The feeling of walking into a high-end research firm's private terminal. Clean grids, precise data, quiet authority. Think Bloomberg Terminal meets Linear.app — not flashy, just unmistakably competent. The site whispers "we know what we're doing" through structure, not spectacle.

### Hero Concept
**First 50ms:** A dark field with a single line of Satoshi 300 at 56px: **"Every deal has a number. We find it."** Below it, a muted address input field with a softly pulsing violet cursor. No background animation, no particles, no gradients — just typography and negative space.

As the user watches (no scroll needed), the input auto-types "1847 Maple Ave, Kansas City, MO" and the screen quietly populates: five strategy cards slide up from below, each showing one key metric (cap rate, cash-on-cash, MAO, cash flow, profit). The numbers count up from zero. The whole thing takes 4 seconds.

**Headline:** "Every deal has a number. We find it."
**Subhead:** "AI-powered analysis across 5 strategies. Any US address. Under 60 seconds."

### Section Flow
| Section | Sales Framework | Content |
|---------|----------------|---------|
| Hero | Framing + Desired Outcome | Auto-typing demo showing the 5-strategy output |
| Problem Strip | Present Situation + Problem | "You're running numbers in 4 tabs, 3 spreadsheets, and a calculator app." Single horizontal strip, dark bg, small text. |
| Strategy Grid | Solution | 5-card grid (one per strategy), each with icon + 3 bullet points + example metric. Not alternating blocks — a single unified grid. |
| Data Provenance | Proof | "Powered by RentCast market data, AI valuation models, and 14 financial calculators." Show the data pipeline as a minimal diagram. |
| Pricing | Offer | Current 3-tier layout, refined. Steel/Carbon/Titanium. |
| CTA | Close | "Paste an address. See what it's worth." Single input + button. |

### Signature Interaction (Peak Moment)
The auto-typing hero demo. The user sees an address get analyzed in real time without clicking anything. Five strategy results materialize as the "analysis" completes. Each card has a tiny risk indicator (green/amber/red dot) that fades in last — the moment where the demo feels like a real product, not a mockup.

### Animation Strategy
- **Zero scroll-based animation in the hero.** The auto-typing demo runs on a timer (GSAP timeline or Framer Motion sequence). This means it works on mobile, in screen readers, and without scroll events.
- **Below hero:** Subtle `fadeInUp` on scroll for each section (Framer Motion `whileInView`). No parallax, no kinetic text. Every animation is `ease-luxury` with 300ms duration.
- **Hover states:** Strategy cards lift 2px with `card-hover` shadow on hover. Pricing cards do the same.
- **Reduced motion:** Auto-typing demo runs instantly (no animation), cards appear without fade.

### Technical Approach
**Framer Motion only.** Remove GSAP and SpiralBackground entirely. The auto-typing effect uses a Framer Motion `useMotionValue` with `animate()` to control character index. The 5-card reveal uses staggered `variants`. Total hero JS: ~2KB vs current ~50KB (SpiralBackground + GSAP).

Performance: No canvas, no RAF loop, no scroll hijack. LCP is the headline text — renders in <500ms. Below-fold sections lazy-loaded (keep existing pattern).

### What Makes It Different
Most SaaS landing pages try to impress with motion. This one impresses with restraint. The auto-typing demo proves the product works without the user lifting a finger. The archival grid aesthetic (inspired by the "archival index" 2026 trend) signals that Parcel is a tool for professionals, not hobbyists. The total absence of decorative animation is itself a statement: "We don't need to distract you from our product."

**Reference sites:** Linear.app (structure), Stripe Dashboard docs (data presentation), Bloomberg Terminal (authority through density).

---

## Direction 2: "The Scroll Film"

### Name & Vibe
**Cinematic product story.** The landing page IS a short film about one deal's journey — from a vacant lot photo to a funded acquisition. The user scrolls through the narrative, and the page transforms around them. Premium agency feel, $10K website energy. Think Apple product launch page meets a real estate pitch deck.

### Hero Concept
**First 50ms:** Full-viewport dark frame. A single property photo (aerial/satellite, slightly desaturated) fills 70% of the screen behind a frosted glass overlay. Over it, enormous Satoshi 300 type: **"See what others miss."** Below, smaller: "AI deal analysis for real estate investors."

On scroll, the property photo zooms in slowly (parallax at 0.3x scroll speed), the headline splits and slides apart (left word goes left, right word goes right), and the analysis dashboard UI fades in from behind the text — the "reveal." The user scrolls through the property's story: address parsed → data fetched → five strategies calculated → AI narrative generated → deal verdict rendered.

**Headline:** "See what others miss."
**Subhead:** "5 strategies. 14 calculators. One address. Under 60 seconds."

### Section Flow
| Section | Sales Framework | Content |
|---------|----------------|---------|
| Hero | Framing | Property photo + headline reveal |
| The 60-Second Demo | Desired Outcome | Scroll-driven video/animation of analysis flow unfolding step-by-step |
| The Problem | Problem + Frustration | "Your competitor already ran the numbers." Dark, confrontational. Single sentence, full viewport. |
| Five Strategies | Solution | Each strategy gets its own viewport-height panel. Scroll through them like film frames. Wholesale → BRRRR → Buy & Hold → Flip → Creative Finance. Each shows the key calculation with real numbers. |
| Who Uses Parcel | Proof (Social) | Persona cards (not testimonials — character profiles). "Carlos runs creative finance in San Antonio." Photo, strategy, metric. |
| Pricing | Offer | Full-bleed pricing section. Carbon tier centered and glowing. |
| CTA | Close | The property photo from the hero returns, now with a green "STRONG BUY" verdict overlaid. "That property? Already analyzed. Yours is next." Input + button. |

### Signature Interaction (Peak Moment)
The strategy film strip. As the user scrolls through the five strategies section, each strategy occupies the full viewport. The transition between them is a smooth crossfade where the key metric (cap rate, cash-on-cash, MAO, etc.) scales up from body size to display size as it becomes the focus. When the user reaches Creative Finance (the last one, Parcel's moat), the background shifts from dark gray to a subtle violet gradient — the only color shift on the entire page.

### Animation Strategy
- **Hero:** Scroll-driven parallax (CSS `transform: translateY(calc(var(--scroll) * 0.3))` or Framer Motion `useScroll`). Headline split uses `translateX` keyed to scroll progress.
- **60-Second Demo:** Scroll-driven video if feasible (per Chris Lee technique: generate start/end frames of analysis UI, create transition video, sync to scroll). Fallback: stepped Framer Motion sequence keyed to scroll position.
- **Strategy film strip:** `position: sticky` panels with opacity crossfade. Each panel sticks until the next one scrolls in. Pure CSS + Framer Motion `useScroll` + `useTransform`.
- **No GSAP.** Everything runs on Framer Motion scroll hooks. Lenis activated for smooth scroll feel.

### Technical Approach
**Framer Motion + Lenis.** Remove GSAP. Lenis provides buttery smooth scroll (it's already installed). Framer Motion `useScroll` and `useTransform` drive all scroll-linked effects. The sticky strategy panels use CSS `position: sticky` (zero JS cost). The scroll-driven video (if used) is an `<video>` element with `currentTime` mapped to scroll position via `requestAnimationFrame`.

Performance concern: The hero property photo needs to be optimized (WebP, srcset, lazy placeholder). The scroll-driven video is ~2-5MB — preload only when hero is visible. Mobile: disable parallax, simplify to fade transitions.

### What Makes It Different
This page tells a story instead of listing features. The user doesn't read about Parcel — they watch it work. The strategy film strip (five full-viewport panels) is a format no SaaS competitor uses. The "confrontational problem" section ("Your competitor already ran the numbers") creates emotional tension that the solution resolves. The return of the hero photo at the CTA creates narrative closure (Peak-End Rule).

**Reference sites:** Apple Vision Pro page (scroll-driven product reveal), Porsche Taycan configurator (cinematic transitions), Stripe Atlas (story-driven SaaS).

---

## Direction 3: "Glass Intelligence"

### Name & Vibe
**Frosted depth and ambient light.** Glass morphism 2.0 done properly — not the 2021 trend of blurry cards on gradients, but a mature system of layered translucent surfaces with warm light bleeding through. The page feels like looking through a premium car's heads-up display at night. Sophisticated, warm despite being dark, tactile without being heavy.

### Hero Concept
**First 50ms:** Dark background with two or three soft violet/amber radial gradients floating slowly (CSS animations, not canvas — just `background: radial-gradient()` with `animation: drift`). Over this ambient field, a large frosted glass card (backdrop-blur, warm border highlight) contains:

**"Real estate intelligence,**
**delivered in seconds."**

Below the headline, inside the same glass card: a live address input with the MapPin icon. The card has the characteristic glass edge-highlight (`inset 0 1px 0 0 rgba(255,255,255,0.06)`) and soft shadow. The entire card breathes subtly (scale 1.0 → 1.005 on a 6s loop).

No auto-demo, no scroll hijack. The hero is an invitation: type an address and go. The glass card is the product's front door.

**Headline:** "Real estate intelligence, delivered in seconds."
**Subhead:** "5 investment strategies. AI-powered analysis. One address."

### Section Flow
| Section | Sales Framework | Content |
|---------|----------------|---------|
| Hero | Framing + Permission | Glass card with live address input. The CTA IS the hero. |
| Social Proof Bar | Rapport | Horizontal ticker: "Trusted by 500+ investors" + logo/avatar strip (even if early stage, show persona archetypes). Glass surface. |
| How It Works | Present Situation → Desired Outcome | 3-step horizontal flow: "Paste address → Get analysis → Make decisions." Each step is a glass card with an icon and one sentence. Lines connect them. |
| Features | Solution | 2x3 grid of glass cards. Each card: icon, title, one-line description, subtle hover lift. Cards have varying levels of blur/opacity for visual depth. |
| The AI Difference | Proof | "Not just numbers — narrative." Show a real AI narrative excerpt in a glass card with a typing indicator, then the full text reveals. Quote the analyst voice: "The data shows an 8% equity cushion — tight for a 1965 build." |
| Pricing | Offer | Three glass cards side-by-side. Carbon card has a violet glow ring. |
| CTA | Close | The hero glass card returns. "Ready to see your first deal?" Same input, same card. Scroll has come full circle. |

### Signature Interaction (Peak Moment)
The AI narrative reveal. In the "AI Difference" section, a glass card shows a partially visible analysis. As it enters the viewport, a typing cursor appears and the narrative text types out character by character — not the full 200-word narrative, just 2 sentences that demonstrate the analyst voice. The typing speed is natural (40ms per character, pauses on periods). When it completes, a small "Confidence: HIGH" badge fades in with a green glow. This single moment proves that Parcel's AI actually says something meaningful, not just "good investment."

### Animation Strategy
- **Ambient gradients:** Pure CSS. `@keyframes drift` already exists in the design system. Three radial gradients with different sizes and drift speeds. GPU-accelerated via `will-change: transform`.
- **Glass card entrance:** Framer Motion `whileInView` with `opacity: 0→1, y: 16→0, blur: 8→0`. The blur-in effect makes cards feel like they're emerging from the glass surface.
- **Narrative typing:** Framer Motion `animate` controlling a character index. 40ms per character, 300ms pause on `.` and `,`.
- **Hover states:** Cards scale 1.01 with shadow-lg transition. Border opacity increases from 0.06 to 0.12.
- **No scroll hijack, no sticky panels, no parallax.** Every section is a simple block that fades in.

### Technical Approach
**Framer Motion + CSS only.** Remove GSAP entirely. No canvas, no RAF loops, no scroll position tracking. The ambient gradients are CSS-only (existing `drift1/drift2/drift3` keyframes). Glass effects use `backdrop-filter: blur()` with `saturate(180%)` (the `.glass` utility already exists in index.css).

Performance: This is the lightest direction. No video, no canvas, no scroll listeners. Hero LCP is the glass card — renders in <800ms including blur. Mobile: reduce blur radius from 20px to 12px for GPU savings. The entire page is essentially styled divs with Framer Motion fade-ins.

### What Makes It Different
Glass morphism is everywhere in 2024-2025 — but mostly done badly (too much blur, neon borders, no hierarchy). This direction uses it as a systematic language: every interactive surface is glass, every background is ambient gradient, every border is a warm light catch. The consistency creates a world, not just a style. The live address input in the hero is bold — most SaaS pages hide the product behind a "Get Started" button. Parcel puts the product's front door on the landing page.

**Reference sites:** Apple macOS Ventura wallpaper system (ambient gradients), Raycast.com (glass cards on dark), Linear.app (warm dark with subtle depth).

---

## Direction 4: "The Live Terminal"

### Name & Vibe
**Working product as marketing.** The landing page IS the product. No mockups, no screenshots, no "imagine what it could do." The hero contains a real, functional address input connected to the actual analysis API. The visitor types an address and watches real numbers appear. The landing page doesn't describe Parcel — it IS Parcel, running in demo mode.

This is the most aggressive direction. It bets everything on the product being impressive enough to sell itself.

### Hero Concept
**First 50ms:** Dark background, no decoration. Center of viewport: a large, precise interface card that looks like the actual Parcel analysis page. At the top, the address input (fully functional). Below it, five strategy tabs (grayed out). Below those, empty metric slots with "---" placeholders.

**Headline (above the card):** "Try it. Right now."
**Subhead:** "No signup. No credit card. Paste any US address."

The user types or pastes an address. The autocomplete dropdown appears (real Google Places API). They select. The card comes alive: a subtle loading shimmer runs across the metric slots, the strategy tabs illuminate one by one (left to right, 200ms stagger), and real numbers populate — purchase price, cap rate, cash-on-cash, monthly cash flow, MAO. The AI verdict badge appears last: "MODERATE — 6.2% cap rate in a declining rent market."

This IS the product. The visitor just used Parcel without signing up.

**After the demo completes:** A subtle banner slides up below the card: "That took 47 seconds. Want to save this deal? Create a free account →"

### Section Flow
| Section | Sales Framework | Content |
|---------|----------------|---------|
| Hero | Framing + Permission + Solution (all at once) | Live functional demo. The product IS the pitch. |
| Results Context | Desired Outcome | After demo runs, the page expands below the card: "Here's what you just got:" with callouts pointing to each metric explaining what it means. Contextual education. |
| Why It's Better | Problem (retrospective) | "Before Parcel, this took 45 minutes and 3 spreadsheets." Show a split: left = mess (Excel, calculator, tabs), right = what they just experienced. |
| Social Proof | Proof | "12,847 properties analyzed this month." Real counter (updated from API). Plus 3 short testimonial quotes. |
| Pricing | Offer | "You just used the free tier. Here's what Carbon unlocks:" Focus on the upgrade path, not the full pricing grid. Show what they'd get MORE of. |
| CTA | Close | "You already know it works. Start for free →" Single button. No input — they already typed the address. |

### Signature Interaction (Peak Moment)
The live analysis itself. The visitor watches real data populate a real interface. The moment the AI verdict badge appears with an actual opinion about the property they just entered — that's the peak. It's not a demo video, not a mockup, not a promise. It's proof. Every other SaaS landing page says "try it free." This one says "try it now, for real, right here."

### Animation Strategy
- **Hero card:** No entrance animation. It's already there when the page loads — static, waiting. The lack of animation is intentional: this is a tool, not a show.
- **Analysis loading:** Shimmer on metric slots (existing `skeleton-shimmer` keyframe). Strategy tabs illuminate with `opacity: 0.3→1` stagger. Numbers count up from 0 using `useMotionValue` + `animate`.
- **Post-demo expansion:** The page below the card expands with a smooth `height: auto` animation (Framer Motion `AnimatePresence`). Sections fade in as the user scrolls.
- **The "45 minutes" comparison:** Left side (spreadsheet mess) has a subtle red tint. Right side (Parcel) has the violet glow. No animation — just color contrast.

### Technical Approach
**Framer Motion + real API calls.** The hero makes actual calls to the Parcel analysis API in a rate-limited demo mode. The backend needs a public `/api/analysis/demo` endpoint that:
- Accepts any US address
- Returns real RentCast data + calculator outputs
- Rate-limited to 3/hour per IP (no auth required)
- Returns a subset of data (no AI narrative, no saved deal — those require signup)
- Cached aggressively (same address = same response for 24h)

This is the most complex direction technically because it requires a new backend endpoint and careful rate limiting. But the frontend is actually simpler than other directions — it's mostly the existing `AnalysisResultsPage` components repackaged.

Performance: The hero renders instantly (static card). The API call takes 5-15 seconds (same as the real product). This latency is a feature, not a bug — it builds anticipation and proves the analysis is real.

Mobile: The card shrinks to single-column. Strategy tabs become a horizontal scroll. Metrics stack vertically. The experience is the same — type, wait, see results.

### What Makes It Different
No other real estate SaaS lets you use the product on the landing page without signing up. DealMachine, PropStream, Privy — they all require email + credit card before you see anything. Parcel's bet: the product is impressive enough that seeing it once converts the visitor. This direction eliminates the "trust gap" entirely. You don't have to trust our screenshots or our copy. You just saw it work on a property you chose.

The risk: if the product isn't polished enough, showing it raw is worse than showing a curated mockup. This direction only works if the analysis UI is genuinely impressive.

**Reference sites:** Vercel's `vercel.com/new` (deploy a project without signing up), Figma's multiplayer cursor demo (product as hero), Algolia's search demo (type and see results instantly).

---

## Comparison Matrix

| | The Analyst's Desk | The Scroll Film | Glass Intelligence | The Live Terminal |
|---|---|---|---|---|
| **Feeling** | Quiet authority | Cinematic story | Warm sophistication | Raw confidence |
| **Hero mechanism** | Auto-typing demo | Scroll-driven reveal | Glass card + live input | Functional product |
| **Animation weight** | Minimal (FM only) | Heavy (scroll + video) | Light (CSS + FM) | Minimal (loading states) |
| **Technical risk** | Low | Medium-High | Low | High (needs demo API) |
| **Mobile quality** | Excellent | Requires adaptation | Excellent | Good (API latency) |
| **Performance** | Best (<1s LCP) | Heaviest (video) | Great (<1s LCP) | Good (depends on API) |
| **Build effort** | Small | Large | Medium | Large (backend + frontend) |
| **Differentiation** | High (restraint is rare) | High (cinematic is rare) | Medium (glass is common) | Highest (no competitor does this) |
| **Conversion bet** | Typography + auto-demo | Emotional story arc | Invitation to try | Product proves itself |
| **Best for persona** | Tamara (analytical) | Desiree (emotional) | Carlos (sophisticated) | All (seeing is believing) |

---

## Decision Log

**Chosen: "The Architect"** — Scroll-driven building assembly hero + Daniel Priestley sales framework + AI narrative typing as peak moment.

**Rejected approaches:**
- Auto-typing hero (Direction 1) — clever but doesn't create emotional impact; too "demo-y"
- Glass card hero (Direction 3) — warm but doesn't differentiate; glass morphism is overused in 2025-2026
- Live terminal (Direction 4) — strongest differentiator but requires demo API; revisit as Phase 2 hero upgrade
- Full scroll film (Direction 2) — too heavy, risky on mobile; cherry-picked the confrontational problem section instead

**Key borrowed elements:**
- AI narrative typing reveal → from Direction 3 (signature peak moment)
- Confrontational problem section → from Direction 2 ("Your competitor already ran the numbers")
- Framer Motion + Lenis stack → from Direction 2 (no GSAP)
- Clean structural layout → from Direction 1 (archival precision, not organic experimentation)

**Not purchasing Magic UI Pro.** Building with shadcn MCP + Framer Motion + existing design tokens.
