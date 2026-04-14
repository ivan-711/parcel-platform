# Agent 11 — Billing UI Components for Parcel (Light Theme)

Complete, implementation-ready JSX + Tailwind for every billing-related component.
All components use the light theme design tokens from `agent-01-design-tokens.md`:
white card surfaces, `#F9FAFB` page background, `#4F46E5` indigo CTAs, Inter font
family, JetBrains Mono for financial figures. Framer Motion variants reference the
existing `motion.ts` system (`DURATION`, `EASING`, `SPRING`, `staggerContainer`,
`staggerItem`).

---

## 1. PaywallOverlay

Blur-mask over gated content with a centered upgrade card. The user sees the top
portion of their analysis results rendered normally; the bottom 60% blurs behind
a gradient mask with the upgrade card floating on top.

### Props

```tsx
interface PaywallOverlayProps {
  feature: 'analyses' | 'chat' | 'pdf' | 'deals' | 'offer_letter'
  onUpgrade: () => void
  onDismiss?: () => void
}
```

### Copy Map

```tsx
const PAYWALL_COPY: Record<PaywallOverlayProps['feature'], {
  heading: string
  description: string
  cta: string
}> = {
  analyses: {
    heading: 'Your full analysis is ready',
    description: 'Unlock all metrics, cash flow projections, and comparison data with Parcel Pro.',
    cta: 'Unlock Full Analysis',
  },
  chat: {
    heading: 'AI Chat is a Pro feature',
    description: 'Get instant answers about your deals from our AI real estate specialist.',
    cta: 'Unlock AI Chat',
  },
  pdf: {
    heading: 'PDF export is a Pro feature',
    description: 'Download branded reports to share with partners and lenders.',
    cta: 'Unlock PDF Reports',
  },
  deals: {
    heading: "You've reached the deal limit",
    description: 'Upgrade to track unlimited deals in your pipeline.',
    cta: 'Unlock Unlimited Deals',
  },
  offer_letter: {
    heading: 'Offer letters are a Pro feature',
    description: 'Generate professional offer letters powered by AI in seconds.',
    cta: 'Unlock Offer Letters',
  },
}
```

### JSX

```tsx
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Sparkles, ArrowRight } from 'lucide-react'
import { DURATION, EASING, SPRING } from '@/lib/motion'

// ── Framer Motion variants ──────────────────────────────────────────────────

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATION.slow, ease: EASING.smooth },
  },
  exit: {
    opacity: 0,
    transition: { duration: DURATION.normal },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...SPRING.gentle, delay: 0.15 },
  },
  exit: {
    opacity: 0,
    y: 12,
    scale: 0.98,
    transition: { duration: DURATION.fast },
  },
}

// ── Component ───────────────────────────────────────────────────────────────

export function PaywallOverlay({ feature, onUpgrade, onDismiss }: PaywallOverlayProps) {
  const copy = PAYWALL_COPY[feature]

  return (
    <AnimatePresence>
      <motion.div
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="absolute inset-0 z-40 flex items-center justify-center
          bg-gradient-to-b from-transparent via-white/60 to-white/95
          backdrop-blur-md"
      >
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="w-full max-w-md mx-4 bg-white rounded-xl border border-gray-200
            shadow-xl p-8 text-center"
        >
          {/* Lock icon in tinted circle */}
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center
            rounded-full bg-indigo-50">
            <Lock className="h-6 w-6 text-indigo-600" />
          </div>

          {/* Heading */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {copy.heading}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            {copy.description}
          </p>

          {/* Value prop bullets */}
          <ul className="text-left space-y-2.5 mb-6">
            {[
              'Unlimited deal analyses',
              '150 AI chat messages/mo',
              'PDF reports & offer letters',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-gray-700">
                <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" />
                {item}
              </li>
            ))}
          </ul>

          {/* Primary CTA */}
          <button
            onClick={onUpgrade}
            className="w-full flex items-center justify-center gap-2
              rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white
              shadow-md shadow-indigo-600/20
              hover:bg-indigo-700 active:bg-indigo-800
              transition-colors duration-150"
          >
            {copy.cta}
            <ArrowRight className="h-4 w-4" />
          </button>

          {/* Secondary link */}
          <button
            onClick={onDismiss}
            className="mt-3 text-xs text-gray-400 hover:text-gray-600
              transition-colors duration-150"
          >
            Maybe later
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
```

### Key Decisions

- **White gradient mask** (`via-white/60 to-white/95`) instead of dark mask. On the
  light theme the blur-to-white treatment feels native — the page dissolves into the
  background rather than darkening.
- **`shadow-xl` on card** for elevated float. The `shadow-indigo-600/20` on the CTA
  button adds a subtle brand glow without being garish on a white surface.
- **No close X button.** Dismissal is via "Maybe later" text link. An X would imply
  the content behind is fully accessible, which it is not.

---

## 2. FeatureGate

Wrapper component that renders children normally for Pro users and shows the
PaywallOverlay for free-tier users. This is the primary gating primitive.

### Props

```tsx
interface FeatureGateProps {
  /** Which feature to check access for */
  feature: 'analyses' | 'chat' | 'pdf' | 'deals' | 'offer_letter'
  /** Content to render if the user has access */
  children: React.ReactNode
  /** Optional: render partial content above the paywall (e.g., 2 visible KPI cards) */
  teaser?: React.ReactNode
  /** Override the gate — useful for testing */
  forceGated?: boolean
}
```

### JSX

```tsx
import { useNavigate } from 'react-router-dom'
import { useBillingStore } from '@/stores/billing-store'
import { PaywallOverlay } from '@/components/billing/PaywallOverlay'

export function FeatureGate({ feature, children, teaser, forceGated }: FeatureGateProps) {
  const navigate = useNavigate()
  const { canAccess } = useBillingStore()

  const isGated = forceGated ?? !canAccess(feature)

  if (!isGated) {
    return <>{children}</>
  }

  return (
    <div className="relative">
      {/* Teaser content (partially visible above blur) */}
      {teaser && (
        <div className="select-none pointer-events-none" aria-hidden="true">
          {teaser}
        </div>
      )}

      {/* Full children rendered but hidden behind overlay */}
      {!teaser && (
        <div className="select-none pointer-events-none opacity-40 blur-[2px]" aria-hidden="true">
          {children}
        </div>
      )}

      {/* Paywall */}
      <PaywallOverlay
        feature={feature}
        onUpgrade={() => navigate(`/upgrade?from=${feature}`)}
      />
    </div>
  )
}
```

### Usage Example

```tsx
{/* On ResultsPage — show 2 KPI cards as teaser, blur the rest */}
<FeatureGate
  feature="analyses"
  teaser={<KPICardRow cards={results.kpis.slice(0, 2)} />}
>
  <FullResultsContent results={results} />
</FeatureGate>
```

### Key Decisions

- **`canAccess` is a Zustand selector**, not a hook that fetches. The billing store
  is hydrated once on auth, so gate checks are synchronous and never cause loading
  flicker.
- **Two rendering modes.** If `teaser` is provided, the teaser renders above the
  overlay cleanly. If not, children render blurred at 40% opacity as a generic preview.
- **`aria-hidden="true"`** on gated content prevents screen readers from reading
  inaccessible data.

---

## 3. TrialBanner

Slim persistent banner at the top of the authenticated content area showing trial
countdown. Color escalates from informational indigo to urgent amber as expiration
approaches.

### Props

```tsx
interface TrialBannerProps {
  daysRemaining: number
  onUpgrade: () => void
  onDismiss: () => void
}
```

### JSX

```tsx
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, X } from 'lucide-react'
import { DURATION, EASING } from '@/lib/motion'

const bannerVariants = {
  hidden: { y: -40, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: DURATION.normal, ease: EASING.snappy },
  },
  exit: {
    y: -40,
    opacity: 0,
    transition: { duration: DURATION.fast },
  },
}

export function TrialBanner({ daysRemaining, onUpgrade, onDismiss }: TrialBannerProps) {
  const isUrgent = daysRemaining <= 3
  const isLastDay = daysRemaining <= 1

  // ── Color scheme ──────────────────────────────────────────────────────────
  //    Normal (>3 days): indigo tint on white
  //    Urgent (<=3 days): amber tint
  //    Last day: amber tint + pulsing dot

  const bannerClasses = isUrgent
    ? 'bg-amber-50 border-b border-amber-200 text-amber-800'
    : 'bg-indigo-50 border-b border-indigo-200 text-indigo-700'

  // ── Copy ──────────────────────────────────────────────────────────────────

  const message = isLastDay
    ? 'Your Pro trial ends today'
    : isUrgent
    ? `Your Pro trial ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`
    : `Pro trial \u2014 ${daysRemaining} days remaining`

  const ctaLabel = isUrgent ? 'Keep Pro Features' : 'Upgrade'

  return (
    <AnimatePresence>
      <motion.div
        variants={bannerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        role="status"
        aria-live="polite"
        className={`flex items-center justify-center gap-3 px-4 py-2 text-xs
          font-medium ${bannerClasses}`}
      >
        {/* Pulsing dot — last day only */}
        {isLastDay && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping
              rounded-full bg-amber-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>
        )}

        {/* Clock icon */}
        {!isLastDay && (
          <Clock className="h-3.5 w-3.5 shrink-0 opacity-70" />
        )}

        {/* Message */}
        <span>{message}</span>

        {/* CTA */}
        {isUrgent ? (
          <button
            onClick={onUpgrade}
            className="ml-1 rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold
              text-white hover:bg-indigo-700 transition-colors duration-150"
          >
            {ctaLabel}
          </button>
        ) : (
          <button
            onClick={onUpgrade}
            className="ml-1 font-semibold underline underline-offset-2
              hover:no-underline transition-all duration-150"
          >
            {ctaLabel}
          </button>
        )}

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          className="ml-auto p-1 rounded-md hover:bg-black/5 transition-colors
            duration-150"
          aria-label="Dismiss trial banner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
```

### Dismiss Logic (in consuming component or store)

```tsx
function handleDismissTrialBanner() {
  // Store with 24h TTL — banner returns the next day
  localStorage.setItem(
    'trial-banner-dismissed',
    JSON.stringify({ at: Date.now(), ttl: 86400000 })
  )
}

function isTrialBannerDismissed(): boolean {
  try {
    const raw = localStorage.getItem('trial-banner-dismissed')
    if (!raw) return false
    const { at, ttl } = JSON.parse(raw)
    return Date.now() - at < ttl
  } catch {
    return false
  }
}
```

### Color Escalation Summary

| State | Background | Border | Text | Icon |
|-------|-----------|--------|------|------|
| Normal (>3 days) | `bg-indigo-50` | `border-indigo-200` | `text-indigo-700` | Clock |
| Urgent (<=3 days) | `bg-amber-50` | `border-amber-200` | `text-amber-800` | Clock |
| Last day | `bg-amber-50` | `border-amber-200` | `text-amber-800` | Pulsing dot |

---

## 4. PlanBadge

Small inline badge shown in the sidebar next to the user's name or below the
navigation. Communicates current tier at a glance.

### Props

```tsx
interface PlanBadgeProps {
  plan: 'free' | 'pro' | 'trial'
}
```

### JSX

```tsx
import { cn } from '@/lib/utils'

const BADGE_STYLES: Record<PlanBadgeProps['plan'], string> = {
  free: 'bg-gray-100 text-gray-500 border-gray-200',
  pro: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  trial: 'bg-amber-50 text-amber-700 border-amber-200',
}

const BADGE_LABELS: Record<PlanBadgeProps['plan'], string> = {
  free: 'Free',
  pro: 'Pro',
  trial: 'Trial',
}

export function PlanBadge({ plan }: PlanBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5',
        'text-[10px] font-semibold uppercase tracking-wide',
        'border',
        BADGE_STYLES[plan]
      )}
    >
      {BADGE_LABELS[plan]}
    </span>
  )
}
```

### Sidebar Integration

```tsx
{/* Inside AppShell sidebar, below user info */}
<div className="flex items-center gap-2 px-4 py-2">
  <span className="text-sm font-medium text-gray-900 truncate">
    {user.name}
  </span>
  <PlanBadge plan={billing.planBadgeType} />
</div>

{/* If free tier, show upgrade button */}
{billing.plan === 'free' && (
  <Link
    to="/upgrade"
    className="mx-4 mb-4 flex items-center justify-center gap-1.5
      rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2
      text-xs font-semibold text-indigo-700
      hover:bg-indigo-100 transition-colors duration-150"
  >
    <Sparkles className="h-3.5 w-3.5" />
    Upgrade to Pro
  </Link>
)}
```

### Key Decisions

- **10px uppercase** keeps the badge tiny and unobtrusive in the sidebar context.
- **No gradient or glow on Pro badge.** On a light theme, a simple tinted pill reads
  cleaner than a gradient, which can look gaudy on white backgrounds.
- **Trial uses amber** (same as the urgent banner) to create a visual thread connecting
  the badge to the trial countdown.

---

## 5. UsageMeter

Horizontal progress bar showing consumption against the tier cap. Color shifts from
indigo (healthy) to amber (warning at 80%) to red (critical at 100%).

### Props

```tsx
interface UsageMeterProps {
  label: string
  used: number
  limit: number
  /** If true, show "used" count but no bar (for Pro "unlimited" resources) */
  unlimited?: boolean
}
```

### JSX

```tsx
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EASING } from '@/lib/motion'

export function UsageMeter({ label, used, limit, unlimited = false }: UsageMeterProps) {
  const percent = unlimited ? 0 : Math.min((used / limit) * 100, 100)
  const isWarning = percent >= 80 && percent < 100
  const isCritical = percent >= 100

  const barColor = isCritical
    ? 'bg-red-500'
    : isWarning
    ? 'bg-amber-500'
    : 'bg-indigo-500'

  return (
    <div className="space-y-1.5">
      {/* Label + count row */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-sm font-mono text-gray-500">
          {unlimited ? (
            <>{used} used</>
          ) : (
            <>
              <span className={cn(
                'font-semibold',
                isCritical && 'text-red-600',
                isWarning && 'text-amber-600',
              )}>
                {used}
              </span>
              {' '}of {limit}
            </>
          )}
        </span>
      </div>

      {/* Progress bar */}
      {!unlimited && (
        <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
          <motion.div
            className={cn('h-full rounded-full', barColor)}
            initial={{ width: '0%' }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.8, ease: EASING.smooth }}
          />
        </div>
      )}

      {/* Warning text */}
      {isWarning && !unlimited && (
        <p className="text-xs text-amber-600 font-medium">
          Approaching limit — upgrade for more capacity.
        </p>
      )}

      {/* Critical text */}
      {isCritical && !unlimited && (
        <p className="text-xs text-red-600 font-medium">
          Limit reached.
        </p>
      )}
    </div>
  )
}
```

### UsageMeters Container (for Billing Settings)

```tsx
interface UsageMetersProps {
  meters: Array<{
    key: string
    label: string
    used: number
    limit: number
    unlimited?: boolean
  }>
  resetDate: string // ISO date
}

export function UsageMeters({ meters, resetDate }: UsageMetersProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-5">
        Usage This Period
      </h3>
      <div className="space-y-5">
        {meters.map((m) => (
          <UsageMeter key={m.key} {...m} />
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-5">
        Resets on {new Date(resetDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </p>
    </div>
  )
}
```

### Color Thresholds

| Range | Bar Color | Count Color | Helper Text |
|-------|----------|-------------|-------------|
| 0-79% | `bg-indigo-500` | default gray | none |
| 80-99% | `bg-amber-500` | `text-amber-600` | "Approaching limit" |
| 100% | `bg-red-500` | `text-red-600` | "Limit reached" |

---

## 6. LimitReachedModal

Empathetic modal shown when a user hits their tier cap. Uses shadcn `AlertDialog`
(already installed). Never says "you can't do this" — always frames as "upgrade to
unlock."

### Props

```tsx
interface LimitReachedModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  feature: 'analyses' | 'deals' | 'chat' | 'pdf'
  onUpgrade: () => void
}
```

### Copy Map

```tsx
const LIMIT_COPY: Record<LimitReachedModalProps['feature'], {
  heading: string
  subheading: string
}> = {
  analyses: {
    heading: "You've used all your free analyses",
    subheading: 'Your data is safe \u2014 upgrade to keep analyzing deals.',
  },
  deals: {
    heading: "You've reached the deal limit",
    subheading: 'Upgrade to track unlimited deals in your pipeline.',
  },
  chat: {
    heading: 'AI Chat is a Pro feature',
    subheading: 'Get instant answers about your deals from our AI specialist.',
  },
  pdf: {
    heading: 'PDF export is a Pro feature',
    subheading: 'Download branded reports to share with partners and lenders.',
  },
}
```

### JSX

```tsx
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog'
import { Zap, CheckCircle, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export function LimitReachedModal({
  open,
  onOpenChange,
  feature,
  onUpgrade,
}: LimitReachedModalProps) {
  const copy = LIMIT_COPY[feature]

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-white border-gray-200 shadow-2xl max-w-md">
        <AlertDialogHeader className="text-center">
          {/* Icon */}
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center
            rounded-full bg-indigo-50">
            <Zap className="h-6 w-6 text-indigo-600" />
          </div>

          <AlertDialogTitle className="text-lg font-semibold text-gray-900">
            {copy.heading}
          </AlertDialogTitle>

          <AlertDialogDescription className="text-sm text-gray-500 mt-1">
            {copy.subheading}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Value prop bullets */}
        <ul className="space-y-2.5 my-5">
          {[
            'Unlimited deal analyses',
            '150 AI chat messages/mo',
            'PDF reports & offer letters',
          ].map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-sm text-gray-700">
              <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        {/* Primary CTA */}
        <button
          onClick={onUpgrade}
          className="w-full flex items-center justify-center gap-2
            rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white
            shadow-md shadow-indigo-600/20
            hover:bg-indigo-700 active:bg-indigo-800
            transition-colors duration-150"
        >
          Upgrade to Pro &mdash; $29/mo
          <ArrowRight className="h-4 w-4" />
        </button>

        {/* Secondary link */}
        <div className="text-center mt-3">
          <Link
            to="/pricing"
            className="text-xs text-gray-400 hover:text-gray-600 underline
              underline-offset-2 transition-colors duration-150"
          >
            View pricing details
          </Link>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### Key Decisions

- **Price in the CTA.** Showing "$29/mo" directly in the button reduces the friction
  of a separate pricing page. The user knows the cost before clicking.
- **Max 3 value prop bullets.** Research shows more than 3 causes decision fatigue in
  modal context (see agent-13 section 6).
- **Empathetic sub-heading.** "Your data is safe" for analyses reassures that their
  work is preserved. Never punitive, always forward-looking.

---

## 7. SuccessOverlay

Full-page celebration shown after successful Stripe payment confirmation. Confetti
burst followed by stagger-revealed feature unlocks.

### Dependencies

```
npm install canvas-confetti
npm install -D @types/canvas-confetti
```

### JSX

```tsx
import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { DURATION, EASING, SPRING, staggerContainer, staggerItem } from '@/lib/motion'

// ── Framer Motion variants ──────────────────────────────────────────────────

const celebrationContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.6, // Wait for confetti to peak
      staggerChildren: 0.12,
    },
  },
}

const featureItem = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: DURATION.normal, ease: EASING.snappy },
  },
}

const checkPop = {
  hidden: { scale: 0, rotate: -45 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: { type: 'spring', damping: 12, stiffness: 300 },
  },
}

const ctaFadeIn = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.normal, delay: 1.4 },
  },
}

// ── Component ───────────────────────────────────────────────────────────────

const UNLOCKED_FEATURES = [
  'Unlimited deal analyses',
  '150 AI chat messages per month',
  'PDF reports & offer letters',
  'Priority support',
]

export function SuccessOverlay() {
  const navigate = useNavigate()
  const hasFired = useRef(false)

  useEffect(() => {
    // Fire confetti once. Stored in localStorage to prevent repeat on revisit.
    if (hasFired.current) return
    hasFired.current = true

    const celebrated = localStorage.getItem('upgrade-celebrated')
    if (celebrated) return

    // Respect reduced motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!prefersReduced) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#4F46E5', '#6366F1', '#818CF8', '#C7C9FF', '#E0E2FF'],
        disableForReducedMotion: true,
      })
    }

    localStorage.setItem('upgrade-celebrated', 'true')
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <motion.div
        variants={celebrationContainer}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md bg-white rounded-xl border border-gray-200
          shadow-lg p-8 text-center"
      >
        {/* Celebration icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 10, stiffness: 200, delay: 0.3 }}
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center
            rounded-full bg-emerald-50"
        >
          <CheckCircle className="h-8 w-8 text-emerald-500" />
        </motion.div>

        {/* Heading */}
        <motion.h1
          variants={featureItem}
          className="text-2xl font-semibold text-gray-900 mb-2"
        >
          Welcome to Pro!
        </motion.h1>

        <motion.p
          variants={featureItem}
          className="text-sm text-gray-500 mb-8"
        >
          Your account has been upgraded. Here's what you unlocked:
        </motion.p>

        {/* Feature unlock list */}
        <div className="space-y-3 mb-8 text-left">
          {UNLOCKED_FEATURES.map((feature) => (
            <motion.div
              key={feature}
              variants={featureItem}
              className="flex items-center gap-3"
            >
              <motion.div variants={checkPop}>
                <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
              </motion.div>
              <span className="text-sm text-gray-700">{feature}</span>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div variants={ctaFadeIn}>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center justify-center gap-2
              rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white
              shadow-md shadow-indigo-600/20
              hover:bg-indigo-700 active:bg-indigo-800
              transition-colors duration-150"
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      </motion.div>
    </div>
  )
}
```

### Welcome-Back Toast (for subsequent visits to previously-gated features)

```tsx
// In a layout or feature component, after billing store update:
import { toast } from 'sonner'

function useWelcomeBackToast(feature: string) {
  useEffect(() => {
    const key = `welcome-back-${feature}`
    if (localStorage.getItem(key)) return

    toast.success(`${feature} unlocked!`, {
      description: 'Enjoy your Pro features.',
      duration: 4000,
    })

    localStorage.setItem(key, 'true')
  }, [feature])
}
```

### Key Decisions

- **Confetti fires once** (guarded by `hasFired` ref + localStorage). Users who
  refresh the success page see the card but not repeated confetti.
- **Indigo-tinted confetti** (`#4F46E5`, `#6366F1`, etc.) to stay on-brand instead
  of generic rainbow.
- **Sequential animation.** Confetti peaks at ~500ms, then the card staggers children
  starting at 600ms. Check marks pop with spring physics. CTA fades in last at 1.4s.
  The sequence creates a "ceremony" feeling without taking too long.

---

## 8. BillingSettings

The full billing tab content for the Settings page. Contains three stacked sections:
PlanCard, UsageMeters, and BillingHistory.

### PlanCard

```tsx
import { Crown, ExternalLink } from 'lucide-react'
import { PlanBadge } from '@/components/billing/PlanBadge'
import { useBillingStore } from '@/stores/billing-store'

interface PlanCardProps {
  onManage: () => void   // Opens Stripe Customer Portal
  onCancel: () => void   // Opens cancel flow
}

// ── Status badge styles ─────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  active:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  trialing:   'bg-blue-50 text-blue-700 border-blue-200',
  past_due:   'bg-amber-50 text-amber-700 border-amber-200',
  canceled:   'bg-red-50 text-red-700 border-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  active:     'Active',
  trialing:   'Trial',
  past_due:   'Past Due',
  canceled:   'Canceled',
}

// ── Component ───────────────────────────────────────────────────────────────

export function PlanCard({ onManage, onCancel }: PlanCardProps) {
  const { plan } = useBillingStore()

  if (!plan) return null

  const priceLabel = plan.price_cents === 0
    ? 'Free'
    : `$${(plan.price_cents / 100).toFixed(0)}/${plan.interval === 'month' ? 'mo' : 'yr'}`

  const renewalLabel = plan.cancel_at_period_end
    ? `Cancels ${formatDate(plan.current_period_end)}`
    : `Renews ${formatDate(plan.current_period_end)}`

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-5">
        Current Plan
      </h3>

      <div className="flex items-start justify-between">
        {/* Left: plan info */}
        <div className="flex items-start gap-4">
          {/* Plan icon */}
          <div className="flex h-11 w-11 items-center justify-center rounded-lg
            bg-indigo-50 shrink-0">
            <Crown className="h-5 w-5 text-indigo-600" />
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-md font-semibold text-gray-900">
                {plan.name} Plan
              </span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5
                text-[10px] font-semibold uppercase tracking-wide border
                ${STATUS_STYLES[plan.status] ?? STATUS_STYLES.active}`}>
                {STATUS_LABELS[plan.status] ?? plan.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {plan.price_cents > 0 && renewalLabel}
              {plan.price_cents === 0 && 'No billing period'}
            </p>
          </div>
        </div>

        {/* Right: price */}
        <span className="text-xl font-mono font-semibold text-gray-900">
          {priceLabel}
        </span>
      </div>

      {/* Past due warning */}
      {plan.status === 'past_due' && (
        <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-sm text-amber-800">
            Your last payment failed. Please update your payment method to keep
            your Pro features.
          </p>
        </div>
      )}

      {/* Cancellation pending notice */}
      {plan.cancel_at_period_end && plan.status !== 'canceled' && (
        <div className="mt-4 rounded-lg bg-gray-50 border border-gray-200 p-3">
          <p className="text-sm text-gray-600">
            Your plan will downgrade to Free on{' '}
            <span className="font-medium text-gray-900">
              {formatDate(plan.current_period_end)}
            </span>.
            You can reactivate anytime before then.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-6 pt-5 border-t border-gray-100">
        {plan.price_cents > 0 ? (
          <>
            <button
              onClick={onManage}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600
                px-4 py-2.5 text-sm font-semibold text-white
                hover:bg-indigo-700 active:bg-indigo-800
                transition-colors duration-150"
            >
              Manage Subscription
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
            {!plan.cancel_at_period_end && (
              <button
                onClick={onCancel}
                className="text-sm text-gray-400 hover:text-red-600
                  transition-colors duration-150"
              >
                Cancel Plan
              </button>
            )}
          </>
        ) : (
          <button
            onClick={() => window.location.href = '/upgrade'}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600
              px-4 py-2.5 text-sm font-semibold text-white
              hover:bg-indigo-700 active:bg-indigo-800
              transition-colors duration-150"
          >
            Upgrade to Pro
          </button>
        )}
      </div>
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
```

### BillingHistory

```tsx
import { Download } from 'lucide-react'

interface Invoice {
  id: string
  date: string
  amount_cents: number
  status: 'paid' | 'open' | 'void' | 'uncollectible'
  pdf_url: string
  description: string
}

const INVOICE_STATUS_STYLES: Record<Invoice['status'], string> = {
  paid:           'bg-emerald-50 text-emerald-700',
  open:           'bg-amber-50 text-amber-700',
  void:           'bg-gray-50 text-gray-500',
  uncollectible:  'bg-red-50 text-red-700',
}

export function BillingHistory({ invoices }: { invoices: Invoice[] }) {
  if (invoices.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Billing History
        </h3>
        <p className="text-sm text-gray-400">No invoices yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-5">
        Billing History
      </h3>

      {/* ── Desktop table ────────────────────────────────────────────────── */}
      <div className="hidden sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2.5 text-xs font-medium text-gray-400
                uppercase tracking-wide">
                Date
              </th>
              <th className="text-left py-2.5 text-xs font-medium text-gray-400
                uppercase tracking-wide">
                Description
              </th>
              <th className="text-right py-2.5 text-xs font-medium text-gray-400
                uppercase tracking-wide">
                Amount
              </th>
              <th className="text-center py-2.5 text-xs font-medium text-gray-400
                uppercase tracking-wide">
                Status
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {invoices.map((inv) => (
              <tr key={inv.id} className="group">
                <td className="py-3 text-gray-500">
                  {formatDate(inv.date)}
                </td>
                <td className="py-3 text-gray-900">
                  {inv.description}
                </td>
                <td className="py-3 text-right font-mono font-medium text-gray-900">
                  ${(inv.amount_cents / 100).toFixed(2)}
                </td>
                <td className="py-3 text-center">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5
                    text-[10px] font-semibold uppercase tracking-wide
                    ${INVOICE_STATUS_STYLES[inv.status]}`}>
                    {inv.status}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <a
                    href={inv.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-md text-gray-300
                      hover:text-indigo-600 hover:bg-indigo-50
                      transition-colors duration-150"
                    aria-label={`Download invoice for ${inv.description}`}
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile stacked cards ─────────────────────────────────────────── */}
      <div className="sm:hidden space-y-3">
        {invoices.map((inv) => (
          <div
            key={inv.id}
            className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">
                {inv.description}
              </span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5
                text-[10px] font-semibold uppercase tracking-wide
                ${INVOICE_STATUS_STYLES[inv.status]}`}>
                {inv.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{formatDate(inv.date)}</span>
              <span className="text-sm font-mono font-medium text-gray-900">
                ${(inv.amount_cents / 100).toFixed(2)}
              </span>
            </div>
            <a
              href={inv.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium
                text-indigo-600 hover:text-indigo-700 transition-colors duration-150"
            >
              <Download className="h-3 w-3" />
              Download invoice
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Full BillingSettings Tab Composition

```tsx
import { useBillingStore } from '@/stores/billing-store'
import { PlanCard } from '@/components/billing/PlanCard'
import { UsageMeters } from '@/components/billing/UsageMeters'
import { BillingHistory } from '@/components/billing/BillingHistory'
import { CancelModal } from '@/components/billing/CancelModal'
import { api } from '@/lib/api'

export function BillingTab() {
  const { plan, usage, invoices } = useBillingStore()
  const [cancelOpen, setCancelOpen] = useState(false)

  async function handleManageSubscription() {
    const { url } = await api.post<{ url: string }>('/billing/portal-session')
    window.location.href = url
  }

  const meters = [
    { key: 'analyses', label: 'Deal Analyses', used: usage.analyses, limit: plan?.limits.analyses ?? 5, unlimited: plan?.name === 'Pro' && plan.limits.analyses >= 100 },
    { key: 'chat', label: 'AI Chat Messages', used: usage.chat_messages, limit: plan?.limits.chat_messages ?? 20, unlimited: false },
    { key: 'documents', label: 'Documents', used: usage.documents, limit: plan?.limits.documents ?? 10, unlimited: plan?.limits.documents === -1 },
    { key: 'pdf', label: 'PDF Reports', used: usage.pdf_reports, limit: plan?.limits.pdf_reports ?? 2, unlimited: plan?.limits.pdf_reports === -1 },
  ]

  return (
    <div className="space-y-6">
      <PlanCard
        onManage={handleManageSubscription}
        onCancel={() => setCancelOpen(true)}
      />
      <UsageMeters
        meters={meters}
        resetDate={plan?.current_period_end ?? ''}
      />
      <BillingHistory invoices={invoices} />

      {/* Cancel flow */}
      <CancelModal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
      />
    </div>
  )
}
```

---

## 9. CancelModal

Multi-step cancellation flow. Collects a reason, offers a save deal, then confirms.
Uses a modal (overriding the agent-16 inline recommendation) because the billing
settings page already has dense content and an inline expansion would push the
usage meters and history off-screen.

### Props

```tsx
interface CancelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}
```

### JSX

```tsx
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import { AlertTriangle, X, CheckCircle, ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'
import { useBillingStore } from '@/stores/billing-store'

// ── Cancel reasons ──────────────────────────────────────────────────────────

const CANCEL_REASONS = [
  { value: 'too_expensive', label: 'Too expensive' },
  { value: 'not_using', label: 'Not using it enough' },
  { value: 'missing_features', label: 'Missing features I need' },
  { value: 'switching', label: 'Switching to another tool' },
  { value: 'temporary', label: 'Just a side project' },
  { value: 'other', label: 'Other' },
] as const

type CancelReason = (typeof CANCEL_REASONS)[number]['value']

// ── Save offer (shown for "too_expensive") ──────────────────────────────────

const SAVE_OFFER = {
  heading: 'How about 50% off for 2 months?',
  description: 'We\'d love to keep you on Pro. Stay for $14.50/mo for the next 2 months.',
  cta: 'Accept Offer',
}

// ── Steps ───────────────────────────────────────────────────────────────────

type Step = 'reason' | 'offer' | 'confirm' | 'done'

export function CancelModal({ open, onOpenChange }: CancelModalProps) {
  const queryClient = useQueryClient()
  const { plan } = useBillingStore()

  const [step, setStep] = useState<Step>('reason')
  const [reason, setReason] = useState<CancelReason | ''>('')
  const [note, setNote] = useState('')
  const [confirmText, setConfirmText] = useState('')

  // Reset state when modal closes
  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setStep('reason')
      setReason('')
      setNote('')
      setConfirmText('')
    }
    onOpenChange(isOpen)
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  const cancelMutation = useMutation({
    mutationFn: () =>
      api.post('/billing/cancel', { reason, note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
      setStep('done')
    },
  })

  const acceptOfferMutation = useMutation({
    mutationFn: () =>
      api.post('/billing/accept-save-offer', { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      handleOpenChange(false)
    },
  })

  // ── Proceed from reason step ──────────────────────────────────────────────

  function handleReasonNext() {
    if (reason === 'too_expensive') {
      setStep('offer')
    } else {
      setStep('confirm')
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="bg-white border-gray-200 shadow-2xl max-w-md">

        {/* ═══════════ STEP 1: Reason ═══════════ */}
        {step === 'reason' && (
          <>
            <AlertDialogHeader>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center
                rounded-full bg-amber-50">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <AlertDialogTitle className="text-center text-lg font-semibold
                text-gray-900">
                We're sorry to see you go
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-sm text-gray-500">
                Help us improve — why are you canceling?
              </AlertDialogDescription>
            </AlertDialogHeader>

            <RadioGroup
              value={reason}
              onValueChange={(v) => setReason(v as CancelReason)}
              className="mt-4 space-y-1"
            >
              {CANCEL_REASONS.map((r) => (
                <label
                  key={r.value}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5
                    cursor-pointer hover:bg-gray-50 transition-colors duration-100"
                >
                  <RadioGroupItem value={r.value} />
                  <span className="text-sm text-gray-700">{r.label}</span>
                </label>
              ))}
            </RadioGroup>

            {reason === 'other' && (
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Tell us more (optional)"
                className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50
                  p-3 text-sm text-gray-900 placeholder:text-gray-400
                  resize-none h-20 focus:outline-none focus:ring-2
                  focus:ring-indigo-500 focus:border-transparent"
              />
            )}

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleReasonNext}
                disabled={!reason}
                className="flex-1 rounded-lg border border-red-200 px-4 py-2.5
                  text-sm font-medium text-red-600
                  hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed
                  transition-colors duration-150"
              >
                Continue cancellation
              </button>
              <button
                onClick={() => handleOpenChange(false)}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5
                  text-sm font-semibold text-white
                  hover:bg-indigo-700 transition-colors duration-150"
              >
                Keep my plan
              </button>
            </div>
          </>
        )}

        {/* ═══════════ STEP 2: Save Offer ═══════════ */}
        {step === 'offer' && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-center text-lg font-semibold
                text-gray-900">
                {SAVE_OFFER.heading}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-sm text-gray-500">
                {SAVE_OFFER.description}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="mt-6 rounded-lg border border-indigo-200 bg-indigo-50 p-4
              text-center">
              <p className="text-2xl font-mono font-semibold text-indigo-700">
                $14.50<span className="text-sm font-sans font-normal text-indigo-500">/mo</span>
              </p>
              <p className="text-xs text-indigo-500 mt-1">for your next 2 billing cycles</p>
            </div>

            <div className="flex flex-col gap-3 mt-6">
              <button
                onClick={() => acceptOfferMutation.mutate()}
                disabled={acceptOfferMutation.isPending}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5
                  text-sm font-semibold text-white
                  hover:bg-indigo-700 disabled:opacity-70
                  transition-colors duration-150"
              >
                {acceptOfferMutation.isPending ? 'Applying...' : SAVE_OFFER.cta}
              </button>
              <button
                onClick={() => setStep('confirm')}
                className="w-full rounded-lg px-4 py-2.5
                  text-sm text-gray-400 hover:text-gray-600
                  transition-colors duration-150"
              >
                No thanks, continue canceling
              </button>
            </div>
          </>
        )}

        {/* ═══════════ STEP 3: Type CANCEL to Confirm ═══════════ */}
        {step === 'confirm' && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg font-semibold text-gray-900">
                Confirm cancellation
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-gray-500">
                Your plan will remain active until{' '}
                <span className="font-medium text-gray-700">
                  {plan?.current_period_end
                    ? new Date(plan.current_period_end).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })
                    : 'the end of your billing period'}
                </span>.
                After that, you'll be downgraded to the Free plan.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {/* Loss list */}
            <ul className="mt-4 space-y-2">
              {[
                'Unlimited deal analyses (down to 5)',
                'AI chat specialist (500 messages/mo)',
                'PDF reports & document uploads',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                  <X className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            {/* Data safety note */}
            <p className="mt-4 text-xs text-gray-400 italic">
              Your deals and data won't be deleted. You can upgrade again anytime.
            </p>

            {/* Type CANCEL */}
            <div className="mt-5 space-y-2">
              <p className="text-sm text-gray-600">
                Type{' '}
                <span className="font-mono font-semibold text-red-600">CANCEL</span>
                {' '}to confirm.
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type CANCEL"
                className="max-w-[200px] bg-gray-50 border-gray-200"
              />
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setStep('reason')}
                className="flex items-center gap-1 text-sm text-gray-400
                  hover:text-gray-600 transition-colors duration-150"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <div className="flex-1" />
              <button
                disabled={confirmText !== 'CANCEL' || cancelMutation.isPending}
                onClick={() => cancelMutation.mutate()}
                className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold
                  text-white disabled:opacity-40 disabled:cursor-not-allowed
                  hover:bg-red-700 transition-colors duration-150"
              >
                {cancelMutation.isPending ? 'Canceling...' : 'Cancel my subscription'}
              </button>
            </div>
          </>
        )}

        {/* ═══════════ STEP 4: Done ═══════════ */}
        {step === 'done' && (
          <>
            <AlertDialogHeader>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center
                rounded-full bg-gray-100">
                <CheckCircle className="h-5 w-5 text-gray-500" />
              </div>
              <AlertDialogTitle className="text-center text-lg font-semibold
                text-gray-900">
                Your plan has been canceled
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-sm text-gray-500">
                You'll retain Pro access until{' '}
                {plan?.current_period_end
                  ? new Date(plan.current_period_end).toLocaleDateString('en-US', {
                      month: 'long', day: 'numeric', year: 'numeric',
                    })
                  : 'the end of your billing period'}.
                You can reactivate anytime.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <button
              onClick={() => handleOpenChange(false)}
              className="mt-6 w-full rounded-lg bg-gray-100 px-4 py-2.5
                text-sm font-medium text-gray-700
                hover:bg-gray-200 transition-colors duration-150"
            >
              Close
            </button>
          </>
        )}

      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### Flow Diagram

```
[Cancel Plan] clicked
       |
       v
  ┌─────────┐     ┌──────────────┐     ┌───────────┐     ┌──────┐
  │  Reason  │────>│  Save Offer  │────>│  Confirm  │────>│ Done │
  │  Survey  │     │ (if "price") │     │ (CANCEL)  │     │      │
  └─────────┘     └──────────────┘     └───────────┘     └──────┘
       |                                      ^
       |    (if reason != "too_expensive")     |
       └──────────────────────────────────────┘
```

### Key Decisions

- **Save offer only for "too expensive."** Showing a discount to users who chose
  "missing features" or "switching" would feel tone-deaf. The offer is conditional.
- **"Keep my plan" is the visually dominant button** on the reason step (filled indigo
  vs. outlined red). This is standard retention UX — bias the UI toward staying.
- **Type CANCEL confirmation** (not a checkbox). The friction is intentional: it
  prevents accidental cancellation and matches GitHub/Stripe patterns users expect
  for destructive actions.
- **Data safety note** ("Your deals and data won't be deleted") reduces churn anxiety.
  Users who know their data is safe are more likely to reactivate later.

---

## 10. 402 Error Handler Pattern

The 402 Payment Required status signals a billing gate from the backend. The frontend
intercepts 402 responses globally and routes them to the appropriate billing UI.

### API Interceptor

```tsx
// In @/lib/api.ts — add to the existing response handler

import { useBillingStore } from '@/stores/billing-store'

// ── 402 handler (add to the existing fetch wrapper) ─────────────────────────

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    // Existing refresh logic ...
  }

  if (response.status === 402) {
    const body = await response.json().catch(() => ({}))
    const feature = body.feature ?? 'analyses'

    // Update billing store — triggers UI gate
    useBillingStore.getState().handlePaymentRequired(feature)

    // Throw typed error for component-level handling
    throw new PaymentRequiredError(feature, body.message)
  }

  if (!response.ok) {
    // Existing error handling ...
  }

  return response.json()
}

// ── Typed error class ───────────────────────────────────────────────────────

export class PaymentRequiredError extends Error {
  readonly feature: string

  constructor(feature: string, message?: string) {
    super(message ?? `Upgrade required for ${feature}`)
    this.name = 'PaymentRequiredError'
    this.feature = feature
  }
}
```

### React Query Error Boundary Pattern

```tsx
// In a component that calls a gated API endpoint:

import { useMutation } from '@tanstack/react-query'
import { PaymentRequiredError } from '@/lib/api'
import { LimitReachedModal } from '@/components/billing/LimitReachedModal'

function AnalyzeButton() {
  const [limitModal, setLimitModal] = useState<{
    open: boolean
    feature: string
  }>({ open: false, feature: 'analyses' })

  const analyzeMutation = useMutation({
    mutationFn: (data: AnalysisInput) => api.post('/analyze', data),
    onError: (error) => {
      if (error instanceof PaymentRequiredError) {
        setLimitModal({ open: true, feature: error.feature })
        return // Don't show generic error toast
      }
      toast.error('Analysis failed. Please try again.')
    },
  })

  return (
    <>
      <button onClick={() => analyzeMutation.mutate(formData)}>
        Analyze Deal
      </button>

      <LimitReachedModal
        open={limitModal.open}
        onOpenChange={(open) => setLimitModal((prev) => ({ ...prev, open }))}
        feature={limitModal.feature as any}
        onUpgrade={() => navigate(`/upgrade?from=${limitModal.feature}`)}
      />
    </>
  )
}
```

### Global 402 Handler (optional — for fire-and-forget gating)

```tsx
// In App.tsx or a layout wrapper:

import { useBillingStore } from '@/stores/billing-store'
import { LimitReachedModal } from '@/components/billing/LimitReachedModal'

export function GlobalBillingGate() {
  const { paymentRequiredFeature, clearPaymentRequired } = useBillingStore()
  const navigate = useNavigate()

  return (
    <LimitReachedModal
      open={!!paymentRequiredFeature}
      onOpenChange={(open) => {
        if (!open) clearPaymentRequired()
      }}
      feature={paymentRequiredFeature ?? 'analyses'}
      onUpgrade={() => {
        clearPaymentRequired()
        navigate(`/upgrade?from=${paymentRequiredFeature}`)
      }}
    />
  )
}
```

### Backend Contract

```
HTTP 402 Payment Required

Response body:
{
  "error": "Plan limit reached",
  "code": "PAYMENT_REQUIRED",
  "feature": "analyses" | "deals" | "chat" | "pdf" | "offer_letter",
  "message": "You have used all 5 free analyses this month.",
  "current_usage": 5,
  "limit": 5,
  "upgrade_url": "/upgrade"
}
```

### Key Decisions

- **Typed `PaymentRequiredError`** class so `instanceof` checks work cleanly in
  React Query `onError` handlers. No string matching.
- **Two layers of handling.** Component-level `onError` catches 402 for inline UX
  (e.g., showing the modal in context). The global `GlobalBillingGate` catches 402s
  that fall through (e.g., background refetches).
- **`feature` field in the 402 response** tells the frontend which LimitReachedModal
  copy variant to display. The backend is the source of truth for what was gated.

---

## 11. Zustand Billing Store

Central client-side state for billing, subscriptions, usage, and feature access.
Hydrated once on auth from the `/auth/me` or `/billing/status` endpoint. Never
fetched per-component.

### Store

```tsx
// @/stores/billing-store.ts

import { create } from 'zustand'

// ── Types ───────────────────────────────────────────────────────────────────

export interface PlanInfo {
  name: string                 // "Free" | "Pro" | "Team"
  price_cents: number          // 0, 2900, 7900
  interval: 'month' | 'year'
  status: 'active' | 'trialing' | 'past_due' | 'canceled'
  current_period_end: string   // ISO date
  cancel_at_period_end: boolean
  trial_end?: string           // ISO date, present when status === 'trialing'
  limits: {
    analyses: number           // -1 = unlimited
    chat_messages: number
    documents: number
    pdf_reports: number
    deals: number
  }
}

export interface UsageInfo {
  analyses: number
  chat_messages: number
  documents: number
  pdf_reports: number
  deals: number
}

export interface Invoice {
  id: string
  date: string
  amount_cents: number
  status: 'paid' | 'open' | 'void' | 'uncollectible'
  pdf_url: string
  description: string
}

type GatedFeature = 'analyses' | 'chat' | 'pdf' | 'deals' | 'offer_letter'

interface BillingState {
  // ── Data ──────────────────────────────────────────────────────────────────
  plan: PlanInfo | null
  usage: UsageInfo
  invoices: Invoice[]
  isHydrated: boolean

  // ── 402 global gate ───────────────────────────────────────────────────────
  paymentRequiredFeature: GatedFeature | null

  // ── Actions ───────────────────────────────────────────────────────────────
  hydrate: (data: {
    plan: PlanInfo
    usage: UsageInfo
    invoices?: Invoice[]
  }) => void

  /** Check if the current plan allows access to a feature */
  canAccess: (feature: GatedFeature) => boolean

  /** Compute the plan badge type for sidebar display */
  planBadgeType: () => 'free' | 'pro' | 'trial'

  /** Compute trial days remaining (null if not trialing) */
  trialDaysRemaining: () => number | null

  /** Called by the 402 handler in api.ts */
  handlePaymentRequired: (feature: GatedFeature) => void

  /** Clear the 402 state after modal is dismissed */
  clearPaymentRequired: () => void

  /** Increment a usage counter optimistically (e.g., after a successful analysis) */
  incrementUsage: (key: keyof UsageInfo) => void

  /** Full reset on logout */
  reset: () => void
}

// ── Initial state ───────────────────────────────────────────────────────────

const INITIAL_USAGE: UsageInfo = {
  analyses: 0,
  chat_messages: 0,
  documents: 0,
  pdf_reports: 0,
  deals: 0,
}

// ── Store ───────────────────────────────────────────────────────────────────

export const useBillingStore = create<BillingState>((set, get) => ({
  plan: null,
  usage: INITIAL_USAGE,
  invoices: [],
  isHydrated: false,
  paymentRequiredFeature: null,

  // ── Hydrate (called once after /auth/me or /billing/status) ───────────────

  hydrate: (data) =>
    set({
      plan: data.plan,
      usage: data.usage,
      invoices: data.invoices ?? [],
      isHydrated: true,
    }),

  // ── Feature access check ──────────────────────────────────────────────────

  canAccess: (feature) => {
    const { plan, usage } = get()
    if (!plan) return false

    // Pro/Team with active or trialing status: check limits
    const isActive = plan.status === 'active' || plan.status === 'trialing'
    if (!isActive) return false

    switch (feature) {
      case 'analyses':
        return plan.limits.analyses === -1 || usage.analyses < plan.limits.analyses
      case 'chat':
        return plan.limits.chat_messages === -1 || usage.chat_messages < plan.limits.chat_messages
      case 'pdf':
        return plan.limits.pdf_reports === -1 || usage.pdf_reports < plan.limits.pdf_reports
      case 'deals':
        return plan.limits.deals === -1 || usage.deals < plan.limits.deals
      case 'offer_letter':
        // Offer letters require Pro plan (not available on Free)
        return plan.name !== 'Free'
      default:
        return false
    }
  },

  // ── Plan badge type ───────────────────────────────────────────────────────

  planBadgeType: () => {
    const { plan } = get()
    if (!plan) return 'free'
    if (plan.status === 'trialing') return 'trial'
    if (plan.name === 'Free' || plan.status === 'canceled') return 'free'
    return 'pro'
  },

  // ── Trial days remaining ──────────────────────────────────────────────────

  trialDaysRemaining: () => {
    const { plan } = get()
    if (!plan || plan.status !== 'trialing' || !plan.trial_end) return null

    const now = new Date()
    const end = new Date(plan.trial_end)
    const diff = end.getTime() - now.getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  },

  // ── 402 handler ───────────────────────────────────────────────────────────

  handlePaymentRequired: (feature) =>
    set({ paymentRequiredFeature: feature }),

  clearPaymentRequired: () =>
    set({ paymentRequiredFeature: null }),

  // ── Optimistic usage increment ────────────────────────────────────────────

  incrementUsage: (key) =>
    set((state) => ({
      usage: {
        ...state.usage,
        [key]: state.usage[key] + 1,
      },
    })),

  // ── Reset ─────────────────────────────────────────────────────────────────

  reset: () =>
    set({
      plan: null,
      usage: INITIAL_USAGE,
      invoices: [],
      isHydrated: false,
      paymentRequiredFeature: null,
    }),
}))
```

### Hydration Point

```tsx
// In useSessionValidation.ts or the auth init hook:

import { useBillingStore } from '@/stores/billing-store'

// After /auth/me returns:
useEffect(() => {
  if (meData) {
    useBillingStore.getState().hydrate({
      plan: meData.plan,
      usage: meData.usage,
      invoices: meData.invoices,
    })
  }
}, [meData])
```

### Selector Patterns

```tsx
// In components — use selectors to avoid unnecessary re-renders:

// Check if user can analyze (for button states)
const canAnalyze = useBillingStore((s) => s.canAccess('analyses'))

// Get trial banner data
const trialDays = useBillingStore((s) => s.trialDaysRemaining())
const isTrial = useBillingStore((s) => s.planBadgeType() === 'trial')

// Get usage for meters
const usage = useBillingStore((s) => s.usage)
const limits = useBillingStore((s) => s.plan?.limits)
```

---

## 12. CRITICAL DECISIONS

### D1: Light-Theme Color Language

All billing components use the Parcel light theme token system (`agent-01-design-tokens.md`):

| Element | Color | Token/Value |
|---------|-------|-------------|
| Page background | `#F9FAFB` | `bg-gray-50` (page) |
| Card surface | `#FFFFFF` | `bg-white` (surface) |
| Card border | `#EAECF0` | `border-gray-200` |
| Primary text | `#1D2939` | `text-gray-900` / `text-gray-800` |
| Secondary text | `#475467` | `text-gray-500` / `text-gray-600` |
| Muted text | `#98A2B3` | `text-gray-400` |
| Primary CTA | `#4F46E5` | `bg-indigo-600` (hover: `bg-indigo-700`) |
| CTA text | `#FFFFFF` | `text-white` |
| CTA shadow | indigo glow | `shadow-indigo-600/20` |
| Success | `#10B981`/`#047857` | `bg-emerald-50`, `text-emerald-700` |
| Warning | `#F59E0B`/`#D97706` | `bg-amber-50`, `text-amber-700` |
| Error/destructive | `#EF4444`/`#B91C1C` | `bg-red-50`, `text-red-600` |
| Financial numbers | JetBrains Mono | `font-mono` |

### D2: `#4F46E5` as CTA Indigo (Not `#6366F1`)

The brand primary is `#6366F1` (indigo-500) but all billing CTAs use `#4F46E5`
(indigo-600). Reason: on a white background, indigo-500 has a WCAG AA contrast
ratio of 3.98:1 against white (fails). Indigo-600 achieves 4.63:1 (passes). Every
CTA button must be `bg-indigo-600` with `hover:bg-indigo-700` and
`active:bg-indigo-800`.

### D3: PaywallOverlay Uses White Gradient (Not Dark)

The research document (agent-13) specifies `via-[#08080F]/60 to-[#08080F]/95` for
the dark theme. On light theme, this becomes `via-white/60 to-white/95`. The blur
dissolves content into the white page background, which reads as "fading out" rather
than "darkening." The backdrop-blur-md (`12px`) still obscures text but the overall
effect is lighter and less oppressive.

### D4: Modal for Cancel Flow (Overriding agent-16 Inline Recommendation)

Agent-16 recommends an inline cancel expansion below the PlanCard. For the billing
settings tab, this creates layout problems: the expansion pushes UsageMeters and
BillingHistory off-screen, making users scroll during a high-stakes flow. A modal
keeps the cancel flow contained and focused. The modal is a multi-step AlertDialog,
not a simple "Are you sure?" confirmation.

### D5: Two-Layer 402 Handling

402 errors are handled at two levels:
1. **Component-level:** `onError` in React Query mutations catches
   `PaymentRequiredError` and shows the LimitReachedModal in the local component
   context (e.g., next to the Analyze button).
2. **Global level:** `GlobalBillingGate` in the app layout catches 402s that fall
   through from background refetches or unexpected endpoints.

This ensures no 402 is ever shown as a raw error toast.

### D6: Zustand Store Hydrated Once (Not Per-Component)

The billing store is populated from `/auth/me` on authentication, not fetched by
individual components. This means:
- Gate checks (`canAccess`) are synchronous — no loading states on feature gates.
- Usage increments are optimistic (client-side) with eventual consistency from
  the next `/auth/me` call.
- The store is the single source of truth; no component makes its own billing API call.

### D7: Confetti Colors Are On-Brand Indigo

The SuccessOverlay confetti uses the indigo scale (`#4F46E5`, `#6366F1`, `#818CF8`,
`#C7C9FF`, `#E0E2FF`) instead of generic rainbow colors. This keeps the celebration
feeling intentional and brand-coherent on the clean white background.

### D8: Trial Banner Dismissal Uses Timestamped localStorage

Dismissal stores `{ at: Date.now(), ttl: 86400000 }` (24-hour TTL). This allows
the banner to return the next day without full localStorage clearing. Boolean-based
dismissal would require manual expiration logic or never show the banner again.

### D9: Save Offer Only for "Too Expensive" Reason

The CancelModal shows a 50%-off save offer only when the user selects "too expensive"
as their cancellation reason. Showing a discount for "missing features" or "switching
tools" would feel tone-deaf — those users need product improvements, not cheaper
prices. This conditional save offer matches Notion's and Linear's approach.

### D10: Font Mono for All Financial Figures

Every dollar amount, usage count ratio (e.g., "3 of 5"), and price display uses
`font-mono` (JetBrains Mono). This is an existing Parcel design system rule: all
financial numbers use the monospace font for tabular alignment and visual
differentiation from prose text. This applies to:
- PlanCard price (`$29/mo`)
- UsageMeter counts (`3 of 5`)
- BillingHistory amounts (`$29.00`)
- CancelModal save offer price (`$14.50/mo`)
- LimitReachedModal CTA price (`$29/mo`)
