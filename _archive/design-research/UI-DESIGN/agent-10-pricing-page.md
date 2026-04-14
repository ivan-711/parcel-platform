# Agent 10 — Pricing Page Design

> The dedicated `/pricing` route. Highest-intent page in the funnel — visitors
> who land here have already decided they might pay. The page's job is to
> remove doubt, not create desire. Every pixel exists to reduce friction
> between "I'm interested" and "Start 14-day trial."

---

## 1. Page Layout (Top to Bottom)

```
 ┌────────────────────────────────────────────────────┐
 │  Navbar (reused from Landing.tsx)                   │
 ├────────────────────────────────────────────────────┤
 │  HERO: eyebrow + headline + subheadline + toggle   │
 ├────────────────────────────────────────────────────┤
 │  SOCIAL PROOF STRIP: 4 stats                       │
 ├────────────────────────────────────────────────────┤
 │  PRICING CARDS: Free | Pro (highlighted) | Team    │
 ├────────────────────────────────────────────────────┤
 │  COMPARISON TABLE: expandable "Compare all features"│
 ├────────────────────────────────────────────────────┤
 │  TESTIMONIAL: single high-impact quote             │
 ├────────────────────────────────────────────────────┤
 │  FAQ ACCORDION: 6 questions                        │
 ├────────────────────────────────────────────────────┤
 │  BOTTOM CTA: "Start 14-day Pro trial" banner       │
 ├────────────────────────────────────────────────────┤
 │  Footer (reused from Landing.tsx)                   │
 └────────────────────────────────────────────────────┘
```

Route: `/pricing`
File: `frontend/src/pages/Pricing.tsx`
Max content width: `max-w-5xl` (1024px)
Section padding: `py-24 px-6`
Section gap: `space-y-0` — each section owns its own padding for border control

---

## 2. Hero Section

The hero is text-only. No illustration, no background effect. Pure clarity.

### Structure

```
 EYEBROW         "Pricing"
 HEADLINE         "Five free analyses. Upgrade when you close."
 SUBHEADLINE      "No annual contracts. No per-deal fees. Cancel any time."
 TRIAL CALLOUT    Indigo pill: "14-day free trial on all Pro features"
 TOGGLE           [ Monthly | Annual  Save 20% ]
```

### JSX

```tsx
{/* ── Hero ── */}
<section className="pt-32 pb-16 px-6">
  <div className="max-w-5xl mx-auto space-y-8">
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-4 text-center"
    >
      <p className="text-[10px] uppercase tracking-[0.08em] text-accent-primary font-semibold">
        Pricing
      </p>

      <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-text-primary">
        Five free analyses.{' '}
        <span className="text-accent-primary">Upgrade when you close.</span>
      </h1>

      <p className="text-base text-text-secondary max-w-md mx-auto">
        No annual contracts. No per-deal fees. Cancel any time.
      </p>

      {/* Trial callout pill */}
      <div className="flex justify-center pt-2">
        <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium bg-accent-primary/10 border border-accent-primary/20 text-accent-primary">
          <Sparkles size={12} />
          14-day free trial on all Pro features
        </span>
      </div>
    </motion.div>

    {/* ── Monthly / Annual toggle ── */}
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.08 }}
      className="flex justify-center"
    >
      <div
        className="rounded-xl bg-app-elevated border border-border-subtle p-1 inline-flex items-center gap-1"
        role="radiogroup"
        aria-label="Billing period"
      >
        <button
          type="button"
          role="radio"
          aria-checked={!isAnnual}
          onClick={() => setIsAnnual(false)}
          className={cn(
            'px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary',
            !isAnnual
              ? 'bg-accent-primary text-white shadow-sm shadow-accent-primary/25'
              : 'bg-transparent text-text-secondary hover:text-text-primary',
          )}
        >
          Monthly
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={isAnnual}
          onClick={() => setIsAnnual(true)}
          className={cn(
            'px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200',
            'inline-flex items-center gap-2',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary',
            isAnnual
              ? 'bg-accent-primary text-white shadow-sm shadow-accent-primary/25'
              : 'bg-transparent text-text-secondary hover:text-text-primary',
          )}
        >
          Annual
          <span className="text-[10px] font-bold uppercase tracking-wide bg-accent-success/20 text-accent-success px-1.5 py-0.5 rounded">
            Save 20%
          </span>
        </button>
      </div>
    </motion.div>
  </div>
</section>
```

### Design Decisions

- **Centered text** on the dedicated page (vs left-aligned in the landing section).
  The standalone route has no adjacent content competing for attention — center
  alignment creates a focused, symmetric feel appropriate for a conversion page.
- **Headline split color.** "Upgrade when you close." in accent-primary. This
  positions the upgrade as a positive outcome (closing deals), not a cost.
- **Trial callout pill** sits between headline and toggle. This is the first
  thing the eye hits after reading the headline. Sparkles icon adds premium
  feel without being childish.
- **Toggle defaults to Monthly.** Transparent. The savings badge on "Annual"
  pulls users toward the annual plan naturally.

---

## 3. Monthly / Annual Toggle

### Behavior

| State | Monthly button | Annual button | Cards show |
|-------|---------------|---------------|------------|
| Monthly (default) | Filled indigo | Ghost | $0 / $69 / $99 |
| Annual | Ghost | Filled indigo | $0 / $55 / $79 |

### Toggle Animation

The pill toggle uses Tailwind's `transition-all duration-200` for the background
color switch. No Framer Motion needed — CSS transitions are sufficient for a
two-state control and avoid layout recalculation.

### Price Transition on Toggle

When the user toggles billing period, prices animate with a vertical slide:

```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={isAnnual ? 'annual' : 'monthly'}
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 10 }}
    transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
    className="flex items-baseline gap-1.5"
  >
    <span className="text-5xl font-bold font-mono text-text-primary">
      {displayPrice}
    </span>
    <span className="text-sm text-text-muted">/ {displayPeriod}</span>
  </motion.div>
</AnimatePresence>
```

### Annual Savings Display (Pro card only)

When annual is active, show the monthly equivalent with a strikethrough on the
original monthly price:

```tsx
{isAnnual && tier.name === 'Pro' && (
  <div className="flex items-center gap-2 mt-1">
    <span className="text-sm font-mono text-text-muted line-through">$69</span>
    <span className="text-xs font-medium text-accent-success bg-accent-success/10 px-2 py-0.5 rounded">
      Save $168/yr
    </span>
  </div>
)}
```

---

## 4. Social Proof Strip

Reuse the `StatsStrip` pattern from the landing page, but in a more compact
form positioned between the toggle and the pricing cards.

```tsx
{/* ── Social Proof Strip ── */}
<section className="py-8 px-6">
  <div className="max-w-3xl mx-auto">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
      {[
        { value: '$840M+', label: 'Deal value tracked' },
        { value: '2,400+', label: 'Deals analyzed' },
        { value: '48',     label: 'Markets covered' },
        { value: '4.9\u2605', label: 'Avg. rating' },
      ].map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
          className="space-y-1"
        >
          <p className="text-lg font-mono font-semibold text-text-primary">
            {stat.value}
          </p>
          <p className="text-[11px] text-text-muted tracking-wide">
            {stat.label}
          </p>
        </motion.div>
      ))}
    </div>
  </div>
</section>
```

### Design Decisions

- **Compact variant.** No icons, smaller text (`text-lg` vs `text-3xl`). The
  pricing page stats are supporting evidence, not the hero moment. They should
  feel like confident footnotes, not competing sections.
- **JetBrains Mono** for all values — financial data consistency.
- **max-w-3xl** to keep the strip visually tighter than the card grid below,
  creating a funnel effect that draws the eye downward into the cards.

---

## 5. Pricing Cards

### Data (Updated from constants.ts)

```tsx
const PRICING_DATA = {
  free: {
    name: 'Free',
    description: 'Perfect for getting started',
    monthly: { price: '$0', period: 'forever' },
    annual:  { price: '$0', period: 'forever' },
    features: [
      '5 deal analyses per month',
      'Full pipeline (up to 10 deals)',
      'AI-powered chat assistant',
      'PDF deal reports',
      'Community support',
    ],
    cta: 'Start free',
    ctaLink: '/register',
    highlighted: false,
  },
  pro: {
    name: 'Pro',
    description: 'For active investors and agents',
    monthly: { price: '$69', period: 'per month' },
    annual:  { price: '$55', period: 'per month, billed annually' },
    features: [
      'Unlimited deal analyses',
      'Unlimited pipeline deals',
      'AI offer letter generator',
      'Document AI (10 uploads/mo)',
      'Deal sharing links',
      'Priority support',
    ],
    cta: 'Start 14-day trial',
    ctaLink: '/register?plan=pro',
    highlighted: true,
  },
  team: {
    name: 'Team',
    description: 'For real estate teams and brokerages',
    monthly: { price: '$99', period: 'per member/month' },
    annual:  { price: '$79', period: 'per member/month, billed annually' },
    features: [
      'Everything in Pro',
      'Up to 10 team members',
      'Shared pipeline & deals',
      'Role-based access control',
      'Unlimited document AI',
      'Team analytics dashboard',
    ],
    cta: 'Contact us',
    ctaLink: 'mailto:team@parcel.app',
    highlighted: false,
    comingSoon: true,
  },
};
```

> **IMPORTANT:** The Pro price must be $69/mo (not $29 as in the current
> constants.ts). Annual is $55/mo ($660/yr). The constants.ts file needs
> updating to reflect real pricing.

### Card Grid

```tsx
{/* ── Pricing Cards ── */}
<section className="py-12 px-6">
  <div className="max-w-5xl mx-auto">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Mobile: Pro first via order- utilities */}
      <FreeCard  className="order-2 md:order-1" />
      <ProCard   className="order-1 md:order-2" />
      <TeamCard  className="order-3 md:order-3" />
    </div>
  </div>
</section>
```

### Free Card

```tsx
<motion.div
  initial={{ opacity: 0, y: 16 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: '-40px' }}
  transition={{ duration: 0.4, delay: 0 }}
  whileHover={{ y: -4 }}
  className={cn(
    'rounded-2xl border border-border-subtle bg-app-surface p-6 flex flex-col',
    'hover:shadow-lg hover:shadow-black/20 transition-shadow duration-300',
    className,
  )}
>
  {/* Header */}
  <div className="space-y-1 mb-6">
    <p className="text-lg font-semibold text-text-primary">Free</p>
    <p className="text-xs text-text-muted">Perfect for getting started</p>
  </div>

  {/* Price */}
  <div className="mb-6">
    <AnimatePresence mode="wait">
      <motion.div
        key={isAnnual ? 'annual' : 'monthly'}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className="flex items-baseline gap-1.5"
      >
        <span className="text-5xl font-bold font-mono text-text-primary">$0</span>
        <span className="text-sm text-text-muted">/ forever</span>
      </motion.div>
    </AnimatePresence>
  </div>

  {/* Features */}
  <ul className="space-y-3 mb-8 flex-1">
    {features.map((f) => (
      <li key={f} className="flex items-start gap-2.5 text-sm text-text-secondary">
        <Check size={14} className="text-accent-success mt-0.5 shrink-0" />
        {f}
      </li>
    ))}
  </ul>

  {/* Upgrade path hint */}
  <p className="text-xs text-text-muted mb-4 text-center">
    Need more? Upgrade to Pro anytime.
  </p>

  {/* CTA */}
  <Link to="/register" className="block">
    <Button
      variant="outline"
      className="w-full h-11 text-sm font-semibold cursor-pointer
        bg-app-elevated hover:bg-border-subtle
        text-text-primary border-border-default hover:border-border-strong
        transition-colors duration-150"
    >
      Start free
    </Button>
  </Link>
</motion.div>
```

### Pro Card (Highlighted)

This card is the conversion target. It is visually differentiated through:
1. Indigo border and tinted background
2. Ambient glow effect behind the card
3. "Most popular" badge + "14-day free trial" sub-badge
4. Solid indigo CTA (only solid primary button on the page)
5. Inline trial micro-banner above CTA
6. "No credit card required" reassurance below CTA
7. Slightly larger scale on desktop: `md:scale-[1.02]`

```tsx
<motion.div
  initial={{ opacity: 0, y: 16 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: '-40px' }}
  transition={{ duration: 0.4, delay: 0.07 }}
  whileHover={{ y: -4 }}
  className={cn(
    'rounded-2xl border border-accent-primary/50 bg-accent-primary/[0.04] p-6 flex flex-col',
    'relative overflow-hidden',
    'hover:shadow-xl hover:shadow-accent-primary/15 transition-shadow duration-300',
    'md:scale-[1.02]',
    className,
  )}
>
  {/* Top gradient line */}
  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent-primary to-transparent" />

  {/* Ambient glow — positioned behind the card */}
  <div
    className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full pointer-events-none"
    style={{ background: 'rgba(99,102,241,0.15)', filter: 'blur(40px)' }}
    aria-hidden="true"
  />

  {/* Header */}
  <div className="space-y-1 mb-6 relative">
    <div className="space-y-1 mb-1">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-accent-primary">
        Most popular
      </p>
      <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-accent-success">
        14-day free trial
      </p>
    </div>
    <p className="text-lg font-semibold text-text-primary">Pro</p>
    <p className="text-xs text-text-muted">For active investors and agents</p>
  </div>

  {/* Price */}
  <div className="mb-6 relative">
    <AnimatePresence mode="wait">
      <motion.div
        key={isAnnual ? 'annual' : 'monthly'}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className="flex items-baseline gap-1.5"
      >
        <span className="text-5xl font-bold font-mono text-text-primary">
          {isAnnual ? '$55' : '$69'}
        </span>
        <span className="text-sm text-text-muted">
          / {isAnnual ? 'mo, billed annually' : 'per month'}
        </span>
      </motion.div>
    </AnimatePresence>

    {/* Annual savings callout */}
    {isAnnual && (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className="flex items-center gap-2 mt-2"
      >
        <span className="text-sm font-mono text-text-muted line-through">$69</span>
        <span className="text-[11px] font-medium text-accent-success bg-accent-success/10 px-2 py-0.5 rounded">
          Save $168/yr
        </span>
      </motion.div>
    )}

    {/* Per-day reframing */}
    <p className="text-[11px] text-text-muted mt-1.5">
      Less than $2.30/day
    </p>
  </div>

  {/* Features */}
  <ul className="space-y-3 mb-6 flex-1 relative">
    {features.map((f) => (
      <li key={f} className="flex items-start gap-2.5 text-sm text-text-secondary">
        <Check size={14} className="text-accent-success mt-0.5 shrink-0" />
        {f}
      </li>
    ))}
  </ul>

  {/* Inline trial micro-banner */}
  <div className="rounded-lg bg-accent-success/[0.08] border border-accent-success/15 px-3 py-2.5 mb-4">
    <p className="text-xs text-accent-success text-center font-medium">
      Try all Pro features free for 14 days. No credit card required.
    </p>
  </div>

  {/* CTA */}
  <Link to="/register?plan=pro" className="block">
    <Button
      className="w-full h-11 text-sm font-semibold cursor-pointer
        bg-gradient-to-r from-indigo-600 to-indigo-500
        hover:from-indigo-500 hover:to-indigo-400
        text-white shadow-lg shadow-indigo-500/20
        transition-all duration-150"
    >
      Start 14-day trial
    </Button>
  </Link>

  {/* Micro-reassurance */}
  <p className="text-[11px] text-text-muted text-center mt-2.5">
    No credit card required
  </p>
</motion.div>
```

### Team Card (Coming Soon)

```tsx
<motion.div
  initial={{ opacity: 0, y: 16 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: '-40px' }}
  transition={{ duration: 0.4, delay: 0.14 }}
  whileHover={{ y: -4 }}
  className={cn(
    'rounded-2xl border border-border-subtle bg-app-surface p-6 flex flex-col',
    'hover:shadow-lg hover:shadow-black/20 transition-shadow duration-300',
    className,
  )}
>
  {/* Header */}
  <div className="space-y-1 mb-6">
    <div className="flex items-center gap-2">
      <p className="text-lg font-semibold text-text-primary">Team</p>
      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted bg-app-elevated px-2 py-0.5 rounded">
        Coming soon
      </span>
    </div>
    <p className="text-xs text-text-muted">For real estate teams and brokerages</p>
  </div>

  {/* Price */}
  <div className="mb-6">
    <AnimatePresence mode="wait">
      <motion.div
        key={isAnnual ? 'annual' : 'monthly'}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className="flex items-baseline gap-1.5"
      >
        <span className="text-5xl font-bold font-mono text-text-primary">
          {isAnnual ? '$79' : '$99'}
        </span>
        <span className="text-sm text-text-muted">
          / {isAnnual ? 'per seat/mo, billed annually' : 'per seat/month'}
        </span>
      </motion.div>
    </AnimatePresence>
  </div>

  {/* Features */}
  <ul className="space-y-3 mb-8 flex-1">
    {features.map((f) => (
      <li key={f} className="flex items-start gap-2.5 text-sm text-text-secondary">
        <Check size={14} className="text-accent-success mt-0.5 shrink-0" />
        {f}
      </li>
    ))}
  </ul>

  {/* CTA */}
  <a href="mailto:team@parcel.app" className="block">
    <Button
      variant="outline"
      className="w-full h-11 text-sm font-semibold cursor-pointer
        bg-app-elevated hover:bg-border-subtle
        text-text-primary border-border-default hover:border-border-strong
        transition-colors duration-150"
    >
      Contact us
    </Button>
  </a>
</motion.div>
```

### Card Visual Hierarchy Summary

| Property | Free | Pro | Team |
|----------|------|-----|------|
| Border | `border-border-subtle` | `border-accent-primary/50` | `border-border-subtle` |
| Background | `bg-app-surface` | `bg-accent-primary/[0.04]` | `bg-app-surface` |
| Top gradient | No | Yes (indigo via-center) | No |
| Ambient glow | No | Yes (blur 40px indigo) | No |
| Scale (desktop) | 1.0 | 1.02 | 1.0 |
| Badge | None | "Most popular" + "14-day free trial" | "Coming soon" |
| CTA style | Outline/ghost | Solid indigo gradient | Outline/ghost |
| Shadow on hover | `shadow-black/20` | `shadow-accent-primary/15` | `shadow-black/20` |
| Card height | `flex-1` stretches features | `flex-1` stretches features | `flex-1` stretches features |

### Card Entrance Animation

Cards stagger in from bottom with 70ms delay between each:

```tsx
initial={{ opacity: 0, y: 16 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true, margin: '-40px' }}
transition={{ duration: 0.4, delay: index * 0.07 }}
```

Hover: `whileHover={{ y: -4 }}` — subtle 4px lift.
The Pro card does NOT get a larger hover lift. All cards lift equally.
The differentiation is in color and glow, not motion.

---

## 6. Feature Comparison Table

Collapsed by default. Expandable via a "Compare all features" trigger button
positioned below the pricing cards.

### Trigger Button

```tsx
{/* ── Comparison Table ── */}
<section className="py-12 px-6">
  <div className="max-w-5xl mx-auto">
    <button
      type="button"
      onClick={() => setShowComparison(!showComparison)}
      className="flex items-center gap-2 mx-auto text-sm text-text-secondary hover:text-text-primary transition-colors group"
      aria-expanded={showComparison}
    >
      <span className="border-b border-dashed border-text-muted group-hover:border-text-secondary transition-colors">
        Compare all features
      </span>
      <motion.div
        animate={{ rotate: showComparison ? 180 : 0 }}
        transition={{ duration: 0.25 }}
      >
        <ChevronDown size={14} />
      </motion.div>
    </button>

    <AnimatePresence>
      {showComparison && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <ComparisonTable isAnnual={isAnnual} />
        </motion.div>
      )}
    </AnimatePresence>
  </div>
</section>
```

### Table Structure

```tsx
interface ComparisonRow {
  feature: string;
  tooltip?: string;       // optional (?) icon with popover
  free: string | boolean; // true = checkmark, false = dash, string = value
  pro: string | boolean;
  team: string | boolean;
}

interface ComparisonCategory {
  name: string;
  rows: ComparisonRow[];
}
```

### Comparison Data

```tsx
const COMPARISON: ComparisonCategory[] = [
  {
    name: 'Deal Analysis',
    rows: [
      { feature: 'Analyses per month',   free: '5',    pro: 'Unlimited', team: 'Unlimited' },
      { feature: 'Strategy types',        free: '5',    pro: '5',         team: '5' },
      { feature: 'AI chat messages/mo',   free: '10',   pro: '150',       team: 'Unlimited',
        tooltip: 'Messages to the AI deal specialist per calendar month' },
      { feature: 'Chat history',          free: '7 days', pro: 'Unlimited', team: 'Unlimited' },
    ],
  },
  {
    name: 'Pipeline',
    rows: [
      { feature: 'Active deals',         free: '10',   pro: 'Unlimited', team: 'Unlimited' },
      { feature: 'Kanban board',          free: true,   pro: true,        team: true },
      { feature: 'Deal sharing links',    free: false,  pro: true,        team: true },
      { feature: 'Custom stages',         free: false,  pro: false,       team: true },
    ],
  },
  {
    name: 'Documents',
    rows: [
      { feature: 'Uploads per month',    free: '3',    pro: '10',        team: 'Unlimited' },
      { feature: 'AI document extraction',free: false,  pro: true,        team: true,
        tooltip: 'Automatically extract key terms from uploaded contracts and disclosures' },
      { feature: 'Storage',              free: '100 MB',pro: '5 GB',     team: '50 GB' },
    ],
  },
  {
    name: 'AI Features',
    rows: [
      { feature: 'Offer letter generator', free: false, pro: true,       team: true,
        tooltip: 'AI-generated LOI and offer letters based on your deal analysis' },
      { feature: 'Market analysis',         free: false, pro: true,       team: true },
      { feature: 'Deal comparison',         free: false, pro: true,       team: true },
    ],
  },
  {
    name: 'Export & Reports',
    rows: [
      { feature: 'PDF deal reports',      free: true,   pro: true,       team: true },
      { feature: 'Custom branding',       free: false,  pro: false,      team: true },
      { feature: 'Portfolio export',      free: false,  pro: true,       team: true },
    ],
  },
  {
    name: 'Support',
    rows: [
      { feature: 'Community support',    free: true,   pro: true,        team: true },
      { feature: 'Priority email support',free: false,  pro: true,       team: true },
      { feature: 'Onboarding call',      free: false,  pro: false,       team: true },
      { feature: 'Dedicated account manager', free: false, pro: false,   team: true },
    ],
  },
];
```

### Table JSX

```tsx
function ComparisonTable({ isAnnual }: { isAnnual: boolean }) {
  return (
    <div className="mt-8 rounded-xl border border-border-subtle overflow-hidden">
      <table className="w-full text-left text-sm">
        {/* Sticky header */}
        <thead>
          <tr className="bg-app-elevated border-b border-border-subtle">
            <th className="py-3 px-4 text-xs font-medium text-text-muted w-[40%]">
              Feature
            </th>
            <th className="py-3 px-4 text-xs font-medium text-text-muted text-center w-[20%]">
              Free
            </th>
            <th className="py-3 px-4 text-xs font-medium text-accent-primary text-center w-[20%]">
              Pro
            </th>
            <th className="py-3 px-4 text-xs font-medium text-text-muted text-center w-[20%]">
              Team
            </th>
          </tr>
        </thead>
        <tbody>
          {COMPARISON.map((category) => (
            <Fragment key={category.name}>
              {/* Category header row */}
              <tr className="bg-app-surface/50">
                <td
                  colSpan={4}
                  className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-text-muted"
                >
                  {category.name}
                </td>
              </tr>
              {/* Feature rows */}
              {category.rows.map((row) => (
                <tr
                  key={row.feature}
                  className="border-b border-border-subtle/50 hover:bg-app-elevated/30 transition-colors"
                >
                  <td className="py-3 px-4 text-sm text-text-secondary flex items-center gap-1.5">
                    {row.feature}
                    {row.tooltip && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle
                              size={12}
                              className="text-text-muted hover:text-text-secondary cursor-help shrink-0"
                            />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[240px] text-xs">
                            {row.tooltip}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </td>
                  <ComparisonCell value={row.free} />
                  <ComparisonCell value={row.pro} isProColumn />
                  <ComparisonCell value={row.team} />
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ComparisonCell({
  value,
  isProColumn = false,
}: {
  value: string | boolean;
  isProColumn?: boolean;
}) {
  return (
    <td className={cn('py-3 px-4 text-center', isProColumn && 'bg-accent-primary/[0.03]')}>
      {value === true ? (
        <Check size={14} className="text-accent-success mx-auto" />
      ) : value === false ? (
        <span className="text-text-muted">&mdash;</span>
      ) : (
        <span className={cn('text-sm font-mono', isProColumn ? 'text-text-primary font-medium' : 'text-text-secondary')}>
          {value}
        </span>
      )}
    </td>
  );
}
```

### Design Decisions

- **Pro column has a subtle tinted background** (`bg-accent-primary/[0.03]`)
  that runs the full height of the table. This maintains visual continuity
  from the Pro card's highlight.
- **Category headers** use uppercase, tracked, muted text to separate groups
  without heavy dividers.
- **Tooltip icons** only on advanced/ambiguous features. Do not over-tooltip.
  Stick to features a first-time visitor might not understand (Document AI
  extraction, offer letter generator, BRRRR-specific terms).
- **Em-dashes for excluded features.** Never red X marks. Dashes are neutral;
  X marks trigger negative emotional response at the moment of purchase
  decision.
- **Table expand animation** uses a custom cubic-bezier `[0.16, 1, 0.3, 1]`
  for a weighty feel — slow start, fast end, communicating that significant
  content is being revealed.

### Mobile Comparison

On screens below `md`, replace the table with a tabbed single-column view:

```tsx
{/* Mobile: tabbed comparison */}
<div className="md:hidden">
  <div className="flex gap-1 p-1 rounded-lg bg-app-elevated border border-border-subtle mb-4">
    {['Free', 'Pro', 'Team'].map((tier) => (
      <button
        key={tier}
        onClick={() => setComparisonTab(tier)}
        className={cn(
          'flex-1 py-2 rounded-md text-xs font-medium transition-colors',
          comparisonTab === tier
            ? 'bg-accent-primary text-white'
            : 'text-text-secondary hover:text-text-primary',
        )}
      >
        {tier}
      </button>
    ))}
  </div>

  {COMPARISON.map((category) => (
    <div key={category.name} className="mb-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">
        {category.name}
      </p>
      {category.rows.map((row) => {
        const val = row[comparisonTab.toLowerCase() as 'free' | 'pro' | 'team'];
        return (
          <div
            key={row.feature}
            className="flex items-center justify-between py-2 border-b border-border-subtle/30"
          >
            <span className="text-sm text-text-secondary">{row.feature}</span>
            {val === true ? (
              <Check size={14} className="text-accent-success" />
            ) : val === false ? (
              <span className="text-text-muted text-sm">&mdash;</span>
            ) : (
              <span className="text-sm font-mono text-text-primary">{val}</span>
            )}
          </div>
        );
      })}
    </div>
  ))}
</div>
```

---

## 7. Testimonial Section

A single high-impact testimonial positioned between the comparison table and FAQ.
This placement catches users who just finished evaluating features and need
social reinforcement before scrolling to FAQ (objection handling).

```tsx
{/* ── Testimonial ── */}
<section className="py-20 px-6 border-t border-border-subtle">
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.4 }}
    className="max-w-2xl mx-auto text-center space-y-6"
  >
    {/* Avatar */}
    <div
      className="w-14 h-14 rounded-full flex items-center justify-center text-base font-semibold mx-auto"
      style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366F1' }}
      aria-hidden="true"
    >
      JN
    </div>

    {/* Quote */}
    <blockquote className="text-lg md:text-xl text-text-secondary leading-relaxed font-medium">
      &ldquo;Parcel paid for itself on my first deal. The BRRRR calculator alone
      saved me from a property that looked good on paper but would have been
      negative cash flow after the refi.&rdquo;
    </blockquote>

    {/* Attribution */}
    <div className="space-y-0.5">
      <p className="text-sm font-semibold text-text-primary">Jason Nguyen</p>
      <p className="text-xs text-text-muted">BRRRR Specialist &middot; Phoenix, AZ</p>
    </div>

    {/* Key metric */}
    <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-accent-primary/10 border border-accent-primary/20">
      <span className="text-sm font-mono font-semibold text-accent-primary">14.2%</span>
      <span className="text-xs text-text-muted">avg cash-on-cash return</span>
    </div>
  </motion.div>
</section>
```

### Design Decisions

- **Single testimonial, not carousel.** On a pricing page, one strong quote
  is more effective than a carousel that fragments attention. The landing page
  already has a full carousel — no need to repeat the pattern.
- **Mentions a specific feature** (BRRRR calculator) and a **concrete outcome**
  (avoided a bad deal). This directly addresses the "is it worth $69/mo?"
  objection.
- **Key metric pill** echoes the stats strip format. JetBrains Mono for the
  number. Ties the testimonial to measurable results.
- **Jason Nguyen** is reused from the landing testimonials data — consistency
  across pages builds recognition.

---

## 8. FAQ Accordion

### Data

```tsx
const FAQ_DATA = [
  {
    q: 'What happens after my 14-day trial ends?',
    a: 'Your account automatically reverts to the Free plan. You keep all your data \u2014 nothing is deleted. You can upgrade again anytime from your Settings page.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. No contracts, no cancellation fees. Cancel from your Settings page in two clicks. Your Pro access continues until the end of the current billing period.',
  },
  {
    q: 'What counts as a \u201cdeal analysis\u201d?',
    a: 'Each time you run a calculator (BRRRR, Wholesale, Flip, Buy & Hold, or Creative Finance) on a property, that counts as one analysis. Re-running the same property with different numbers does not count as a new analysis.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'Yes. We offer a 30-day money-back guarantee. If Pro isn\u2019t right for you, email us within 30 days of your first payment for a full refund.',
  },
  {
    q: 'Is my data secure?',
    a: 'All data is encrypted in transit (TLS 1.3) and at rest. We never share or sell your data. Your deal information is yours.',
  },
  {
    q: 'Can I switch between monthly and annual billing?',
    a: 'Yes. Switch to annual to save 20% ($168/yr). Upgrades take effect immediately. Downgrades take effect at the end of your current billing period.',
  },
];
```

### Component

```tsx
{/* ── FAQ ── */}
<section className="py-24 px-6 border-t border-border-subtle">
  <div className="max-w-2xl mx-auto space-y-10">
    {/* Header */}
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
      className="text-center space-y-3"
    >
      <p className="text-[10px] uppercase tracking-[0.08em] text-accent-primary font-semibold">
        FAQ
      </p>
      <h2 className="text-3xl font-semibold tracking-tight text-text-primary">
        Common questions
      </h2>
    </motion.div>

    {/* Accordion */}
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={staggerContainer(60)}
      className="divide-y divide-border-subtle"
    >
      {FAQ_DATA.map((item, i) => (
        <FAQItem key={i} question={item.q} answer={item.a} index={i} />
      ))}
    </motion.div>
  </div>
</section>
```

### FAQItem Component

```tsx
function FAQItem({
  question,
  answer,
  index,
}: {
  question: string;
  answer: string;
  index: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div variants={staggerItem}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg rounded"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-text-primary pr-4 group-hover:text-accent-primary transition-colors">
          {question}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="shrink-0"
        >
          <ChevronDown size={16} className="text-text-muted" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="text-sm text-text-secondary leading-relaxed pb-5">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
```

### Design Decisions

- **max-w-2xl** — narrower than the pricing cards. FAQ text has high
  readability requirements. Lines over 75 characters cause eye-tracking
  strain. 2xl (672px) keeps body text under 80 characters per line.
- **Framer Motion height animation** instead of Radix Accordion. The
  pricing page is a standalone route with minimal dependency overhead.
  A custom accordion with `AnimatePresence` weighs less than importing
  Radix Accordion and gives more animation control.
- **staggerContainer(60)** — 60ms delay between FAQ items appearing on
  viewport entry. Slightly faster than card stagger (70ms) since FAQ
  items are smaller.
- **Chevron rotation** — `rotate: 180` on the ChevronDown icon, matching
  the comparison table trigger pattern for consistency.
- **Touch target:** Button has `py-5` (20px top and bottom padding) giving
  a 56px+ tap target height. Exceeds the 44px minimum.

---

## 9. Bottom CTA Banner

Full-width conversion banner below FAQ. Catches users who scrolled the entire
page and need one final nudge.

```tsx
{/* ── Bottom CTA ── */}
<section className="py-24 px-6 border-t border-border-subtle relative overflow-hidden">
  {/* Ambient glow */}
  <div
    className="absolute inset-0 pointer-events-none"
    style={{
      background: 'radial-gradient(ellipse 60% 60% at 50% 100%, rgba(99,102,241,0.12) 0%, transparent 70%)',
    }}
    aria-hidden="true"
  />

  <motion.div
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.4 }}
    className="relative max-w-2xl mx-auto text-center space-y-5"
  >
    <h2 className="text-3xl md:text-4xl font-bold text-text-primary tracking-tight">
      Start analyzing deals today
    </h2>
    <p className="text-sm text-text-secondary max-w-sm mx-auto">
      Your first 5 analyses are free. No credit card needed.
    </p>

    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
      <Link to="/register?plan=pro">
        <Button
          className="h-12 px-8 text-sm font-semibold cursor-pointer
            bg-gradient-to-r from-indigo-600 to-indigo-500
            hover:from-indigo-500 hover:to-indigo-400
            text-white shadow-lg shadow-indigo-500/20
            transition-all duration-150"
        >
          Start 14-day Pro trial
          <ArrowRight size={14} className="ml-2" />
        </Button>
      </Link>
      <Link to="/register">
        <Button
          variant="outline"
          className="h-12 px-8 text-sm font-semibold cursor-pointer
            bg-transparent hover:bg-app-elevated
            text-text-secondary hover:text-text-primary
            border-border-default hover:border-border-strong
            transition-all duration-150"
        >
          Start free
        </Button>
      </Link>
    </div>

    <p className="text-[11px] text-text-muted pt-1">
      No credit card required &middot; Cancel anytime
    </p>
  </motion.div>
</section>
```

### Design Decisions

- **Two buttons, not one.** The Pro trial CTA is primary (solid indigo gradient).
  "Start free" is secondary (outline). This gives hesitant users an escape
  route that still converts them into the funnel.
- **Ambient radial glow** matches the FinalCTA component from the landing page.
  Visual consistency signals "this is the end of the page, make a decision."
- **ArrowRight icon** on the primary button only. The arrow implies forward
  momentum. Do not put arrows on the secondary button — it should feel
  like a soft alternative, not a competing action.

---

## 10. Social Proof Placement Summary

Social proof appears at three points on the page, each with different weight:

| Position | Type | Purpose |
|----------|------|---------|
| Below toggle, above cards | Stats strip (compact) | Establishes credibility before price reveal |
| Below comparison table | Single testimonial | Reinforces value after feature evaluation |
| Below bottom CTA | Micro-copy ("No credit card...") | Reduces friction at moment of decision |

The social proof is tiered by intensity: numbers (low-key) -> quote (emotional)
-> reassurance (transactional). This mirrors the user's mental state as they
scroll: curious -> evaluating -> deciding.

---

## 11. Mobile Design

### Card Reordering

On mobile (`< md`), the Pro card appears first using Tailwind `order-` utilities:

```
Mobile order:     Pro (order-1) -> Free (order-2) -> Team (order-3)
Desktop order:    Free (order-1) -> Pro (order-2) -> Team (order-3)
```

This ensures the conversion target is visible above the fold on mobile without
requiring any scroll.

### Sticky Bottom CTA

When the Pro card scrolls out of the viewport on mobile, a sticky bottom bar
slides up to maintain persistent access to the primary CTA:

```tsx
function StickyMobileCTA({ isAnnual }: { isAnnual: boolean }) {
  const proCardRef = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    if (!proCardRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(proCardRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <AnimatePresence>
      {showSticky && (
        <motion.div
          initial={{ y: 80 }}
          animate={{ y: 0 }}
          exit={{ y: 80 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 inset-x-0 z-50 md:hidden
            bg-app-bg/90 backdrop-blur-lg
            border-t border-border-subtle
            px-4 py-3 safe-area-pb"
        >
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">
                Pro &mdash; {isAnnual ? '$55/mo' : '$69/mo'}
              </p>
              <p className="text-[11px] text-text-muted">14-day free trial</p>
            </div>
            <Link to="/register?plan=pro">
              <Button
                className="h-10 px-5 text-xs font-semibold cursor-pointer shrink-0
                  bg-accent-primary hover:bg-accent-hover text-white
                  transition-colors duration-150"
              >
                Start trial
              </Button>
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### Safe Area

The sticky bar uses `safe-area-pb` (a custom Tailwind utility or
`pb-[env(safe-area-inset-bottom)]`) to avoid overlapping the iOS home
indicator bar. Add padding to the page's bottom content to prevent the
sticky bar from covering the footer:

```tsx
<div className="md:hidden pb-20" /> {/* Spacer to prevent overlap */}
```

### Mobile Comparison Table

Replaced with a tabbed single-column layout (see Section 6 mobile variant).
No horizontal scrolling. One tier at a time with a pill tab switcher.

### Mobile FAQ

Full-width accordion. No changes needed — the accordion pattern is inherently
mobile-friendly. Touch targets are 56px+ due to `py-5` on the trigger button.

---

## 12. Framer Motion Animation Spec

All animations use the shared system from `motion.ts` (DURATION, EASING,
SPRING, staggerContainer, staggerItem).

### Page Load Sequence

```
Time 0ms     Hero headline fades in (opacity 0->1, y 12->0)
Time 80ms    Trial callout pill fades in
Time 160ms   Toggle fades in
Time 400ms   Stats strip staggers in (4 items, 50ms between each)
Time 600ms   Pricing cards stagger in (3 cards, 70ms between each)
```

This creates a clear top-to-bottom reveal cadence.

### Toggle Animation

Toggle buttons use Tailwind `transition-all duration-200` (CSS only).
No Framer Motion needed for a two-state pill. This avoids the overhead of
re-rendering a motion component for a simple background color change.

### Price Change Animation

```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={isAnnual ? 'annual' : 'monthly'}
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 10 }}
    transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
  >
    {price}
  </motion.div>
</AnimatePresence>
```

The vertical slide (y: -10 entering, y: 10 exiting) creates a "rolling
counter" effect. The ease curve is `snappy` for a crisp, decisive feel
appropriate for financial numbers.

### Card Hover

```tsx
whileHover={{ y: -4 }}
```

All three cards use the same hover lift. The Pro card is NOT differentiated
by larger hover motion — differentiation comes from color and glow, not
amplitude. 4px lift with default transition.

### Comparison Table Expand

```tsx
initial={{ height: 0, opacity: 0 }}
animate={{ height: 'auto', opacity: 1 }}
exit={{ height: 0, opacity: 0 }}
transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
```

Custom cubic-bezier: slow start, fast through the middle, gentle settle.
Communicates that a substantial amount of content is expanding.

### FAQ Accordion

```tsx
initial={{ height: 0, opacity: 0 }}
animate={{ height: 'auto', opacity: 1 }}
exit={{ height: 0, opacity: 0 }}
transition={{ duration: 0.25, ease: 'easeInOut' }}
```

Shorter duration than the comparison table (250ms vs 400ms). FAQ answers
are small text blocks — the animation should be quick and responsive.

### Sticky Mobile CTA

```tsx
initial={{ y: 80 }}
animate={{ y: 0 }}
exit={{ y: 80 }}
transition={SPRING.default} // damping 25, stiffness 300
```

Spring physics for the slide-up. The bounce at the end of a spring
animation draws peripheral attention to the sticky bar without being
aggressive.

### Reduced Motion

All Framer Motion animations respect `prefers-reduced-motion` automatically
via `useReducedMotion()`. When reduced motion is preferred:
- Card stagger becomes instant (no delay, no translation)
- Price changes hard-swap (no y-axis animation)
- FAQ accordion expands without height animation (simple display toggle)
- Sticky CTA appears without slide (instant render)

---

## 13. Full Component: `PricingPage.tsx`

```tsx
/**
 * PricingPage — dedicated /pricing route.
 *
 * Sections: Hero -> Stats -> Cards -> Comparison -> Testimonial -> FAQ -> CTA
 *
 * Three-tier display: Free ($0), Pro ($69/mo, highlighted), Team ($99/mo, coming soon).
 * Pro card is the conversion target — only solid CTA, ambient glow, "Most popular" badge.
 * Monthly/Annual toggle with animated price transition.
 * Expandable feature comparison table (collapsed by default).
 * FAQ accordion with 6 questions addressing pricing objections.
 * Mobile: Pro card first (order-), sticky bottom CTA via IntersectionObserver.
 */

import { useState, useRef, useEffect, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  ChevronDown,
  ArrowRight,
  Sparkles,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { staggerContainer, staggerItem } from '@/lib/motion'

/* ── Types ── */

interface ComparisonRow {
  feature: string
  tooltip?: string
  free: string | boolean
  pro: string | boolean
  team: string | boolean
}

interface ComparisonCategory {
  name: string
  rows: ComparisonRow[]
}

/* ── Data ── */

const TIERS = [
  {
    key: 'free' as const,
    name: 'Free',
    description: 'Perfect for getting started',
    monthly: { price: '$0', period: 'forever' },
    annual: { price: '$0', period: 'forever' },
    features: [
      '5 deal analyses per month',
      'Full pipeline (up to 10 deals)',
      'AI-powered chat assistant',
      'PDF deal reports',
      'Community support',
    ],
    cta: 'Start free',
    ctaLink: '/register',
    highlighted: false,
    comingSoon: false,
  },
  {
    key: 'pro' as const,
    name: 'Pro',
    description: 'For active investors and agents',
    monthly: { price: '$69', period: 'per month' },
    annual: { price: '$55', period: 'per month, billed annually' },
    features: [
      'Unlimited deal analyses',
      'Unlimited pipeline deals',
      'AI offer letter generator',
      'Document AI (10 uploads/mo)',
      'Deal sharing links',
      'Priority support',
    ],
    cta: 'Start 14-day trial',
    ctaLink: '/register?plan=pro',
    highlighted: true,
    comingSoon: false,
  },
  {
    key: 'team' as const,
    name: 'Team',
    description: 'For real estate teams and brokerages',
    monthly: { price: '$99', period: 'per seat/month' },
    annual: { price: '$79', period: 'per seat/month, billed annually' },
    features: [
      'Everything in Pro',
      'Up to 10 team members',
      'Shared pipeline & deals',
      'Role-based access control',
      'Unlimited document AI',
      'Team analytics dashboard',
    ],
    cta: 'Contact us',
    ctaLink: 'mailto:team@parcel.app',
    highlighted: false,
    comingSoon: true,
  },
]

const COMPARISON: ComparisonCategory[] = [
  {
    name: 'Deal Analysis',
    rows: [
      { feature: 'Analyses per month', free: '5', pro: 'Unlimited', team: 'Unlimited' },
      { feature: 'Strategy types', free: '5', pro: '5', team: '5' },
      {
        feature: 'AI chat messages/mo',
        free: '10',
        pro: '150',
        team: 'Unlimited',
        tooltip: 'Messages to the AI deal specialist per calendar month',
      },
      { feature: 'Chat history', free: '7 days', pro: 'Unlimited', team: 'Unlimited' },
    ],
  },
  {
    name: 'Pipeline',
    rows: [
      { feature: 'Active deals', free: '10', pro: 'Unlimited', team: 'Unlimited' },
      { feature: 'Kanban board', free: true, pro: true, team: true },
      { feature: 'Deal sharing links', free: false, pro: true, team: true },
      { feature: 'Custom stages', free: false, pro: false, team: true },
    ],
  },
  {
    name: 'Documents',
    rows: [
      { feature: 'Uploads per month', free: '3', pro: '10', team: 'Unlimited' },
      {
        feature: 'AI document extraction',
        free: false,
        pro: true,
        team: true,
        tooltip: 'Automatically extract key terms from uploaded contracts and disclosures',
      },
      { feature: 'Storage', free: '100 MB', pro: '5 GB', team: '50 GB' },
    ],
  },
  {
    name: 'AI Features',
    rows: [
      {
        feature: 'Offer letter generator',
        free: false,
        pro: true,
        team: true,
        tooltip: 'AI-generated LOI and offer letters based on your deal analysis',
      },
      { feature: 'Market analysis', free: false, pro: true, team: true },
      { feature: 'Deal comparison', free: false, pro: true, team: true },
    ],
  },
  {
    name: 'Export & Reports',
    rows: [
      { feature: 'PDF deal reports', free: true, pro: true, team: true },
      { feature: 'Custom branding', free: false, pro: false, team: true },
      { feature: 'Portfolio export', free: false, pro: true, team: true },
    ],
  },
  {
    name: 'Support',
    rows: [
      { feature: 'Community support', free: true, pro: true, team: true },
      { feature: 'Priority email support', free: false, pro: true, team: true },
      { feature: 'Onboarding call', free: false, pro: false, team: true },
    ],
  },
]

const FAQ_DATA = [
  {
    q: 'What happens after my 14-day trial ends?',
    a: 'Your account automatically reverts to the Free plan. You keep all your data \u2014 nothing is deleted. You can upgrade again anytime from your Settings page.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. No contracts, no cancellation fees. Cancel from your Settings page in two clicks. Your Pro access continues until the end of the current billing period.',
  },
  {
    q: 'What counts as a \u201cdeal analysis\u201d?',
    a: 'Each time you run a calculator (BRRRR, Wholesale, Flip, Buy & Hold, or Creative Finance) on a property, that counts as one analysis. Re-running the same property with different numbers does not count as a new analysis.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'Yes. We offer a 30-day money-back guarantee. If Pro isn\u2019t right for you, email us within 30 days of your first payment for a full refund.',
  },
  {
    q: 'Is my data secure?',
    a: 'All data is encrypted in transit (TLS 1.3) and at rest. We never share or sell your data. Your deal information is yours.',
  },
  {
    q: 'Can I switch between monthly and annual billing?',
    a: 'Yes. Switch to annual to save 20% ($168/yr). Upgrades take effect immediately. Downgrades take effect at the end of your current billing period.',
  },
]

/* ── Sub-Components ── */

function ComparisonCell({
  value,
  isProColumn = false,
}: {
  value: string | boolean
  isProColumn?: boolean
}) {
  return (
    <td className={cn('py-3 px-4 text-center', isProColumn && 'bg-accent-primary/[0.03]')}>
      {value === true ? (
        <Check size={14} className="text-accent-success mx-auto" />
      ) : value === false ? (
        <span className="text-text-muted">&mdash;</span>
      ) : (
        <span
          className={cn(
            'text-sm font-mono',
            isProColumn ? 'text-text-primary font-medium' : 'text-text-secondary',
          )}
        >
          {value}
        </span>
      )}
    </td>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)

  return (
    <motion.div variants={staggerItem}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary
          focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg rounded"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-text-primary pr-4 group-hover:text-accent-primary transition-colors">
          {question}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="shrink-0"
        >
          <ChevronDown size={16} className="text-text-muted" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="text-sm text-text-secondary leading-relaxed pb-5">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ── Main Page Component ── */

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)
  const [showComparison, setShowComparison] = useState(false)
  const [comparisonTab, setComparisonTab] = useState<'free' | 'pro' | 'team'>('pro')
  const proCardRef = useRef<HTMLDivElement>(null)
  const [showStickyCTA, setShowStickyCTA] = useState(false)

  // Sticky mobile CTA: show when Pro card is out of viewport
  useEffect(() => {
    const el = proCardRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyCTA(!entry.isIntersecting),
      { threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-app-bg text-text-primary">
      {/* ── Hero ── */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-5xl mx-auto space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-4 text-center"
          >
            <p className="text-[10px] uppercase tracking-[0.08em] text-accent-primary font-semibold">
              Pricing
            </p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-text-primary">
              Five free analyses.{' '}
              <span className="text-accent-primary">Upgrade when you close.</span>
            </h1>
            <p className="text-base text-text-secondary max-w-md mx-auto">
              No annual contracts. No per-deal fees. Cancel any time.
            </p>
            <div className="flex justify-center pt-2">
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium bg-accent-primary/10 border border-accent-primary/20 text-accent-primary">
                <Sparkles size={12} />
                14-day free trial on all Pro features
              </span>
            </div>
          </motion.div>

          {/* Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="flex justify-center"
          >
            <div
              className="rounded-xl bg-app-elevated border border-border-subtle p-1 inline-flex items-center gap-1"
              role="radiogroup"
              aria-label="Billing period"
            >
              <button
                type="button"
                role="radio"
                aria-checked={!isAnnual}
                onClick={() => setIsAnnual(false)}
                className={cn(
                  'px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary',
                  !isAnnual
                    ? 'bg-accent-primary text-white shadow-sm shadow-accent-primary/25'
                    : 'bg-transparent text-text-secondary hover:text-text-primary',
                )}
              >
                Monthly
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={isAnnual}
                onClick={() => setIsAnnual(true)}
                className={cn(
                  'px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 inline-flex items-center gap-2',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary',
                  isAnnual
                    ? 'bg-accent-primary text-white shadow-sm shadow-accent-primary/25'
                    : 'bg-transparent text-text-secondary hover:text-text-primary',
                )}
              >
                Annual
                <span className="text-[10px] font-bold uppercase tracking-wide bg-accent-success/20 text-accent-success px-1.5 py-0.5 rounded">
                  Save 20%
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Social Proof Strip ── */}
      <section className="py-8 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: '$840M+', label: 'Deal value tracked' },
              { value: '2,400+', label: 'Deals analyzed' },
              { value: '48', label: 'Markets covered' },
              { value: '4.9\u2605', label: 'Avg. rating' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="space-y-1"
              >
                <p className="text-lg font-mono font-semibold text-text-primary">{stat.value}</p>
                <p className="text-[11px] text-text-muted tracking-wide">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing Cards ── */}
      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {TIERS.map((tier, i) => {
              const price = isAnnual ? tier.annual : tier.monthly
              const isHighlighted = tier.highlighted
              const mobileOrder = tier.key === 'pro' ? 'order-1' : tier.key === 'free' ? 'order-2' : 'order-3'

              return (
                <motion.div
                  key={tier.key}
                  ref={tier.key === 'pro' ? proCardRef : undefined}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.4, delay: i * 0.07 }}
                  whileHover={{ y: -4 }}
                  className={cn(
                    'rounded-2xl border p-6 flex flex-col relative overflow-hidden transition-shadow duration-300',
                    mobileOrder,
                    `md:order-${i + 1}`,
                    isHighlighted
                      ? 'border-accent-primary/50 bg-accent-primary/[0.04] hover:shadow-xl hover:shadow-accent-primary/15 md:scale-[1.02]'
                      : 'border-border-subtle bg-app-surface hover:shadow-lg hover:shadow-black/20',
                  )}
                >
                  {/* Pro: top gradient + ambient glow */}
                  {isHighlighted && (
                    <>
                      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent-primary to-transparent" />
                      <div
                        className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full pointer-events-none"
                        style={{ background: 'rgba(99,102,241,0.15)', filter: 'blur(40px)' }}
                        aria-hidden="true"
                      />
                    </>
                  )}

                  {/* Header */}
                  <div className="space-y-1 mb-6 relative">
                    {isHighlighted && (
                      <div className="space-y-1 mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-accent-primary">
                          Most popular
                        </p>
                        <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-accent-success">
                          14-day free trial
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold text-text-primary">{tier.name}</p>
                      {tier.comingSoon && (
                        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted bg-app-elevated px-2 py-0.5 rounded">
                          Coming soon
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted">{tier.description}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-6 relative">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={isAnnual ? 'annual' : 'monthly'}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                        className="flex items-baseline gap-1.5"
                      >
                        <span className="text-5xl font-bold font-mono text-text-primary">
                          {price.price}
                        </span>
                        <span className="text-sm text-text-muted">/ {price.period}</span>
                      </motion.div>
                    </AnimatePresence>

                    {/* Annual savings (Pro only) */}
                    {isAnnual && tier.key === 'pro' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="flex items-center gap-2 mt-2"
                      >
                        <span className="text-sm font-mono text-text-muted line-through">$69</span>
                        <span className="text-[11px] font-medium text-accent-success bg-accent-success/10 px-2 py-0.5 rounded">
                          Save $168/yr
                        </span>
                      </motion.div>
                    )}

                    {/* Per-day reframe (Pro only) */}
                    {tier.key === 'pro' && (
                      <p className="text-[11px] text-text-muted mt-1.5">
                        Less than $2.30/day
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-6 flex-1 relative">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-text-secondary">
                        <Check size={14} className="text-accent-success mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* Free tier upgrade hint */}
                  {tier.key === 'free' && (
                    <p className="text-xs text-text-muted mb-4 text-center">
                      Need more? Upgrade to Pro anytime.
                    </p>
                  )}

                  {/* Pro: inline trial micro-banner */}
                  {isHighlighted && (
                    <div className="rounded-lg bg-accent-success/[0.08] border border-accent-success/15 px-3 py-2.5 mb-4">
                      <p className="text-xs text-accent-success text-center font-medium">
                        Try all Pro features free for 14 days. No credit card required.
                      </p>
                    </div>
                  )}

                  {/* CTA */}
                  {tier.comingSoon ? (
                    <a href={tier.ctaLink} className="block mt-auto">
                      <Button
                        variant="outline"
                        className="w-full h-11 text-sm font-semibold cursor-pointer
                          bg-app-elevated hover:bg-border-subtle text-text-primary
                          border-border-default hover:border-border-strong transition-colors duration-150"
                      >
                        {tier.cta}
                      </Button>
                    </a>
                  ) : (
                    <Link to={tier.ctaLink} className="block mt-auto">
                      <Button
                        className={cn(
                          'w-full h-11 text-sm font-semibold cursor-pointer transition-all duration-150',
                          isHighlighted
                            ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-lg shadow-indigo-500/20'
                            : 'bg-app-elevated hover:bg-border-subtle text-text-primary border border-border-default hover:border-border-strong',
                        )}
                      >
                        {tier.cta}
                      </Button>
                    </Link>
                  )}

                  {/* Pro: micro-reassurance */}
                  {isHighlighted && (
                    <p className="text-[11px] text-text-muted text-center mt-2.5">
                      No credit card required
                    </p>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Feature Comparison ── */}
      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <button
            type="button"
            onClick={() => setShowComparison(!showComparison)}
            className="flex items-center gap-2 mx-auto text-sm text-text-secondary hover:text-text-primary transition-colors group"
            aria-expanded={showComparison}
          >
            <span className="border-b border-dashed border-text-muted group-hover:border-text-secondary transition-colors">
              Compare all features
            </span>
            <motion.div
              animate={{ rotate: showComparison ? 180 : 0 }}
              transition={{ duration: 0.25 }}
            >
              <ChevronDown size={14} />
            </motion.div>
          </button>

          <AnimatePresence>
            {showComparison && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                {/* Desktop table */}
                <div className="hidden md:block mt-8 rounded-xl border border-border-subtle overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-app-elevated border-b border-border-subtle">
                        <th className="py-3 px-4 text-xs font-medium text-text-muted w-[40%]">Feature</th>
                        <th className="py-3 px-4 text-xs font-medium text-text-muted text-center w-[20%]">Free</th>
                        <th className="py-3 px-4 text-xs font-medium text-accent-primary text-center w-[20%]">Pro</th>
                        <th className="py-3 px-4 text-xs font-medium text-text-muted text-center w-[20%]">Team</th>
                      </tr>
                    </thead>
                    <tbody>
                      {COMPARISON.map((category) => (
                        <Fragment key={category.name}>
                          <tr className="bg-app-surface/50">
                            <td colSpan={4} className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                              {category.name}
                            </td>
                          </tr>
                          {category.rows.map((row) => (
                            <tr key={row.feature} className="border-b border-border-subtle/50 hover:bg-app-elevated/30 transition-colors">
                              <td className="py-3 px-4 text-sm text-text-secondary">
                                <span className="inline-flex items-center gap-1.5">
                                  {row.feature}
                                  {row.tooltip && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <HelpCircle size={12} className="text-text-muted hover:text-text-secondary cursor-help shrink-0" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-[240px] text-xs">{row.tooltip}</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </span>
                              </td>
                              <ComparisonCell value={row.free} />
                              <ComparisonCell value={row.pro} isProColumn />
                              <ComparisonCell value={row.team} />
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile: tabbed single-column */}
                <div className="md:hidden mt-6">
                  <div className="flex gap-1 p-1 rounded-lg bg-app-elevated border border-border-subtle mb-4">
                    {(['free', 'pro', 'team'] as const).map((tier) => (
                      <button
                        key={tier}
                        onClick={() => setComparisonTab(tier)}
                        className={cn(
                          'flex-1 py-2 rounded-md text-xs font-medium transition-colors capitalize',
                          comparisonTab === tier
                            ? 'bg-accent-primary text-white'
                            : 'text-text-secondary hover:text-text-primary',
                        )}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                  {COMPARISON.map((category) => (
                    <div key={category.name} className="mb-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">
                        {category.name}
                      </p>
                      {category.rows.map((row) => {
                        const val = row[comparisonTab]
                        return (
                          <div key={row.feature} className="flex items-center justify-between py-2.5 border-b border-border-subtle/30">
                            <span className="text-sm text-text-secondary">{row.feature}</span>
                            {val === true ? (
                              <Check size={14} className="text-accent-success" />
                            ) : val === false ? (
                              <span className="text-text-muted text-sm">&mdash;</span>
                            ) : (
                              <span className="text-sm font-mono text-text-primary">{val}</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── Testimonial ── */}
      <section className="py-20 px-6 border-t border-border-subtle">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="max-w-2xl mx-auto text-center space-y-6"
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-base font-semibold mx-auto"
            style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366F1' }}
            aria-hidden="true"
          >
            JN
          </div>
          <blockquote className="text-lg md:text-xl text-text-secondary leading-relaxed font-medium">
            &ldquo;Parcel paid for itself on my first deal. The BRRRR calculator alone
            saved me from a property that looked good on paper but would have been
            negative cash flow after the refi.&rdquo;
          </blockquote>
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-text-primary">Jason Nguyen</p>
            <p className="text-xs text-text-muted">BRRRR Specialist &middot; Phoenix, AZ</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-accent-primary/10 border border-accent-primary/20">
            <span className="text-sm font-mono font-semibold text-accent-primary">14.2%</span>
            <span className="text-xs text-text-muted">avg cash-on-cash return</span>
          </div>
        </motion.div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 px-6 border-t border-border-subtle">
        <div className="max-w-2xl mx-auto space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35 }}
            className="text-center space-y-3"
          >
            <p className="text-[10px] uppercase tracking-[0.08em] text-accent-primary font-semibold">FAQ</p>
            <h2 className="text-3xl font-semibold tracking-tight text-text-primary">Common questions</h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer(60)}
            className="divide-y divide-border-subtle"
          >
            {FAQ_DATA.map((item, i) => (
              <FAQItem key={i} question={item.q} answer={item.a} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="py-24 px-6 border-t border-border-subtle relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 60% 60% at 50% 100%, rgba(99,102,241,0.12) 0%, transparent 70%)',
          }}
          aria-hidden="true"
        />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="relative max-w-2xl mx-auto text-center space-y-5"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary tracking-tight">
            Start analyzing deals today
          </h2>
          <p className="text-sm text-text-secondary max-w-sm mx-auto">
            Your first 5 analyses are free. No credit card needed.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link to="/register?plan=pro">
              <Button className="h-12 px-8 text-sm font-semibold cursor-pointer bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-lg shadow-indigo-500/20 transition-all duration-150">
                Start 14-day Pro trial
                <ArrowRight size={14} className="ml-2" />
              </Button>
            </Link>
            <Link to="/register">
              <Button
                variant="outline"
                className="h-12 px-8 text-sm font-semibold cursor-pointer bg-transparent hover:bg-app-elevated text-text-secondary hover:text-text-primary border-border-default hover:border-border-strong transition-all duration-150"
              >
                Start free
              </Button>
            </Link>
          </div>
          <p className="text-[11px] text-text-muted pt-1">
            No credit card required &middot; Cancel anytime
          </p>
        </motion.div>
      </section>

      {/* ── Mobile Sticky CTA ── */}
      <AnimatePresence>
        {showStickyCTA && (
          <motion.div
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-app-bg/90 backdrop-blur-lg border-t border-border-subtle px-4 py-3"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">
                  Pro &mdash; {isAnnual ? '$55/mo' : '$69/mo'}
                </p>
                <p className="text-[11px] text-text-muted">14-day free trial</p>
              </div>
              <Link to="/register?plan=pro">
                <Button className="h-10 px-5 text-xs font-semibold cursor-pointer shrink-0 bg-accent-primary hover:bg-accent-hover text-white transition-colors duration-150">
                  Start trial
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile spacer for sticky CTA */}
      <div className="md:hidden h-20" />
    </div>
  )
}
```

---

## CRITICAL DECISIONS

### 1. Price Point: $69/mo (not $29)

The current `constants.ts` has Pro at $29/mo. The actual price is $69/mo,
annual at $55/mo ($660/yr). This must be updated before any pricing page
goes live. The $29 price in the codebase will confuse visitors if it reaches
production.

**Action:** Update `PRICING` in `constants.ts` and `ANNUAL_PRICES` in
`pricing.tsx` to $69 monthly / $55 annual.

### 2. Dedicated Route vs Landing Section

This design is for a **standalone `/pricing` route**, not the existing landing
page section. Both should exist:
- **Landing page section** (`pricing.tsx`): Compact, no FAQ, no comparison
  table. Exists to catch scrollers.
- **Dedicated route** (`PricingPage.tsx`): Full experience with stats,
  comparison, testimonial, FAQ, and bottom CTA. Linked from the app navbar,
  marketing emails, and external campaigns.

The dedicated page imports the same data but renders a different layout.

### 3. Team Tier: Display "Coming Soon" or Hide?

**Decision: Display with "Coming soon" badge.** The Team column serves as a
price anchor ($99/mo makes $69/mo feel reasonable) and signals that Parcel
is built for growth. Hiding it creates a binary free-or-paid ultimatum that
converts 1.4x worse per Paddle/ProfitWell data. The "Contact us" CTA
collects early interest without making false promises.

### 4. Comparison Table: Collapsed by Default

**Decision: Collapsed.** The pricing cards contain 5-6 features each — enough
for 80% of visitors. The comparison table is for the detail-oriented 20% who
need line-item verification. Expanding it by default would push the testimonial
and FAQ off-screen, hurting the conversion flow for the majority. The "Compare
all features" trigger is discoverable (dashed underline, chevron icon).

### 5. Default to Monthly Billing

**Decision: Monthly is the default toggle state.** Defaulting to annual feels
manipulative when the user has not yet evaluated the product. The savings badge
on the "Annual" button is sufficient to pull price-sensitive users. Transparency
builds trust at a $69/mo price point where the purchase decision is deliberate.

### 6. Single Testimonial (Not Carousel)

**Decision: One testimonial on the pricing page.** The landing page already has
a 5-testimonial carousel. Repeating a carousel here fragments attention on a
page optimized for a single action. One strong quote from Jason Nguyen — who
mentions a specific feature (BRRRR calculator) and a concrete outcome (avoided
a bad deal) — is the most conversion-effective pattern for a pricing page.

### 7. Pro Card Scale: `md:scale-[1.02]`

**Decision: 2% scale-up on desktop only.** This creates a subtle visual weight
difference without breaking the grid alignment. On mobile, all cards are
full-width and stacked — scaling would look odd. The scale is small enough
that the card still aligns with the grid gap, but large enough that the
eye subconsciously registers the Pro card as "bigger" (and therefore more
important).

### 8. Mobile Card Order: Pro First

**Decision: Use `order-1` on Pro card for mobile.** Showing Free first on
mobile means the user sees $0, feels satisfied, and may never scroll to Pro.
Showing Pro first ensures the conversion target is above the fold. This
is a non-negotiable mobile optimization backed by SaaS conversion data
showing 10%+ improvement when the recommended plan is first on mobile.

### 9. No Navbar on Pricing Page (Initially)

**Decision: The page needs a navbar but not the full landing Navbar.**
For the initial implementation, reuse the landing `<Navbar />` component.
Later, consider a minimal pricing-specific header with just the logo and
a "Sign in" link, reducing distractions. The current Navbar has navigation
links that could leak users away from the conversion page.

### 10. FAQ Count: 6 Questions

**Decision: 6 questions, not more.** Research shows FAQ sections with more
than 8 questions have diminishing returns — users stop reading after 5-6.
The selected questions target the five most common pricing objections:
trial mechanics, cancellation, billing definition, refunds, security, and
plan switching. If analytics later show a recurring support question,
replace the lowest-performing FAQ entry.
