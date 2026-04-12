# Typography & Styling Audit

> Comprehensive audit of background colors, typography, violet color discipline, and emotional
> word placement across the Parcel Platform landing page.
>
> Date: 2026-04-09
> Status: Research document -- no code changes

---

## Table of Contents

1. [Background Color Audit](#1-background-color-audit)
2. [Typography Audit -- All Sections](#2-typography-audit--all-sections)
3. [Typography Recommendations](#3-typography-recommendations)
4. [Violet (#8B7AFF) Color Discipline Audit](#4-violet-8b7aff-color-discipline-audit)
5. [Emotional Word Placement Analysis](#5-emotional-word-placement-analysis)

---

## 1. Background Color Audit

### Frame Background Sampling

Sampled from `frame_0001.webp` corners using Python Pillow:

| Sample Point       | RGB         | Hex       |
|--------------------|-------------|-----------|
| Top-left           | (2, 2, 2)   | `#020202` |
| Top-right          | (12, 10, 14)| `#0C0A0E` |
| Bottom-left        | (5, 3, 1)   | `#050301` |
| Bottom-right       | (6, 5, 1)   | `#060501` |
| Center-left edge   | (1, 0, 2)   | `#010002` |
| Center-right edge  | (3, 4, 1)   | `#030401` |

Additional frames:

| Frame   | Top-left  | Top-right |
|---------|-----------|-----------|
| Frame 60  | `#010101` | `#0A0A0C` |
| Frame 121 | `#020202` | `#0C090C` |

**Average frame background:** ~RGB(3, 3, 3)

### Current Page Background

`#0C0B0A` = RGB(12, 11, 10)

### The Problem

The frame backgrounds average around RGB(3,3,3) -- nearly pure black. The page background at
RGB(12,11,10) is noticeably brighter. The delta is ~10 RGB points -- enough to create a visible
seam between the video canvas and the page. The gradient overlays help but do not fully solve
this since the base colors differ.

### Recommended Fix

Set the hero sticky container background to `#020202` (matching the frames closely). Keep
`#0C0B0A` as the rest-of-page background. Invert the bottom gradient:

- Hero container `bg`: `#020202`
- Bottom gradient overlay: fades from `transparent` to `#0C0B0A`

This is the **single highest-impact visual fix available**. The existing bottom gradient already
handles the transition between hero and page content -- just changing the hero base color and
reversing the gradient direction eliminates the seam without touching the design system's warm
dark feel elsewhere.

```css
/* Hero sticky container */
.hero-container {
  background-color: #020202;
}

/* Bottom gradient overlay -- fades INTO the page background */
.hero-bottom-gradient {
  background: linear-gradient(to bottom, transparent, #0C0B0A);
}
```

---

## 2. Typography Audit -- All Sections

### Exhaustive Usage Inventory

#### Hero Section

| Element    | Font    | Weight | Size                          | Line-height | Tracking   | Color           |
|------------|---------|--------|-------------------------------|-------------|------------|-----------------|
| H1         | Satoshi | 300    | 30px -> 56px (clamp via text-3xl/4xl/5xl/[56px]) | 1.1 | -0.03em | `#F0EDE8`       |
| Subhead    | Inter   | 400    | 16px (text-base/lg)           | 1.6         | default    | `#A09D98`       |
| CTA button | Inter   | 500    | 16px                          | default     | default    | `#F0EDE8` on violet gradient |
| Disclaimer | Inter   | 400    | 11px                          | default     | default    | `#A09D98` at 60% opacity |

- **Hierarchy:** Strong -- headline clearly dominant, subhead recedes, CTA draws the eye via color contrast.
- **Issue:** Headline has no explicit bottom margin besides `mt-4` on the subhead. Could use more vertical breathing room between H1 and subhead.

#### StatsStrip

| Element | Font    | Weight | Size               | Tracking | Color     |
|---------|---------|--------|--------------------|----------|-----------|
| Numbers | Satoshi | 300    | 36px -> 48px (text-4xl/5xl) | -0.02em | `#F0EDE8` |
| Labels  | Inter   | 400    | 14px (text-sm)     | default  | `#A09D98` |

- **Hierarchy:** Good -- numbers dominate, labels are secondary.
- **Breathing room:** Adequate (`py-16` section padding).

#### ProblemSection

| Element | Font    | Weight | Size                     | Line-height | Tracking | Color     |
|---------|---------|--------|--------------------------|-------------|----------|-----------|
| H2      | Satoshi | 300    | 24px -> 32px (text-2xl/[32px]) | 1.3    | -0.02em  | `#F0EDE8` |
| Body    | Inter   | 400    | 16px (text-base)         | default     | default  | `#7A7872` |

- **Hierarchy issue:** 32px is the same visual weight as other section headlines. As the emotional tension point, it should feel MORE impactful. Consider 36-40px.
- **Breathing room:** Section has `py-24 md:py-32`, `max-w-[640px]` -- generous.

#### ProductPreview

| Element  | Font    | Weight | Size                     | Tracking | Color     |
|----------|---------|--------|--------------------------|----------|-----------|
| Eyebrow  | Inter   | 500    | 11px, uppercase          | 0.08em   | `#7A7872` |
| H2       | Satoshi | 300    | 30px -> 40px (text-3xl/[40px]) | -0.02em | `#F0EDE8` |
| Body     | Inter   | 400    | 16px                     | default  | `#A09D98` |

- **Hierarchy:** Good -- eyebrow -> headline -> body in descending order.
- **Breathing room:** `mb-12 md:mb-16` after header -- generous.

#### HowItWorks

| Element           | Font    | Weight | Size                     | Tracking | Color     |
|-------------------|---------|--------|--------------------------|----------|-----------|
| Eyebrow           | Inter   | 500    | 11px, uppercase          | 0.08em   | `#A09D98` |
| H2                | Satoshi | 300    | 36px -> 40px (text-3xl/4xl) | -0.02em | `#F0EDE8` |
| Step numbers      | Inter   | 500    | 11px                     | default  | `#A09D98` |
| Step titles       | Satoshi | 300    | 20px (text-xl)           | default  | `#F0EDE8` |
| Step descriptions | Inter   | 400    | 14px (text-sm)           | default  | `#A09D98` |

- **Hierarchy:** Clear 4-level cascade.
- **Breathing room:** `mb-16` after H2 -- good.

#### StrategyTabs

| Element     | Font    | Weight | Size               | Tracking | Color     |
|-------------|---------|--------|--------------------|----------|-----------|
| Eyebrow     | Inter   | 500    | 11px, uppercase    | 0.08em   | `#7A7872` |
| H2          | Satoshi | 300    | 30px -> 40px       | -0.02em  | `#F0EDE8` |
| Tab labels  | Inter   | 500    | 12-14px            | default  | varies    |
| KPI values  | Satoshi | 300    | 20px (text-xl)     | default  | `#F0EDE8` |
| AI summaries| Inter   | 400    | 14px               | default  | `#A09D98` |

- **Hierarchy:** Solid -- H2 dominates, tabs provide navigation, content is secondary.
- **Issue:** `mb-12` after H2 could use `mb-16` for more air.

#### AINarrativeDemo

| Element     | Font    | Weight | Size               | Tracking | Color              |
|-------------|---------|--------|--------------------|-----------|--------------------|
| Eyebrow     | Inter   | 500    | 11px, uppercase    | 0.08em   | `#7A7872`          |
| H2          | Satoshi | 300    | 30px -> 40px       | -0.02em  | `#F0EDE8`          |
| Typing text | Inter   | 400    | 16px               | default  | `#F0EDE8`          |
| Badge       | default | medium | default            | default  | `#6DBEA3` (success green) |
| Subtext     | Inter   | 400    | 14px               | default  | `#7A7872`          |

- **Hierarchy:** H2 is the clear focal point; glass card is the interaction peak.
- **Breathing room:** `mb-12` after H2 -- adequate.

#### PricingSection

| Element      | Font    | Weight | Size               | Tracking | Color                  |
|--------------|---------|--------|--------------------|----------|------------------------|
| Eyebrow      | Inter   | 500    | 11px, uppercase    | 0.08em   | `#A09D98`              |
| H2           | Satoshi | 300    | 36px -> 40px       | -0.02em  | `#F0EDE8`              |
| Tier names   | Satoshi | 300    | 22px               | default  | `#F0EDE8`              |
| Prices       | Satoshi | 300    | 36px               | default  | `#F0EDE8`              |
| Period       | Inter   | 400    | 14px               | default  | `#A09D98`              |
| Features     | Inter   | 400    | 14px               | default  | `#F0EDE8` at 80% opacity |

- **Hierarchy:** Strong -- price is the dominant number, tier name identifies, features support.
- **Issue:** `mb-12` after H2 could use `mb-16`.

#### CTASection

| Element    | Font    | Weight | Size               | Tracking | Color           |
|------------|---------|--------|--------------------|----------|-----------------|
| H2         | Satoshi | 300    | 36px -> 40px       | -0.02em  | `#F0EDE8`       |
| Body       | Inter   | 400    | 18px (text-lg)     | default  | `#A09D98`       |
| CTA button | Inter   | 500    | 16px               | default  | `#F0EDE8` on violet |
| Disclaimer | Inter   | 400    | 11px               | default  | `#A09D98`       |

- **Hierarchy:** Clear -- headline + body + action.
- **Breathing room:** `py-24 md:py-32` -- generous.

### Cross-Section Consistency Summary

| Token           | Font    | Weight | Size Range    | Tracking | Color     |
|-----------------|---------|--------|---------------|----------|-----------|
| Eyebrow (all)   | Inter   | 500    | 11px caps     | 0.08em   | `#7A7872` or `#A09D98` |
| H2 (all)        | Satoshi | 300    | 30-40px       | -0.02em  | `#F0EDE8` |
| Body (all)      | Inter   | 400    | 14-16px       | default  | `#A09D98` or `#7A7872` |

**Minor inconsistency:** Eyebrow color alternates between `#7A7872` and `#A09D98` across sections. Consider standardizing to one value.

---

## 3. Typography Recommendations

### Satoshi Weight Strategy

Satoshi ships with 5 weights: Light (300), Regular (400), Medium (500), Bold (700), Black (900).

**Current approach:** Satoshi 300 for ALL headlines. Creates a uniformly light, elegant feel.

**Assessment:** This is a strength, not a weakness. Most sites use 600-700 for headlines, so 300
creates instant differentiation. The recommendation is to keep 300 as the default and introduce
weight CONTRAST selectively for emphasis.

#### Weight Contrast Technique

Use Satoshi 500 (medium) on one key word within an otherwise 300-weight headline:

```html
<!-- Example: AINarrativeDemo -->
<h2 class="font-satoshi font-light ...">
  Not just numbers &mdash; <span class="font-medium">narrative.</span>
</h2>

<!-- Example: StrategyTabs -->
<h2 class="font-satoshi font-light ...">
  Five strategies. <span class="font-medium">One</span> address.
</h2>
```

This creates a focal point within the headline without breaking the light aesthetic.

### Inter as Body Font

**Finding:** Satoshi + Inter is the most documented pairing in the design community. Both are
modern geometric sans-serifs with similar DNA. Safe but effective.

**Why it works:**
- Satoshi's personality shines at display sizes (unique curves + angles visible at 32px+)
- Inter's neutrality at body sizes (14-16px) does not compete with Satoshi
- Both share geometric proportions so they harmonize

**Do not switch body text to Satoshi.** It would hurt legibility at 14px and reduce the hierarchy
contrast between display and body elements.

### Emphasis Techniques

#### Technique 1: Weight Isolation

Use Satoshi 500 for one key word in an otherwise 300-weight headline.

```
"Not just numbers -- [500]narrative.[/500]"
"Five strategies. [500]One[/500] address."
"Ready to see what your next deal is [500]really worth?[/500]"
```

#### Technique 2: Line Break Isolation

Force key phrases onto their own line for dramatic pause.

```
"You're running numbers across
4 tabs, 3 spreadsheets,
and a prayer."
```

#### Technique 3: Size Contrast

The emotional word gets 10-20% larger than surrounding text via a span with a larger size class.

```html
<h2 class="text-[32px]">
  See <span class="text-[38px]">every angle</span> of the deal.
</h2>
```

#### Technique 4: Opacity/Color Shift

Key word in full `#F0EDE8`, rest in `#A09D98`.

```html
<h2 class="text-text-secondary">
  We build the <span class="text-text-primary">full picture.</span>
</h2>
```

### Premium Site Techniques to Adopt

**From Linear:** Confidence through minimalism. Single centered headline with no competing
elements. The typography IS the hero.

**From Stripe:** Container blocks that expand/collapse. Dense information presented without
overwhelming. Text interacts with background texture/motion.

**From Vercel:** Fluid typography with CSS `clamp()`. Pre-calculated presets that bundle size +
line-height + letter-spacing + weight. `font-variant-numeric: tabular-nums` for stats.
Intentional line break management to avoid orphans/widows.

**From Apple:** Bold headlines (600-700) paired with light body (300-400) for maximum contrast.
Massive negative space around headlines. Product imagery supports text, never competes.
`max-width` ~800px for readability.

### Recommended Fluid Type Scale

Replace breakpoint-based sizing with CSS `clamp()`:

```css
/* Hero headline */
.hero-headline {
  font-size: clamp(2rem, 5vw + 0.5rem, 3.5rem);
  line-height: 1.1;
  letter-spacing: -0.03em;
}

/* Section headlines */
.section-headline {
  font-size: clamp(1.5rem, 3vw + 0.5rem, 2.5rem);
  line-height: 1.2;
  letter-spacing: -0.02em;
}

/* Stats numbers */
.stat-number {
  font-size: clamp(2.25rem, 4vw + 0.25rem, 3rem);
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
```

### Spacing Improvements

| Section       | Current     | Recommended  | Rationale                          |
|---------------|-------------|--------------|-------------------------------------|
| Hero H1 -> subhead | `mt-4`   | `mt-6`       | More breathing room under headline  |
| StrategyTabs H2 -> content | `mb-12` | `mb-16` | Match other generous sections      |
| PricingSection H2 -> cards | `mb-12` | `mb-16` | Match other generous sections      |
| ProblemSection H2 size | 32px  | 36-40px      | Emotional tension point needs more weight |

---

## 4. Violet (#8B7AFF) Color Discipline Audit

### Classification System

- **A: Interactive** -- buttons, links, focus indicators, hover states
- **B: Decorative accent** -- badges, borders, tier highlights
- **C: Decorative background** -- ambient gradients, patterns

### Every Violet Usage

| Location | Usage | Type | Verdict |
|----------|-------|------|---------|
| Hero CTA button gradient | `linear-gradient(#8B7AFF, #6C5CE7)` | A: Interactive | **KEEP** -- primary CTA |
| Hero skip link bg (focus-only) | `bg-[#8B7AFF]` | A: Interactive | **KEEP** -- accessibility |
| Navbar CTA button gradient | `linear-gradient(#8B7AFF, #6C5CE7)` | A: Interactive | **KEEP** -- primary CTA |
| Navbar CTA hover shadow | `rgba(139,122,255,0.3)` | A: Interactive | **KEEP** -- confirms interactivity |
| AINarrativeDemo CTA gradient | `linear-gradient(#8B7AFF, #6C5CE7)` | A: Interactive | **KEEP** -- mid-page CTA |
| CTASection CTA gradient | `linear-gradient(#8B7AFF, #6C5CE7)` | A: Interactive | **KEEP** -- final CTA |
| CTASection hover shadow | `rgba(139,122,255,0.3)` | A: Interactive | **KEEP** -- confirms interactivity |
| Tailwind focus-violet ring | `rgba(139,122,255,0.5)` | A: Interactive | **KEEP** -- focus indicator |
| Tailwind glow-violet shadow | `rgba(139,122,255,0.15)` | B: Token | **KEEP** -- used sparingly |
| Tailwind border-accent | `rgba(139,122,255,0.20)` | B: Token | **KEEP** -- used sparingly |
| PricingSection "Popular" badge | bg/text `#8B7AFF` | B: Accent | **KEEP** -- pairs with Carbon highlight, serves conversion |
| PricingSection Carbon border | `border-[#8B7AFF]/25` | B: Accent | **KEEP** -- signals recommended tier (earned usage) |
| PricingSection Carbon glow | `rgba(139,122,255,0.06)` shadow | B: Accent | **KEEP** -- supports the Carbon border signal |
| PricingSection "Save 20%" badge | `text-[#8B7AFF]` | B: Accent | **KEEP** -- draws eye to savings, serves conversion (minor dilution risk) |
| CTASection bg radial gradient | `rgba(139,122,255,0.04)` | C: Background | **KEEP** -- 4% opacity, creates ambient warmth without dilution |
| ProductPreview grid pattern | `rgba(139,122,255,0.5)` on 1px lines at 4% opacity | C: Decorative | **REMOVE** |
| PricingSection Carbon check icons | `text-[#8B7AFF]` | B: Accent | **REMOVE** |

### Removals -- Detail

#### ProductPreview Grid Pattern

The grid pattern uses violet in decorative background lines. This adds visual complexity without
guiding any action. Replace with a neutral gray (`rgba(255,255,255,0.03)`) or remove entirely.

```diff
- stroke: rgba(139, 122, 255, 0.5)  /* at 4% pattern opacity */
+ stroke: rgba(255, 255, 255, 0.04)  /* neutral, non-competing */
```

#### PricingSection Carbon Check Icons

Every feature row in the Carbon tier gets a violet checkmark. This cheapens the violet signal by
spreading it across 10+ identical elements. Replace with `#A09D98` (text-secondary). Reserve
violet for the tier badge and border only.

```diff
- <CheckIcon className="text-[#8B7AFF]" />
+ <CheckIcon className="text-[#A09D98]" />
```

### Discipline Score

| Category | Count | Status |
|----------|-------|--------|
| Interactive (A) | 7 | All correct -- keep |
| Accent (B) | 6 | 5 earned, 1 to remove (check icons) |
| Decorative (C) | 2 | 1 acceptable (CTA ambient), 1 to remove (grid pattern) |
| **Total** | **15** | **13 keep, 2 remove** |

**Overall:** Good discipline. Violet is primarily reserved for interactive elements. The two
removals tighten the signal further and ensure that every remaining violet usage either triggers
an action or identifies the recommended pricing tier.

---

## 5. Emotional Word Placement Analysis

### Per-Section Copy Breakdown

#### Hero: "We build the full picture."

- **Emotional weight:** "full picture" -- implies completeness, confidence, nothing hidden
- **Recommended styling:** "full picture" in Satoshi 500, rest in 300. Or isolate "full picture." on its own line.
- **Emotional role:** CURIOSITY -- "what is this full picture?"

#### StatsStrip: "5 Strategy Calculators" / "10,000+ Deals Analyzed" / "98% Accuracy" / "30sec Average"

- **Emotional weight:** The numbers themselves (5, 10,000+, 98%, 30)
- **Already styled correctly:** Satoshi 300 at 48px makes numbers dominant. No changes needed.
- **Emotional role:** TRUST -- social proof through quantification

#### ProblemSection: "You're running numbers across 4 tabs, 3 spreadsheets, and a prayer."

- **Emotional weight:** "and a prayer" -- the humor/tension payoff
- **Recommended:** Isolate "and a prayer." on its own line for dramatic pause. Make the numbers (4, 3) slightly different opacity/weight to emphasize the absurdity.
- **Subline:** "Your competitor just did it in 60 seconds." -- "60 seconds" is the punch
- **Recommended:** "60 seconds" should be `text-text-primary` instead of `text-muted` -- it deserves more visual prominence.
- **Emotional role:** TENSION -- "your current process is broken"

#### ProductPreview: "See every angle of the deal."

- **Emotional weight:** "every angle" -- completeness, thoroughness
- **Recommended:** "every angle" in Satoshi 500 or slightly larger size
- **Emotional role:** RELIEF -- "here's something better"

#### HowItWorks: "From Address to Analysis in Seconds"

- **Emotional weight:** "in Seconds" -- speed promise
- **Recommended:** Already clear. Could isolate "in Seconds" with slight emphasis.
- **Emotional role:** CONFIDENCE -- "it's actually easy"

#### StrategyTabs: "Five strategies. One address."

- **Emotional weight:** "One" -- the simplicity claim
- **Recommended:** "One" in Satoshi 500 creates powerful contrast:

```html
<h2>Five strategies. <span class="font-medium">One</span> address.</h2>
```

- **Emotional role:** CONFIDENCE -- "everything you need, simplified"

#### AINarrativeDemo: "Not just numbers -- narrative."

- **Emotional weight:** "narrative" -- the differentiator
- **Recommended:** "narrative." in Satoshi 500 or isolated on its own line. The em dash already creates a natural pause.
- **Emotional role:** PEAK MOMENT -- "this is actually impressive"

#### PricingSection: "Simple, Transparent Pricing"

- **Emotional weight:** "Transparent" -- trust signal
- **Recommended:** Standard styling is fine. Pricing section should not fight for creative attention -- clarity is everything here.
- **Emotional role:** PRACTICAL -- "what does it cost?"

#### CTASection: "Ready to see what your next deal is really worth?"

- **Emotional weight:** "really worth" -- challenges the visitor's current approach
- **Recommended:** "really worth?" in Satoshi 500. The question format already creates engagement.
- **Emotional role:** ACTION -- "take the next step"

### Emotional Arc

```
Section          | Emotion      | Intensity
-----------------+--------------+------------------------------------------
Hero             | Curiosity    | |||....   (medium -- intrigue)
StatsStrip       | Trust        | ||||...   (medium-high -- validation)
Problem          | Tension      | |||||..   (high -- "your process is broken")
ProductPreview   | Relief       | ||||...   (medium-high -- "here's the solution")
HowItWorks      | Confidence   | ||||...   (medium-high -- "it's simple")
StrategyTabs     | Confidence+  | |||||..   (high -- "it does everything")
AINarrativeDemo  | Peak/Delight | |||||||| (PEAK -- the "wow" moment)
Pricing          | Practical    | |||....   (medium -- evaluation mode)
CTA              | Action       | |||||..   (high -- closing momentum)
```

**The arc:** Curiosity -> Trust -> Tension -> Relief -> Confidence -> PEAK -> Practical -> Action

This follows the classic AIDA (Attention - Interest - Desire - Action) framework with the
Peak-End Rule satisfied: AINarrativeDemo is the highest emotional point, and CTASection provides
a strong ending. Both the peak and the end leave a positive impression.

### Emphasis Implementation Summary

| Section          | Target Phrase     | Technique                  | Tailwind Classes              |
|------------------|-------------------|----------------------------|-------------------------------|
| Hero             | "full picture"    | Weight isolation (500)     | `font-medium` on span         |
| ProblemSection   | "and a prayer"    | Line break isolation       | Explicit `<br>` before phrase |
| ProblemSection   | "60 seconds"      | Color promotion            | `text-text-primary` on span   |
| ProductPreview   | "every angle"     | Weight isolation (500)     | `font-medium` on span         |
| StrategyTabs     | "One"             | Weight isolation (500)     | `font-medium` on span         |
| AINarrativeDemo  | "narrative"       | Weight isolation (500)     | `font-medium` on span         |
| CTASection       | "really worth"    | Weight isolation (500)     | `font-medium` on span         |

---

## Action Items Summary

### P0 -- High Impact

| # | Item | Section | Detail |
|---|------|---------|--------|
| 1 | Fix hero/frame background seam | Hero | Set hero container bg to `#020202`, gradient fades to `#0C0B0A` |
| 2 | Remove violet from grid pattern | ProductPreview | Replace `rgba(139,122,255,...)` with neutral gray |
| 3 | Remove violet from check icons | PricingSection | Replace `text-[#8B7AFF]` with `text-[#A09D98]` on Carbon features |

### P1 -- Medium Impact

| # | Item | Section | Detail |
|---|------|---------|--------|
| 4 | Increase ProblemSection H2 size | ProblemSection | Bump from 32px to 36-40px for emotional weight |
| 5 | Add weight emphasis on key words | Multiple | Apply `font-medium` spans per the emphasis table above |
| 6 | Promote "60 seconds" color | ProblemSection | Change from `text-muted` to `text-text-primary` |
| 7 | Standardize eyebrow color | All sections | Pick one of `#7A7872` or `#A09D98` and use consistently |

### P2 -- Polish

| # | Item | Section | Detail |
|---|------|---------|--------|
| 8 | Increase H2-to-content spacing | StrategyTabs, Pricing | Change `mb-12` to `mb-16` |
| 9 | Increase hero H1-to-subhead gap | Hero | Change subhead `mt-4` to `mt-6` |
| 10 | Adopt fluid type with `clamp()` | All headlines | Replace breakpoint classes with fluid scale |
| 11 | Add `font-variant-numeric: tabular-nums` | StatsStrip | Ensures consistent number width during count animations |
