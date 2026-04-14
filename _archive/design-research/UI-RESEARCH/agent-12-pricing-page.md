# Agent 12 — Pricing Page Design Research

> The pricing page is the highest-intent page in any SaaS product. Users who land here
> have already decided they might pay — the page's job is to remove doubt, not create desire.
> This document covers patterns from Stripe, Linear, Vercel, and Notion, plus conversion
> research specific to Parcel's two-tier model (Free $0 / Pro $69/mo, $55/mo annual).

---

## 1. Tier Architecture: 2-Tier vs 3-Tier Display

### Industry Pattern
Paddle/ProfitWell retention data (2025) shows SaaS companies with three visible tiers
convert at 1.4x the rate of two-tier pages and 1.8x the rate of four-or-more-tier pages.
The reason is the **center-stage effect** — when presented with three options, people
disproportionately choose the middle one (documented across behavioral economics studies
and confirmed by Paddle's 2025 pricing studies).

### What the Inspirations Do
| Company | Visible Tiers | Highlighted Tier | "Contact Sales" Tier |
|---------|--------------|------------------|---------------------|
| Stripe  | 3 (Starter, Growth, Enterprise) | Growth | Enterprise |
| Linear  | 3 (Free, Plus, Enterprise) | Plus | Enterprise |
| Vercel  | 3 (Hobby, Pro, Enterprise) | Pro | Enterprise |
| Notion  | 4 (Free, Plus, Business, Enterprise) | Business | Enterprise |

Every one of these products ships a free tier but still displays 3+ columns. The
enterprise/contact-sales column serves as a **price anchor** — it makes the mid-tier
feel reasonable by comparison, even if very few visitors click "Contact sales."

### Parcel Recommendation
Display **three columns**: Free, Pro (highlighted), and "Team" (coming soon / contact).
The Team column acts as an anchor and a signal that Parcel is built for growth. Even if
Team is not yet available, showing "Coming Q3 2026" or "Contact us" creates the anchoring
effect and prevents the page from looking like a binary free-or-paid ultimatum.

**Current implementation note:** The existing `constants.ts` already defines three tiers
(Free, Pro, Team) and `pricing.tsx` renders them in a 3-column grid. This structure is
correct. The prices need updating to match the actual pricing ($69/mo Pro, not $29).

---

## 2. "Most Popular" / "Recommended" Badge

### Industry Pattern
- **Stripe:** Uses "Recommended" text label above the Growth tier name, no pill/badge.
- **Linear:** Uses a subtle filled pill badge reading "Popular" in accent color.
- **Vercel:** Highlights Pro with a brighter border and accent-colored CTA; no explicit badge text.
- **Notion:** Uses "Most popular" text above Business tier name.

### Design Spec for Parcel
The existing implementation uses `text-[10px] font-bold uppercase tracking-[0.08em]
text-accent-primary` for a "Most popular" label above the Pro tier name. This is
the correct approach — a small uppercase label in the brand accent color, positioned
inside the card above the tier name.

**Enhancement:** Add a second micro-label below "Most popular" reading
**"14-day free trial"** in `text-accent-success` to reinforce the low-risk entry point
directly at the badge location. This colocation of social proof + trial callout at the
eye-catch point is a pattern used by Loom and Notion.

---

## 3. Monthly / Annual Toggle

### Industry Pattern
The toggle between monthly and annual billing is near-universal across top SaaS pricing
pages. Key UX findings:

1. **Pill toggle > Tab toggle > Radio buttons.** A rounded pill with two segments
   (Monthly | Annual) is the most common and highest-converting pattern.
2. **Annual savings callout** belongs inside or adjacent to the "Annual" option, not
   floating elsewhere. Help Scout, Linear, and Notion all show the discount percentage
   right next to the annual label.
3. **Animated price transition** — when toggling, prices should animate (fade or slide)
   rather than hard-swap. This signals that something changed and draws the eye back
   to the price. Prevents the user from missing the update.
4. **Default state:** A/B tests from ProfitWell show that defaulting to annual billing
   increases annual plan uptake by 15-20%. However, this can feel manipulative if the
   monthly price is significantly higher. For Parcel ($69 vs $55), the gap is modest
   enough to default to monthly (more transparent) and let the savings badge pull
   users to annual.

### Current Implementation Assessment
The existing toggle in `pricing.tsx` is well-built:
- Pill-style segmented control with accent-primary active state
- "Save 20%" green badge next to "Annual"
- `AnimatePresence` with y-axis slide transition on price change
- Defaults to monthly (good — transparent)

**Refinement:** The savings badge currently says "Save 20%". With the actual pricing
($69/mo vs $55/mo annual = $660/yr vs $828/yr), the annual savings are ~20%. Keep the
percentage, but consider also showing the absolute dollar amount: **"Save $168/yr"** as a
secondary line. Dollar amounts feel more concrete than percentages for a $69/mo product.

---

## 4. Price Display and Anchoring

### Psychological Anchoring for $69/mo
$69/mo sits in a critical zone — it is above the "impulse buy" threshold ($20-30/mo)
but below the "need manager approval" threshold ($100+/mo). The key challenge: making
$69 feel proportional to the value delivered.

**Anchoring tactics used by top SaaS:**

1. **"Less than the cost of..." framing.** For real estate investors, $69/mo is less than
   one hour of a property manager's time, or 0.03% of a single deal's value. This
   reframing belongs near the price, not buried in FAQs.

2. **Strikethrough on annual.** Show `$69` with a strikethrough next to `$55/mo` when
   annual is selected. The visual of a crossed-out higher price triggers loss aversion.

3. **Per-deal framing.** "Analyze unlimited deals for $2.30/day" — breaking the price
   into smaller units (per day, per deal) reduces perceived cost.

### Price Display Component Spec
```
[Large, JetBrains Mono]  $69        [muted] / per month
[When annual is active:]
[Large, JetBrains Mono]  $55        [muted] / per month, billed annually
[Strikethrough, smaller]  $69       [green badge] Save $168/yr
```

The price should be the largest text element in the card — `text-4xl font-bold font-mono`
(as currently implemented). The period text should be `text-xs text-text-muted` to create
strong visual hierarchy between the number and its qualifier.

---

## 5. Feature Comparison

### Three-Layer Pattern (Used by Stripe, Vercel, Notion)

**Layer 1 — Card features (5-8 items per tier).** These appear directly on the pricing
cards. Nobody reads 30 features before clicking a CTA. They scan 5-8 to confirm the plan
has what they need. Use green checkmark icons (as currently implemented).

**Layer 2 — "Compare all features" expandable table.** Below the pricing cards, a full
comparison table with sticky column headers. This catches the detail-oriented buyer who
wants to verify every line item before committing. Organize features into collapsible
category groups:

| Category          | Features to Compare                              |
|-------------------|--------------------------------------------------|
| Deal Analysis     | Analyses/month, strategy types, AI chat depth    |
| Pipeline          | Max deals, sharing, kanban columns               |
| Documents         | Uploads/month, AI extraction, storage            |
| AI Features       | Offer letters, market analysis, chat history     |
| Export & Sharing  | PDF reports, deal sharing links, custom branding |
| Support           | Response time, priority queue, onboarding call   |

**Layer 3 — Tooltips on advanced terms.** Vercel adds `(?)` tooltip icons next to
features like "Edge Middleware Invocations." Parcel should do the same for real estate
terms that casual investors might not know (e.g., "BRRRR Analysis" could tooltip to
"Buy, Rehab, Rent, Refinance, Repeat — a strategy for recycling capital").

### Visual Pattern
- Checkmarks: `Check` icon from Lucide in `text-accent-success` (already implemented)
- Excluded features: Em-dash `—` in `text-text-muted`, never a red X (avoid negative framing)
- Quantified features: Show the actual limit — "5 analyses/mo" not just a checkmark

---

## 6. CTA Button Hierarchy

### Industry Pattern
Every inspiration uses a clear visual hierarchy between tier CTAs:

| Tier | Button Style | Copy |
|------|-------------|------|
| Free | Ghost/outline, secondary color | "Get started" / "Start free" |
| Pro (highlighted) | Solid fill, primary accent color | "Start free trial" / "Try Pro free" |
| Enterprise | Ghost/outline, secondary color | "Contact sales" / "Talk to us" |

The highlighted tier's CTA should be the **only solid-fill, accent-colored button** on
the page. All other tier CTAs use outline/ghost variants. This creates an unmistakable
visual funnel toward the desired action.

### CTA Copy Optimization
- Avoid "Buy now" or "Subscribe" — these imply immediate payment.
- "Start your 14-day free trial" is optimal because it:
  - Names the trial length (reduces uncertainty)
  - Says "free" (reduces risk perception)
  - Uses "your" (ownership language, personalization)
- Below the CTA, add a micro-reassurance line: **"No credit card required"** in
  `text-xs text-text-muted`. This single line can lift trial starts by 10-15% according
  to SaaS conversion benchmarks.

### Parcel CTA Spec
```
Free tier:    [outline button]  "Start free"         → /register
Pro tier:     [solid indigo]    "Start 14-day trial" → /register?plan=pro
Team tier:    [outline button]  "Contact us"         → mailto:...
```
All three buttons should be `w-full` (already implemented). The Pro button gets
`bg-accent-primary hover:bg-accent-hover text-white` (already implemented). Add the
"No credit card required" line beneath the Pro CTA only.

---

## 7. Social Proof Placement

### Research Finding
Landing pages with social proof elements convert 34% better than those without. On
pricing pages specifically, testimonials placed within visual proximity of CTA buttons
lift conversions by 10-20%.

### Pattern from Inspirations
- **Stripe:** Logo bar of companies using Stripe, placed above pricing cards.
- **Linear:** "Trusted by [company logos]" strip between header and cards.
- **Vercel:** Customer logos in a muted row, plus a testimonial carousel below pricing.
- **Notion:** User count ("Used by 30M+ people") as a stat, plus logo bar.

### Parcel Social Proof Strategy (3 layers)

**Layer 1 — Stats strip (above cards):**
Use the existing `STATS` array from `constants.ts` — "$840M deal value tracked",
"2,400+ deals analyzed", "48 markets covered", "4.9 rating". Display as a horizontal
row of 4 stats with muted icons, centered above the pricing cards. This is already
built on the landing page; repurpose the component.

**Layer 2 — Testimonial card (below cards):**
A single, high-impact testimonial from a real estate investor, placed between the
pricing cards and the FAQ. Format:

```
"Parcel paid for itself on my first deal. The BRRRR calculator alone
saved me from a property that looked good on paper but would have
been negative cash flow after the refi."

— [Name], [Role], [City]        [optional headshot]
```

Testimonials with photos generate better recall than text-only. Use a real investor
quote (or a realistic placeholder until one is collected). The quote should mention
a specific feature and a concrete outcome — this addresses price objection directly.

**Layer 3 — "No credit card required" + money-back guarantee (at CTA level):**
Micro-copy directly beneath the Pro CTA button. This is not traditional social proof
but functions the same way — it reduces perceived risk at the moment of decision.

---

## 8. FAQ Section

### Why It Matters
Pricing pages have the highest bounce rate of any SaaS page. FAQs catch users who have
a specific objection or question that, if unanswered, causes them to leave. A well-crafted
FAQ section can reduce support tickets by 30% and increase conversion by addressing
last-minute hesitations.

### FAQ Design Spec
Place the FAQ section below the feature comparison table, above the final CTA. Use an
accordion pattern (click to expand) with smooth `AnimatePresence` height transitions.

**Recommended questions for Parcel:**

1. **"What happens after my 14-day trial ends?"**
   Your account reverts to the Free plan. You keep all your data — nothing is deleted.
   Upgrade again anytime.

2. **"Can I cancel anytime?"**
   Yes. No contracts, no cancellation fees. Cancel from your Settings page in two clicks.

3. **"What counts as a 'deal analysis'?"**
   Each time you run a calculator (BRRRR, Wholesale, Flip, Buy & Hold, or Creative
   Finance) on a property, that counts as one analysis. Re-running the same property
   with different numbers does not count as a new analysis.

4. **"Do you offer refunds?"**
   Yes, we offer a 30-day money-back guarantee. If Pro isn't right for you, email us
   within 30 days for a full refund.

5. **"Is my data secure?"**
   All data is encrypted in transit (TLS 1.3) and at rest. We never share or sell
   your data. Your deal information is yours.

6. **"Can I upgrade or downgrade at any time?"**
   Yes. Upgrades take effect immediately. Downgrades take effect at the end of your
   current billing period.

### Component Pattern
```tsx
// Accordion item with Framer Motion
<button onClick={toggle} className="w-full flex justify-between items-center py-4 text-left">
  <span className="text-sm font-medium text-text-primary">{question}</span>
  <ChevronDown className={cn("transition-transform", open && "rotate-180")} />
</button>
<AnimatePresence>
  {open && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="overflow-hidden"
    >
      <p className="text-sm text-text-secondary pb-4">{answer}</p>
    </motion.div>
  )}
</AnimatePresence>
```

---

## 9. Free Tier Presentation (Without Making It Feel "Lesser")

### The Problem
If the free tier looks like a stripped-down afterthought, users feel they are being
punished for not paying. This creates resentment, not motivation to upgrade. Notion
handles this well — their Free tier is described as "For organizing every corner of
your work & life" rather than "Basic" or "Limited."

### Tactics for Parcel

1. **Positive naming.** Call it "Free" not "Starter" or "Basic." The word "free" is
   a conversion accelerant. Never use "Limited" anywhere in the tier.

2. **Lead with what is included, not what is missing.** The free tier card should list
   its features as affirmative statements:
   - "5 deal analyses per month"
   - "Full pipeline up to 10 deals"
   - "AI-powered chat assistant"
   - "PDF deal reports"

   Never say "No offer letters" or "No document AI" on the Free card. The absence is
   communicated by the Pro card listing those features — the user infers the difference.

3. **Same card height.** All tier cards should be the same height (use `flex` stretch or
   a min-height). A shorter Free card visually signals inferiority. Pad the Free card
   with a "Perfect for getting started" summary line or an extra whitespace block to
   match the Pro card's height.

4. **Friendly CTA.** "Start free" is better than "Sign up" — it implies action and value
   rather than administrative process. The current implementation uses "Start free" which
   is correct.

5. **Upgrade path language.** Inside the Free card (at the bottom, below features), add
   a muted line: "Need more? Upgrade to Pro anytime." This positions upgrading as a
   natural progression, not a sales push.

---

## 10. Trial Callout Design

### Banner Pattern
A trial callout banner should appear in one of two positions:

**Option A — Inline on Pro card (preferred for Parcel):**
Inside the Pro card, between the features list and the CTA button, add a highlighted
micro-banner:

```
[accent-success bg at 10% opacity, rounded-lg, px-3 py-2]
"Try all Pro features free for 14 days. No credit card required."
```

This keeps the trial information at the decision point. It does not require a separate
banner component and avoids the "banner blindness" that full-width callouts suffer from.

**Option B — Full-width banner above cards:**
A horizontal banner spanning the full width of the pricing section, above the card grid:

```
[border-accent-primary/30 bg-accent-primary/5 rounded-xl px-6 py-4]
[Sparkle icon] "Not sure yet? Start your 14-day Pro trial — no credit card needed."
[CTA: "Start trial" button, small, accent-primary]
```

This works well for pricing pages that receive direct traffic (from ads, emails, etc.)
where the user may not have seen the Pro card yet.

### Parcel Recommendation
Use **Option A** (inline on Pro card). The Parcel pricing section is compact — three
cards on one screen. A full-width banner adds visual noise without adding new information.
The inline callout inside the Pro card is more targeted and converts better because it
appears at the exact moment the user is evaluating the Pro tier.

---

## 11. Mobile Pricing Page Design

### Research Data
- 78% of SaaS pricing pages stack cards vertically on mobile (the correct approach)
- Mobile accounts for 58% of pricing page traffic in 2026
- Simplified, mobile-optimized pricing pages increase conversion rates by 10%

### Mobile Layout Spec for Parcel

**Card stacking order:** Pro (highlighted) first, then Free, then Team. On mobile, the
first card visible without scrolling should be the desired conversion target. Showing
the Free tier first on mobile means users see the $0 option and may never scroll down
to Pro. Reverse the order on mobile:

```tsx
// Mobile: Pro first, Free second, Team third
// Desktop: Free, Pro, Team (left to right)
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  {/* On mobile, use order classes */}
  <FreeCard className="order-2 md:order-1" />
  <ProCard className="order-1 md:order-2" />
  <TeamCard className="order-3" />
</div>
```

**Sticky CTA:** On mobile, once the user scrolls past the Pro card, show a sticky
bottom bar with the Pro CTA:

```
[fixed bottom-0, bg-app-bg/90 backdrop-blur-sm, border-t border-border-subtle, p-4]
"Pro — $69/mo"  [solid indigo button: "Start 14-day trial"]
```

This bar should only appear when the Pro card is scrolled out of viewport (use
`IntersectionObserver`). It disappears when the Pro card is back in view. The bar
must not obscure content — give it 44px+ height for tap targets and add padding-bottom
to the page content to prevent overlap.

**Feature comparison on mobile:** Replace the comparison table with a single-column
layout. Show one tier at a time with a tab switcher (Free | Pro | Team) at the top.
Each tab shows that tier's full feature list. This avoids horizontal scrolling and
keeps the comparison focused.

**FAQ on mobile:** Full-width accordion, same as desktop. Ensure touch targets are
at least 44x44px. The accordion works naturally on mobile — no changes needed beyond
ensuring the question text does not truncate.

---

## 12. Full-Page Layout Spec (Top to Bottom)

### Section Order (Optimized for Conversion)

```
1. Section Header
   - Eyebrow: "Pricing" (accent color, uppercase, tracked)
   - Headline: "Five free analyses. Upgrade when you close."
   - Subhead: "No annual contracts. No per-deal fees. Cancel any time."
   - [Monthly | Annual toggle with "Save 20%" badge]

2. Stats Strip (optional, social proof)
   - "$840M+ tracked" | "2,400+ deals" | "48 markets" | "4.9 rating"
   - Horizontal row, muted icons, centered
   - 16px gap below toggle, 24px gap above cards

3. Pricing Cards (3-column grid)
   - Free | Pro (highlighted, "Most popular" + ambient glow) | Team
   - Each card: name, description, price, features (5-8), CTA
   - Pro card: inline trial callout above CTA
   - Pro CTA: "Start 14-day trial" + "No credit card required" micro-copy
   - Equal card heights via flex stretch

4. Feature Comparison Table (expandable)
   - "Compare all features" toggle button, collapsed by default
   - Sticky header row with tier names
   - Category groups: Deal Analysis, Pipeline, Documents, AI, Export, Support
   - Checkmarks, dashes, and quantity values

5. Testimonial
   - Single high-impact quote from a real estate investor
   - Photo, name, role, city
   - Centered, max-w-2xl

6. FAQ Accordion
   - 6 questions covering trial, cancellation, billing, data, definitions
   - Framer Motion height animation
   - Divider lines between items

7. Final CTA (full-width)
   - "Start analyzing deals today"
   - "Your first 5 analyses are free. No credit card needed."
   - [Primary button: "Get started free"]
   - Ambient radial glow behind (matches design brief for FinalCTA)
```

### Spacing and Sizing Reference
```
Section padding:        py-24 px-6
Max content width:      max-w-5xl (1024px) — matches current implementation
Card grid gap:          gap-4 (16px) — could increase to gap-6 (24px) for breathing room
Card padding:           p-6 (24px)
Card border radius:     rounded-2xl (16px)
Price font size:        text-4xl font-mono (JetBrains Mono)
Feature text:           text-xs (12px)
CTA button height:      h-10 (40px) minimum, h-11 (44px) preferred for mobile
Checkmark icon:         12px, text-accent-success
Section gaps:           space-y-14 between major sections (header, cards, comparison, etc.)
```

---

## 13. Conversion Micro-Optimizations

### Evidence-Based Tactics

1. **Loss aversion framing.** On the annual toggle, show "You save $168/year" rather
   than "20% off." Dollar amounts trigger stronger loss aversion than percentages for
   mid-range SaaS pricing.

2. **Social proof near CTA.** Place "Trusted by 2,400+ investors" or a mini-logo bar
   directly above or below the pricing cards. Proximity to the CTA increases its
   effect by 10-20%.

3. **"No credit card required" on Pro CTA only.** This micro-copy reduces trial
   friction by 10-15%. Do not place it on the Free CTA (free signup never needs a
   card, so the reassurance is redundant and looks odd).

4. **Feature anchoring.** List the highest-value Pro features first: "Unlimited deal
   analyses" and "AI offer letter generator" before "Priority support." Lead with
   differentiated value, not commodity features.

5. **Decoy pricing.** The Team tier at $99/mo (or higher) makes Pro at $69 feel
   proportionally cheaper. Even if Team is "coming soon," its visible price creates
   the anchoring effect. If Team pricing is not finalized, use "$99/mo" or "Custom"
   — either works for anchoring.

6. **Per-unit reframing.** Below the Pro price, add a muted line:
   "Less than $2.30/day — less than your morning coffee." Per-day pricing reframing
   reduces sticker shock for the $69/mo price point.

7. **Urgency without pressure.** Avoid countdown timers or "limited time" language —
   these feel predatory for a professional tool. Instead, use positive urgency:
   "Your trial starts the moment you sign up" implies immediacy without manufactured
   scarcity.

8. **Exit-intent consideration.** If implementing a dedicated `/pricing` page (not just
   the landing page section), consider a subtle exit-intent modal for users who scroll
   to the bottom and begin to leave: "Still deciding? Start with 5 free analyses — no
   commitment." This catches bouncing visitors who were interested but not ready.

---

## 14. Animation Spec (Framer Motion)

### Card Entrance
```tsx
initial={{ opacity: 0, y: 16 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true, margin: '-40px' }}
transition={{ duration: 0.4, delay: i * 0.07 }}
```
Already implemented. The stagger delay of 0.07s per card is appropriate.

### Card Hover
```tsx
whileHover={{ y: -4 }}
whileTap={{ scale: 0.98 }}
```
Already implemented. The `-4` lift is subtle enough not to break layout.

### Price Toggle Animation
```tsx
<AnimatePresence mode="wait">
  <motion.span
    key={isAnnual ? 'annual' : 'monthly'}
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 8 }}
    transition={{ duration: 0.2 }}
  />
</AnimatePresence>
```
Already implemented. The vertical slide (y: -8 to 0, exit to y: 8) is the correct
pattern — it implies the price is "rolling" like a counter.

### FAQ Accordion
```tsx
initial={{ height: 0, opacity: 0 }}
animate={{ height: "auto", opacity: 1 }}
exit={{ height: 0, opacity: 0 }}
transition={{ duration: 0.25, ease: "easeInOut" }}
```

### Feature Table Expand
```tsx
initial={{ height: 0, opacity: 0 }}
animate={{ height: "auto", opacity: 1 }}
transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
```
Use a custom ease curve for the table expansion — it should feel weighty (slow start,
fast end) to communicate that a significant amount of content is being revealed.

---

## RECOMMENDATIONS FOR PARCEL

### Priority 1 — Fix Pricing Data (5 min)
Update `constants.ts` to reflect actual pricing: Pro at $69/mo (not $29), annual at
$55/mo ($660/yr). Update `ANNUAL_PRICES` in `pricing.tsx` accordingly. This is a
data-only change with no design implications.

### Priority 2 — Add Trial Micro-Copy (15 min)
Add "No credit card required" below the Pro CTA button and "14-day free trial" as a
second line below the "Most popular" badge. These two lines of text are the
highest-ROI conversion additions based on SaaS benchmarks.

### Priority 3 — Add FAQ Accordion (1-2 hr)
Build a `PricingFAQ` component with 6 questions using Framer Motion accordion pattern.
Place it below the pricing cards. This catches users with specific objections who would
otherwise bounce. Reuse the same section styling (max-w-5xl, py-24 px-6).

### Priority 4 — Mobile Card Reordering (30 min)
Use Tailwind `order-` utilities to show Pro card first on mobile. Add a sticky bottom
CTA bar that appears when the Pro card scrolls out of viewport. Use
`IntersectionObserver` to toggle visibility.

### Priority 5 — Feature Comparison Table (2-3 hr)
Build a collapsible "Compare all features" section below the cards. Organize features
into 6 categories with sticky tier headers. Use checkmarks, dashes, and quantity values.
This is important for high-intent visitors doing detailed evaluation.

### Priority 6 — Testimonial Section (1 hr)
Add a single testimonial between the pricing cards and FAQ. Use a real investor quote
(or placeholder). Include photo, name, and city. Center-aligned, max-w-2xl.

### Priority 7 — Annual Savings Enhancement (15 min)
Show both percentage ("Save 20%") and absolute dollar amount ("$168/yr") on the annual
toggle. Add strikethrough on the monthly price ($69) when annual is selected, showing
the effective monthly price ($55) next to it.

### Priority 8 — Dedicated /pricing Route (1 hr)
Create a standalone `/pricing` page that can be linked from the app navbar, marketing
emails, and external campaigns. This page should include all sections from the layout
spec (section 12) — the landing page pricing section is a condensed version, while the
dedicated page is the full experience with stats, comparison table, testimonial, FAQ,
and final CTA.

### What NOT to Change
- The 3-column grid layout is correct — keep it.
- The pill-style monthly/annual toggle is correct — keep it.
- The ambient glow on the Pro card is correct — keep it.
- The `AnimatePresence` price animation is correct — keep it.
- Defaulting to monthly billing is correct — keep it (transparency over optimization).
