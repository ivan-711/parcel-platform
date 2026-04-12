# Hero Section Creative Research — Parcel Landing Page

> Date: April 6, 2026
> Status: Research complete, ranked recommendations ready

---

## Part 1: What Makes the Reference Heroes Work

### Fey.com — Hero Viewport Analysis

**What's in the viewport:** A large product screenshot (dark dashboard with charts and a stock ticker) floating on pure black. The screenshot is tilted at a subtle 3D perspective angle, edges dissolving into the void. Below and left, the headline "Make better investments." sits in massive Calibre 54px.

**Why it works:**
- The product IS the hero. No decoration, no abstraction. The dashboard sells itself.
- The 3D perspective tilt creates depth without any 3D library — it's a CSS `transform: perspective() rotateY()` on a flat image.
- The screenshot is cropped to show only the most visually interesting part (chart + AI summary card), not the full app. It's an editorial crop — showing just enough to intrigue.
- A very subtle warm glow (amber/copper) emanates from behind the screenshot, creating a sense that the product is generating its own light. This is a single `radial-gradient` behind the image.
- The headline is BELOW the screenshot, not competing with it. The visual hierarchy is: product first, words second.

**What Parcel can take:** The editorial crop idea. Don't show the whole analysis page — show just the verdict badge + cash flow number + risk score in a tight crop. Let the viewer lean in.

### Linear — Hero Viewport Analysis

**What's in the viewport:** Headline left-aligned ("The product development system for teams and agents") occupying the left 50%. The right 50% shows the actual product UI — a project view with issues, activity feed, and sidebar — rendered at actual size, no mockup frame, edges bleeding off the right edge of the viewport.

**Why it works:**
- The product UI literally runs off the edge of the screen. It feels like you're looking through a window into a running app. There's no "this is a screenshot" framing — it's treated as if the app is right there.
- The background is `#08090A` (near-black) and the product UI is dark-themed, so the boundary between "page" and "product" is invisible.
- Zero decoration. No glows, no gradients, no particles. Just typography and product.
- The headline uses a very subtle top-to-bottom opacity gradient — fully opaque "The product development" fading slightly on "system for teams and agents." This creates a sense of depth/atmosphere with pure CSS.

**What Parcel can take:** The bleeding-off-edge technique. A product UI panel that extends beyond the viewport creates a sense of expansiveness — "there's more here than the screen can contain."

### Resend — Hero Viewport Analysis

**What's in the viewport:** Headline "Email for developers" in a massive serif font (unique — most dark SaaS use sans-serif). Right of center, a dark 3D render of a fractured cube floats against the black background. The cube has a dark metallic texture with subtle reflections.

**Why it works:**
- The 3D object is abstract but thematically resonant — a cube being "reassembled" from blocks metaphorically represents "building" emails programmatically.
- The object is dark-on-dark — it doesn't compete with the headline for attention. You notice it, but it doesn't demand focus.
- The serif font is the real hero. In a sea of sans-serif dark SaaS pages, the serif creates instant memorability.

**What Parcel CAN'T take:** The 3D render. This was flagged in the decisions doc — abstract 3D feels random for a RE tool. Parcel isn't a dev tool where abstract art signals technical depth.

### Raycast — Hero Viewport Analysis

**What's in the viewport:** Centered headline "Your shortcut to everything." Below and behind, an abstract pattern of folded red/crimson metallic ribbons, like crumpled foil. Pure black background. The ribbons are rendered in the bottom-right quadrant, creating asymmetric visual weight.

**Why it works:**
- The red ribbons are Raycast's brand color made physical. They're not random — they're the brand identity expressed as a visual texture.
- The asymmetric placement creates tension and interest. The eye goes: headline (center) → ribbons (bottom-right) → CTA buttons (center-bottom). It's a controlled reading path.
- Very few elements. Three things total: headline, subheadline + CTAs, abstract brand element.

**What Parcel can take:** The idea of brand color as ambient visual texture. Parcel's violet (`#8B7AFF`) could exist as a physical presence in the hero — not as a button color, but as light, glow, or atmospheric effect.

### Vercel — Hero Viewport Analysis

**What's in the viewport:** Centered headline "Build and deploy on the AI Cloud." Below, a triangular prism refracting white light into a gradient spectrum (rainbow colors spreading from a central point). Light background.

**Why it works:**
- The prism/gradient is Vercel's visual signature — it represents "taking input and creating output" which maps to their deployment platform.
- It's a single, bold visual element. Not busy. Not cluttered. One powerful image.

**Not directly applicable** — Vercel is light-themed and the prism metaphor doesn't translate to RE analysis.

### Stripe — Hero Viewport Analysis

**What's in the viewport:** Left-aligned headline "Financial infrastructure to grow your revenue." occupying ~60% of the width. Right side: animated gradient ribbons in purple/orange/blue that flow diagonally across the viewport like aurora borealis. Top-left: a live counter showing "Global GDP running on Stripe: 1,630,136,665%" ticking upward.

**Why it works:**
- The gradient ribbons are abstract but feel like flowing money/data — they have directional energy, movement, growth.
- The live counter is genius. It does three things: (1) demonstrates scale, (2) creates visual motion without animation budget, (3) gives the eye a secondary point of interest above the headline.
- Logo parade immediately below the fold (Amazon, Google, Shopify, etc.) answers "who uses this?" before the visitor even asks.

**What Parcel can take:** The live counter concept. An animated metric in the hero — "Deals analyzed" ticking upward, or "Total deal value tracked" — creates both social proof and visual motion with minimal engineering.

---

## Part 2: Why RE Competitor Heroes Feel Cheap

### DealCheck
**Hero:** White/blue gradient background. Headline "Analyze any investment property in seconds." Three device mockups (desktop, tablet, phone) showing the app with stock-photo-style property images visible in the UI.

**Why it feels cheap:**
- The device mockups (desktop + tablet + phone) are the 2016 SaaS playbook. Every cheap landing page template includes this three-device composite.
- Blue gradient background is generic — it could be any SaaS, any industry.
- The stock property images visible inside the mockups create visual noise. Too much happening in too small a space.
- Green CTA button on blue gradient: no brand identity. Generic colors.

### Stessa
**Hero:** White background, left-aligned text, right side shows a mobile phone mockup overlaid on a stock photo of a suburban house with a green lawn.

**Why it feels cheap:**
- The stock house photo immediately categorizes this as "real estate" in the most literal, unimaginative way possible. It's what a template would suggest.
- The phone mockup with the product inside it creates a visual hierarchy problem — the eye goes to the house photo (large, colorful) not the product (small, trapped inside a phone frame).
- "THE #1 APP TO BUY, SELL AND MANAGE" as a pre-heading in blue caps is the kind of self-proclaimed superlative that undermines trust rather than building it.

### Baselane
**Hero:** Warm white/cream background. Left-aligned headline "Financial clarity for every rental property." Right side: full-width stock photo of a middle-aged man smiling while looking at a laptop on a couch.

**Why it feels cheap:**
- The stock photo is the single worst element. This exact photo (smiling person with laptop) appears on hundreds of SaaS landing pages. It's so generic that the brain filters it out as advertising noise.
- The man in the photo has no connection to the product. He could be checking email, browsing Facebook, or doing taxes. The image communicates nothing specific.
- The product is completely absent from the hero viewport. A visitor has no idea what Baselane looks like or does from the first screen.

### Mashvisor
**Hero:** White background with faint blue map pattern. Embedded address search bar ("Enter an address, neighborhood, city or ZIP code") as the primary interactive element. Below: floating UI cards showing property data and a map route illustration.

**Why it's actually the closest to good:**
- The embedded search bar is smart — it invites immediate interaction and communicates the product's UX in one element.
- The floating UI cards tease the product without showing a full screenshot.
- But the execution is mid: the blue/white color scheme, the stock property thumbnail inside one of the floating cards, the trust badges (Trustpilot, Google, BBB) cluttering the hero — it all pulls it back down to mid-market.

### The pattern: What makes RE competitors feel cheaper than premium SaaS

| Element | RE Competitors Do | Premium SaaS Does |
|---------|-------------------|-------------------|
| **Background** | White or blue gradient | Pure black or near-black |
| **Hero visual** | Stock photos, device mockups | Product UI or abstract brand art |
| **Product visibility** | Trapped inside phone/desktop frames | Floating borderless, bleeding off-edge |
| **Typography** | System fonts or generic sans-serif, 16-32px | Custom fonts, 42-54px, gradient/fade effects |
| **Trust signals** | Badges crammed into hero (Trustpilot, BBB) | Minimal or absent from hero, placed below fold |
| **Color** | Blue (#3B82F6) — the default of defaults | Brand-specific accent, used sparingly |
| **Density** | Overstuffed — 6+ elements competing | 3 elements max: headline, visual, CTA |

---

## Part 3: Research Sources — Specific Patterns Found

### Emerging 2026 Patterns (from design trend research)

1. **Gradient Aura / Ambient Glow:** Deep-space colors with luminous accent glows behind key elements. CSS `radial-gradient` or `box-shadow` with large blur radius. Seen on Vercel, Stripe, Pipe. Signals: modern, technical, premium. (Source: enviznlabs.com, kyady.com)

2. **Typography as Hero Element:** Variable fonts with animated weight/width, kinetic text that stretches or fades on scroll, oversized ghost text behind content. The headline itself IS the visual. Seen on Linear, Resend. (Source: reallygooddesigns.com)

3. **Blueprint Grid Backgrounds:** Fine-line grid patterns that create depth and precision. Often animated on scroll or with subtle parallax. Communicates: engineering, precision, data. (Source: codepen.io/sohrabzia, lexingtonthemes.com)

4. **Live Data Tickers:** Real-time or simulated counters showing scale metrics. Creates visual motion and social proof simultaneously. Seen on Stripe ("Global GDP running on Stripe"). (Source: thrivethemes.com)

5. **Product Peek (Reveal on Scroll):** The product UI is partially visible at the bottom edge of the hero, cropped so just the top portion is visible. As the user scrolls, it rises into full view. Creates anticipation. Seen on Linear, Fey. (Source: frontendfyi/rebuilding-linear.app)

### What Awwwards Dark Sites Do

From awwwards.com/websites/dark and award-winning dark sites:
- **Minimal element count:** The best dark hero sections have 2-3 elements, not 6-8. Negative space is the luxury.
- **Motion with purpose:** Subtle ambient animations (floating particles, breathing glows, slow gradient shifts) that run continuously but don't demand attention. They create a feeling of "aliveness" without distraction.
- **Asymmetric composition:** Left-heavy text with right-side visual, or centered text with bottom-anchored visual. Symmetric layouts read as templates.

---

## Part 4: Seven Creative Directions, Ranked

### Direction 1: "The Verdict Emerges" (Animated Metric Reveal)
**RANK: #1 — RECOMMENDED**

**What the user sees:** The hero is centered text (headline, subheadline, CTA) on `#0C0B0A`. Behind and around the text, five faint data fragments — one per strategy — are subtly visible at very low opacity (3-5%). These are actual metric labels from Parcel's analysis output:

- Top-left: `CoC Return  8.4%` (buy & hold)
- Top-right: `Assignment Fee  $28,400` (wholesale)
- Mid-left: `Capital Recycled  94%` (BRRRR)
- Mid-right: `Monthly CF  $1,104` (creative finance)
- Bottom-center: `ROI  44.2%` (flip)

These numbers are rendered in Satoshi at ~18px, in `rgba(240, 237, 232, 0.04)` — barely visible, almost subliminal. They're positioned in a loose constellation around the headline, creating a sense of the product's output enveloping the text.

On page load, a single violet radial glow (`rgba(139, 122, 255, 0.06)`) pulses once from behind the headline — like a scanner sweeping — and as it passes over each metric, that metric briefly increases to 8-10% opacity then fades back to 4%. The effect takes 3 seconds, runs once, and then the hero is static.

Behind everything, a single horizontal line at the vertical center — a thin `1px` gradient from `transparent` → `rgba(139, 122, 255, 0.08)` → `transparent` — spans the full viewport width. This is the only geometric element. It represents the "one address" → connecting all five data points.

**Why it works for Parcel:**
- The five metrics ARE the product. This isn't decoration — it's a preview of actual output the user will get.
- The constellation layout communicates "five strategies" spatially without needing to explain it.
- The numbers are real RE metrics (CoC, CF, ROI, assignment fee) that an experienced investor will recognize instantly. For a new visitor, they're intriguing numbers that create curiosity.
- The single-pulse animation creates a "moment" without being distracting. It says "analysis happening" in a visual language.
- After the animation, the hero is static and clean — no ongoing distraction from the CTA.

**What's animated:** The violet glow pulse (CSS `@keyframes`, 3s, runs once). Each metric's opacity transition (CSS `transition` triggered by class toggle on load, staggered 200ms).

**What's static:** The headline, subheadline, CTA, the connecting horizontal line, the metric text after animation completes.

**Complexity:** CSS + minimal JS. The metrics are `<span>` elements with `position: absolute`, the glow is a `radial-gradient` with `@keyframes` opacity animation, the stagger is `animation-delay`. No React component library needed. ~50 lines of CSS, ~20 lines of JS for the load trigger. **Half-day of work.**

---

### Direction 2: "The Address Line" (Interactive Input as Hero)

**What the user sees:** Centered headline above a prominent address input field. The input is styled as a premium, dark glass-card element (`bg-white/[0.03]`, `border border-white/[0.06]`, large `16px` text, violet focus ring). Placeholder text: `613 N 14th St, Sheboygan, WI 53081` — a real address that types itself character by character on load (typewriter effect, 2s).

Below the input, five small strategy pills arranged horizontally: `Wholesale` `BRRRR` `Buy & Hold` `Flip` `Creative Finance` — each in `bg-white/[0.03]` with a dot indicator. These are static labels, not clickable — they communicate "here's what you'll get" without being interactive.

The CTA button sits at the right end of the input (like a search bar submit): violet gradient, "Analyze" text.

When the typewriter finishes, the input field gets a brief violet border flash (`box-shadow: 0 0 20px rgba(139,122,255,0.15)`) that fades over 1s — as if the analysis is "ready."

**Why it works for Parcel:**
- The address input IS the product experience. Visitors understand immediately: paste an address, get analysis.
- Mashvisor does this on a white background and it works — on Parcel's dark background with premium styling, it would feel like a command terminal. Powerful.
- The typewriter effect creates motion without complexity and demonstrates the UX without a product screenshot.
- The five strategy pills below the input directly communicate "five strategies" from the headline.

**Why it's #2, not #1:** It's smart and functional, but it risks feeling like "a search bar" — which Ivan specifically flagged as lacking creativity. It also places the interactive element in the hero, which means visitors might try typing before reading the headline. The input competes with the headline for attention.

**Complexity:** React component (address input with typewriter effect via `useEffect` + `setInterval`). Strategy pills are static JSX. Violet flash is CSS animation on a class toggle. **3-4 hours.**

---

### Direction 3: "The Five Lines" (Abstract Data Visualization)

**What the user sees:** Behind the centered headline text, five thin lines extend from a single point (center-left of the viewport) outward in different trajectories — like a seismograph or stock chart heartbeat. Each line represents one strategy and uses a slightly different opacity or dash pattern, all in `rgba(240, 237, 232, 0.06)` (barely there cream).

The lines don't have endpoints — they extend off the edges of the viewport, creating an expansive feel. They're not straight; each has a subtle curve or inflection point, suggesting data (a return curve, a cash flow pattern). One line — the "best" strategy — is rendered in `rgba(139, 122, 255, 0.08)` (faint violet) instead of cream.

On load, the lines draw themselves from the origin point outward using SVG `stroke-dashoffset` animation over 2 seconds. After that, they're static.

**Why it works for Parcel:**
- Five lines = five strategies. The visual metaphor is direct without being literal.
- The lines emerging from a single point = "one address." The visual literally illustrates the headline.
- The data-chart aesthetic signals "analysis tool" to investors who look at charts all day.
- The faint violet line standing out from the others hints at "the best strategy" — which is exactly what Parcel identifies.

**Why it's #3:** Beautiful concept, but harder to execute well. Bad line placement will feel like a random squiggle behind the text. Needs careful art direction for the curves to feel like real data rather than decoration. Also purely visual — no product tease.

**Complexity:** SVG with 5 `<path>` elements, `stroke-dasharray`/`stroke-dashoffset` CSS animation. No JS needed for the animation. The paths need to be hand-crafted or generated with a Bezier tool. **Half-day for implementation, extra time for path design.**

---

### Direction 4: "Ghost Numbers" (Oversized Typographic Backdrop)

**What the user sees:** Behind the headline, a massive number is rendered in Satoshi at ~300px font size, in `rgba(240, 237, 232, 0.025)` — essentially invisible unless you're looking for it. The number is `$487/mo` — a specific cash flow figure that represents a real analysis result.

The number is positioned so the dollar sign is partially behind the "F" of "Five" in the headline — creating a layered typographic composition where the ghost number and the headline coexist in the same space.

Below the CTA, a ticker strip scrolls slowly left-to-right with analysis results: `Memphis, TN — 8.4% CoC — Buy & Hold` then `Phoenix, AZ — 14.2% CoC — BRRRR` then `Atlanta, GA — $28,400 fee — Wholesale` — real deal data scrolling like a stock ticker at the bottom of the hero viewport.

**Why it works for Parcel:**
- Fey uses ghost text at 4.7% opacity for their decorative h1. This adapts that pattern with actual product data — a ghost metric instead of ghost text.
- The ticker strip creates continuous subtle motion and demonstrates the product's breadth (multiple cities, multiple strategies) without a screenshot.
- The combination of static ghost number + moving ticker creates visual interest at two scales (macro and micro).

**Why it's #4:** The ghost number is elegant but subtle enough that many visitors won't notice it — which means it doesn't solve the "wall of text" problem for first-time visitors. The ticker strip does more of the heavy lifting. And tickers risk feeling like a stock trading app rather than a RE analysis tool.

**Complexity:** Ghost number is a `<span>` with CSS. Ticker is a CSS `@keyframes translateX` infinite animation on a wide `<div>` containing duplicated items (the seamless loop trick). **2-3 hours.**

---

### Direction 5: "The Map Pulse" (Ambient Geographic Element)

**What the user sees:** Behind the headline, an extremely abstract representation of a US map — not a literal map, but a dot grid arranged in the rough continental shape. Each dot is 2px, `rgba(240, 237, 232, 0.03)`, on `#0C0B0A` background. The dots are so faint they read as texture rather than geography.

On load, five specific dots (representing five cities) pulse with violet glow one at a time, 400ms apart: Memphis → Phoenix → Atlanta → Dallas → Tampa. Each pulse radiates a small `rgba(139, 122, 255, 0.1)` ring that expands and fades. After all five pulse, the map goes static — just the faint dot texture remains.

The visual effect is like a radar sweep finding targets. It communicates: "Parcel works across the US" and "we're analyzing deals in these markets right now."

**Why it works for Parcel:**
- Geographic context is inherent to RE investing. A dot-map is relevant, not decorative.
- The pulse-radar effect ties into the "analysis" theme — scanning, finding, evaluating.
- After the animation, the dot grid becomes ambient texture that creates visual depth without competing with the headline.

**Why it's #5:** Maps are a strong concept but risky in execution. A dot-grid US map could look like a tech conference slide. The dots need to be extremely subtle or they dominate. Also, it requires a data asset (coordinates for the dot grid) that takes time to prepare. And at low opacity, the "map" shape might not register at all — making it pointless.

**Complexity:** Canvas-based or SVG dot grid. Pulse animations via CSS or requestAnimationFrame. The US outline coordinates can be derived from a topojson file. **1-2 days including data preparation.**

---

### Direction 6: "The Gradient Horizon" (Ambient Light Effect)

**What the user sees:** At the bottom of the hero viewport, a wide, low gradient bloom sits at the horizon line — a soft band of violet-to-transparent light, like a sunrise on the horizon of a dark landscape. The gradient extends across the full viewport width but is only ~100px tall. Above it: headline, subheadline, CTA on pure dark. Below it (below the fold): the product screenshot fades into view.

The gradient breathes — its opacity oscillates slowly between 4% and 8% over a 6-second cycle, creating the feeling of a slow pulse or heartbeat.

**Why it works for Parcel:**
- It bridges the hero and the product section below. The light "horizon" draws the eye downward toward the product screenshot below the fold.
- It creates warmth and presence on an otherwise dark page without adding any elements that need explanation.
- The breathing animation creates "aliveness" — the page feels intentional and crafted, not just dark-and-static.
- Vercel and Stripe both use gradient blooms. This approach takes the same technique but makes it darker, more restrained — a horizon line rather than a spray of color.

**Why it's #6:** It's safe and elegant but might not do enough on its own. A gradient at the bottom of the viewport creates visual interest but doesn't communicate anything about the product. If paired with Direction 1 or 4, it would amplify them. Alone, it's insufficient.

**Complexity:** A single `<div>` with `radial-gradient` or `linear-gradient`, plus a CSS `@keyframes` opacity animation. **30 minutes. Pure CSS.**

---

### Direction 7: "The Live Analysis" (Simulated Real-Time Output)

**What the user sees:** Below the headline and CTA, a compact "mini-result" card (not a full screenshot — a purpose-built component) shows a simulated analysis running in real time. The card is ~400px wide, centered, styled like a terminal/card hybrid with dark glass treatment.

On load, the card shows:
```
613 N 14th St, Sheboygan, WI 53081
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Strategy         Buy & Hold
Purchase Price   $142,000
Monthly Rent     $1,450
Cash Flow        ████████░░  $487/mo
CoC Return       ██████░░░░  8.4%
Verdict          ● Good Deal
```

The rows appear one at a time with a typewriter/cascade effect (200ms stagger). The progress bars fill with a smooth animation. The verdict dot turns green when it appears. After 3 seconds, the whole card fades to 20% opacity and a subtle label appears: "Your analysis. Under a minute."

**Why it works for Parcel:**
- It shows the actual product output in a distilled, art-directed form. Not a screenshot — a designed component that previews the experience.
- The cascade animation creates a "watching an analysis happen" moment. It makes the product feel fast and alive.
- The card fades after completing, returning focus to the CTA. It's a demo that gets out of the way.
- The specific numbers (real address, real metrics) make it feel concrete, not hypothetical.

**Why it's #7:** This is dangerously close to "put a product screenshot there" in concept — the difference is that it's a purpose-built hero component, not a screenshot. But it still risks making the hero feel busy. The cascade animation might also feel gimmicky if not timed perfectly. And maintaining this component (making sure the demo numbers make sense) adds ongoing maintenance.

**Complexity:** React component with staggered render via `useEffect` timers or Framer Motion `staggerChildren`. Progress bar fills via CSS `width` transitions. **Half-day to a full day.**

---

## Part 5: The Recommendation

### Go with Direction 1: "The Verdict Emerges" — with Direction 6 as an amplifier.

Here's the full hero specification:

**Layer 1 (furthest back):** `#0C0B0A` background. A single `1px` horizontal gradient line at vertical center of viewport: `linear-gradient(90deg, transparent 10%, rgba(139,122,255,0.08) 50%, transparent 90%)`. This is the "one address" thread connecting everything. Static.

**Layer 2 (behind text):** Five metric fragments positioned in a constellation around the center:
```
Position          Content                    Strategy
top: 25%, left: 12%    CoC Return  8.4%         Buy & Hold
top: 20%, right: 15%   Assignment Fee  $28,400   Wholesale
top: 55%, left: 8%     Capital Recycled  94%     BRRRR
top: 50%, right: 10%   Monthly CF  $1,104        Creative Finance
bottom: 22%, center    ROI  44.2%                Flip
```
Each rendered in Satoshi 300, 14-16px, `rgba(240, 237, 232, 0.04)`. On load, a radial violet glow sweeps from center outward, briefly brightening each metric to `0.10` opacity as it passes (staggered 200ms). Animation completes in 3s, runs once, metrics settle at `0.04`.

**Layer 3 (gradient horizon):** At `bottom: 0` of the hero viewport, a full-width gradient: `radial-gradient(ellipse 60% 40px at 50% 100%, rgba(139,122,255,0.06) 0%, transparent 100%)`. Breathes between `0.04` and `0.08` opacity on a 6s cycle. Bridges hero into the product section below.

**Layer 4 (foreground — text):** Centered headline "Five strategies. One address. Under a minute." in Satoshi 300, `clamp(32px, 5vw, 54px)`, with the Parcel vertical fade gradient (full opacity at top, ~60% at bottom). Subheadline below in Satoshi 300, 18px, `text-text-secondary`. CTA button below in violet gradient. Standard spacing.

**Total element count:** 3 visual layers + text. Feels rich but not cluttered. Every element has a reason.

**Implementation roadmap:**
1. CSS layer 1 (gradient line): 10 minutes
2. CSS layer 3 (breathing gradient): 20 minutes
3. JSX + CSS layer 2 (metric constellation): 1 hour
4. JS load animation (glow sweep + stagger): 1 hour
5. Responsive breakpoints (reposition metrics for mobile, or hide them): 30 minutes
6. Total: **~3 hours**

**Mobile treatment:** On screens < 768px, hide the metric constellation entirely. The hero becomes: headline + subheadline + CTA + breathing gradient. The metrics are a desktop enhancement, not load-bearing content. This keeps mobile fast and clean.

---

## Complexity Summary

| Direction | Concept | Complexity | Time | Verdict |
|-----------|---------|-----------|------|---------|
| 1. Verdict Emerges | Metric constellation + glow sweep | CSS + 20 lines JS | 3 hours | **Recommended** |
| 2. Address Line | Interactive input + typewriter | React component | 3-4 hours | Strong alternative |
| 3. Five Lines | SVG data-line animation | SVG + CSS | 4-6 hours | Beautiful but risky |
| 4. Ghost Numbers | Oversized backdrop text + ticker | CSS | 2-3 hours | Subtle, needs pairing |
| 5. Map Pulse | Dot-grid US + radar pulse | Canvas/SVG + data | 1-2 days | Overengineered |
| 6. Gradient Horizon | Breathing violet gradient band | Pure CSS | 30 min | Best as amplifier |
| 7. Live Analysis | Simulated result card cascade | React + Framer Motion | 4-8 hours | Risks feeling busy |
