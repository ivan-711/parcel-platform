/**
 * Landing page — public marketing page.
 * Dark fintech SaaS aesthetic: Bloomberg data density × Stripe visual confidence.
 * Sections: Navbar → Hero + Demo Card → Ticker → Stats → Features (bento) →
 *           How It Works → Pricing → Final CTA → Footer
 */

import { useEffect, useState } from 'react'
import { ParallaxBackground } from '@/components/landing/ParallaxBackground'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  Check,
  Calculator,
  FileText,
  GitBranch,
  TrendingUp,
  Shield,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/* ═══════════════════════════════════════════════════════════════════════════
   Types
═══════════════════════════════════════════════════════════════════════════ */

type StrategyKey = 'Wholesale' | 'Creative Finance' | 'BRRRR' | 'Buy & Hold' | 'Flip'

interface DemoMetrics {
  coc: string
  capRate: string
  cashFlow: string
  risk: number
  riskLabel: string
  riskColor: string
  aiSummary: string
}

interface PricingTier {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  highlighted: boolean
  cta: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   Data
═══════════════════════════════════════════════════════════════════════════ */

const STRATEGIES: StrategyKey[] = ['Wholesale', 'Creative Finance', 'BRRRR', 'Buy & Hold', 'Flip']

const STRATEGY_COLORS: Record<StrategyKey, { bg: string; text: string }> = {
  'Wholesale':        { bg: '#451A03', text: '#FCD34D' },
  'Creative Finance': { bg: '#2E1065', text: '#C4B5FD' },
  'BRRRR':            { bg: '#0C1A4A', text: '#93C5FD' },
  'Buy & Hold':       { bg: '#064E3B', text: '#6EE7B7' },
  'Flip':             { bg: '#431407', text: '#FCA5A1' },
}

const DEMO_METRICS: Record<StrategyKey, DemoMetrics> = {
  'Wholesale': {
    coc: '—', capRate: '—', cashFlow: '$28,400', risk: 15,
    riskLabel: 'Low Risk', riskColor: '#10B981',
    aiSummary: 'Strong assignment play. ARV supports a $28,400 fee at current asking. Comparable sales within 0.3mi confirm valuation. Close in 8–12 days with title company on standby.',
  },
  'Creative Finance': {
    coc: '18.2%', capRate: '—', cashFlow: '$1,104/mo', risk: 42,
    riskLabel: 'Medium Risk', riskColor: '#F59E0B',
    aiSummary: 'Subject-to scenario viable — seller has 3.1% existing rate. Monthly carry cost $842 against $1,946 market rent. Spread is favorable. Verify title is clean before proceeding.',
  },
  'BRRRR': {
    coc: '14.2%', capRate: '7.1%', cashFlow: '$892/mo', risk: 38,
    riskLabel: 'Medium Risk', riskColor: '#F59E0B',
    aiSummary: 'Post-rehab ARV at $185k supports full refinance at 75% LTV. Estimated $28k rehab. Cash-out refi recovers 94% of invested capital. Strong BRRRR candidate in this zip code.',
  },
  'Buy & Hold': {
    coc: '8.4%', capRate: '6.2%', cashFlow: '$487/mo', risk: 23,
    riskLabel: 'Low Risk', riskColor: '#10B981',
    aiSummary: 'Strong fundamentals. Rent-to-price ratio in top quartile for Memphis market. Neighborhood trajectory positive — median values up 12% YoY. Recommend 20% down, conventional 30yr.',
  },
  'Flip': {
    coc: '—', capRate: '—', cashFlow: '$44,200 profit', risk: 55,
    riskLabel: 'Medium Risk', riskColor: '#F59E0B',
    aiSummary: '$28k rehab estimate on a 1,240 sqft ranch. Comparable flips at $192k–$204k in past 90 days. 18% projected ROI assuming 5-month hold. Contingency budget recommended.',
  },
}

const TICKER_DEALS: Array<{ city: string; strategy: StrategyKey; metric: string }> = [
  { city: 'Memphis, TN',       strategy: 'Buy & Hold',       metric: '8.4% CoC' },
  { city: 'Phoenix, AZ',       strategy: 'BRRRR',            metric: '14.2% CoC' },
  { city: 'Atlanta, GA',       strategy: 'Wholesale',        metric: '$28,400 fee' },
  { city: 'Dallas, TX',        strategy: 'Creative Finance', metric: '$0 down' },
  { city: 'Tampa, FL',         strategy: 'Flip',             metric: '$44,200 profit' },
  { city: 'Nashville, TN',     strategy: 'Buy & Hold',       metric: '9.1% CoC' },
  { city: 'Charlotte, NC',     strategy: 'BRRRR',            metric: '16.8% CoC' },
  { city: 'Jacksonville, FL',  strategy: 'Wholesale',        metric: '$19,800 fee' },
  { city: 'Indianapolis, IN',  strategy: 'Buy & Hold',       metric: '11.2% CoC' },
  { city: 'Kansas City, MO',   strategy: 'Creative Finance', metric: '21.4% annualized' },
]

const STATS = [
  { value: '2,400+', label: 'Deals analyzed' },
  { value: '$840M',  label: 'Deal value tracked' },
  { value: '48',     label: 'Markets covered' },
  { value: '4.9★',   label: 'Avg. rating' },
]

const PRICING: PricingTier[] = [
  {
    name: 'Free', price: '$0', period: 'forever',
    description: 'Everything you need to get started.',
    features: ['5 deal analyses / month', 'Pipeline (up to 10 deals)', 'Basic AI chat', 'PDF exports'],
    highlighted: false, cta: 'Start free',
  },
  {
    name: 'Pro', price: '$29', period: 'per month',
    description: 'For active investors and agents.',
    features: ['Unlimited deal analyses', 'Unlimited pipeline', 'Document AI (10 uploads / mo)', 'Offer letter generator', 'Deal sharing links', 'Priority support'],
    highlighted: true, cta: 'Start Pro trial',
  },
  {
    name: 'Team', price: '$99', period: 'per month',
    description: 'For real estate teams and brokerages.',
    features: ['Everything in Pro', 'Up to 10 team members', 'Shared pipeline & deals', 'Role-based access', 'Unlimited document AI', 'Team analytics'],
    highlighted: false, cta: 'Contact sales',
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   Navbar
═══════════════════════════════════════════════════════════════════════════ */

function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={cn(
        'fixed top-0 w-full z-50 transition-all duration-300',
        scrolled
          ? 'backdrop-blur-xl bg-app-bg/85 border-b border-border-subtle'
          : 'bg-transparent',
      )}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-accent-primary flex items-center justify-center">
            <span className="text-[10px] font-bold text-white font-mono">P</span>
          </div>
          <span className="text-sm font-semibold text-text-primary tracking-tight">Parcel</span>
        </div>

        {/* Center nav */}
        <div className="hidden md:flex items-center gap-7 text-sm text-text-secondary">
          {[
            { label: 'Features', href: '#features' },
            { label: 'How it works', href: '#how-it-works' },
            { label: 'Pricing', href: '#pricing' },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="hover:text-text-primary transition-colors duration-150 cursor-pointer"
            >
              {label}
            </a>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-150 cursor-pointer"
          >
            Sign in
          </Link>
          <Link to="/register">
            <Button
              size="sm"
              className="bg-accent-primary hover:bg-accent-hover text-white text-sm h-8 px-4 cursor-pointer transition-colors duration-150"
            >
              Get started
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Interactive Demo Card (hero section feature)
═══════════════════════════════════════════════════════════════════════════ */

function DemoCard() {
  const [active, setActive] = useState<StrategyKey>('Buy & Hold')
  const metrics = DEMO_METRICS[active]
  const colors = STRATEGY_COLORS[active]

  const metricCells: Array<{ label: string; value: string; color?: string }> = [
    { label: 'Cash-on-Cash', value: metrics.coc },
    { label: 'Cap Rate',     value: metrics.capRate },
    { label: 'Cash Flow',    value: metrics.cashFlow },
    { label: 'Risk Score',   value: String(metrics.risk), color: metrics.riskColor },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-2xl mx-auto rounded-2xl border border-border-default bg-app-surface overflow-hidden shadow-[0_32px_80px_-16px_rgba(0,0,0,0.7)]"
    >
      {/* Window chrome */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle bg-app-elevated/40">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            {['#3a3a3a', '#3a3a3a', '#3a3a3a'].map((c, i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
            ))}
          </div>
          <span className="text-[11px] font-mono text-text-muted ml-1">
            2847 Oak Street, Memphis TN 38103
          </span>
        </div>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {active}
        </span>
      </div>

      {/* Strategy tabs */}
      <div className="flex border-b border-border-subtle overflow-x-auto scrollbar-none">
        {STRATEGIES.map((s) => (
          <button
            key={s}
            onClick={() => setActive(s)}
            className={cn(
              'flex-1 py-2.5 text-[11px] font-medium transition-all duration-150 cursor-pointer whitespace-nowrap min-w-0 px-2',
              active === s
                ? 'text-accent-primary bg-accent-primary/5 border-b-2 border-accent-primary'
                : 'text-text-muted hover:text-text-secondary hover:bg-app-elevated/30',
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Metrics */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          {/* KPI row */}
          <div className="grid grid-cols-4 divide-x divide-border-subtle border-b border-border-subtle">
            {metricCells.map(({ label, value, color }) => (
              <div key={label} className="px-4 py-4 space-y-1">
                <p className="text-[9px] uppercase tracking-[0.1em] text-text-muted font-medium">
                  {label}
                </p>
                <p
                  className="text-xl font-mono font-semibold text-text-primary leading-none"
                  style={color ? { color } : undefined}
                >
                  {value}
                </p>
                {label === 'Risk Score' && (
                  <p className="text-[9px] font-medium" style={{ color: metrics.riskColor }}>
                    {metrics.riskLabel}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* AI summary */}
          <div className="px-5 py-4">
            <div className="flex gap-3 p-3.5 rounded-xl bg-app-elevated border border-border-subtle">
              <div className="w-5 h-5 rounded-md bg-accent-primary/20 border border-accent-primary/30 flex items-center justify-center shrink-0 mt-px">
                <span className="text-[8px] font-bold text-accent-primary">AI</span>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] uppercase tracking-[0.1em] text-accent-primary font-semibold">
                  Analysis
                </p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {metrics.aiSummary}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Hero
═══════════════════════════════════════════════════════════════════════════ */

function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 overflow-hidden">

      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.1) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Gradient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="blob-1 absolute rounded-full blur-[130px]"
          style={{ background: '#6366F1', opacity: 0.22, width: 560, height: 560, top: '0%', left: '5%' }}
        />
        <div
          className="blob-2 absolute rounded-full blur-[110px]"
          style={{ background: '#8B5CF6', opacity: 0.16, width: 420, height: 420, top: '30%', right: '5%' }}
        />
        <div
          className="blob-3 absolute rounded-full blur-[100px]"
          style={{ background: '#6366F1', opacity: 0.12, width: 340, height: 340, bottom: '10%', left: '42%' }}
        />
      </div>

      {/* Vignette — bottom fade into next section */}
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-app-bg to-transparent pointer-events-none z-10" />

      <div className="relative z-10 w-full max-w-4xl mx-auto px-6 flex flex-col items-center text-center space-y-8 py-20">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent-primary/30 bg-accent-primary/8 text-accent-primary text-xs font-medium"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
          Built for real estate professionals
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-1"
        >
          <h1
            className="font-bold text-text-primary leading-[0.95] tracking-tight"
            style={{ fontSize: 'clamp(48px, 7vw, 80px)' }}
          >
            Close More Deals.
          </h1>
          <h1
            className="font-bold leading-[0.95] tracking-tight"
            style={{ fontSize: 'clamp(48px, 7vw, 80px)', color: '#6366F1' }}
          >
            Know Every Number.
          </h1>
        </motion.div>

        {/* Subhead */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-base text-text-secondary max-w-md leading-relaxed"
        >
          Analyze any deal in seconds. Track your pipeline. Process documents with AI.
          Everything a real estate professional needs — in one platform.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex items-center gap-3"
        >
          <Link to="/register">
            <Button className="bg-accent-primary hover:bg-accent-hover text-white h-11 px-6 text-sm font-semibold cursor-pointer transition-colors duration-150">
              Get Started Free
              <ArrowRight size={14} className="ml-1.5" />
            </Button>
          </Link>
          <button className="h-11 px-6 text-sm text-text-secondary hover:text-text-primary border border-border-default hover:border-border-strong rounded-lg transition-colors duration-150 cursor-pointer font-medium">
            View demo
          </button>
        </motion.div>

        {/* Interactive demo card */}
        <DemoCard />
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Live Deal Ticker
═══════════════════════════════════════════════════════════════════════════ */

function Ticker() {
  const doubled = [...TICKER_DEALS, ...TICKER_DEALS]

  return (
    <div className="relative w-full overflow-hidden border-y border-border-subtle bg-app-surface/60 py-3">
      {/* Edge fades */}
      <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-app-bg to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-app-bg to-transparent z-10 pointer-events-none" />

      <div className="ticker-animate flex gap-10 w-max">
        {doubled.map((deal, i) => (
          <div key={i} className="flex items-center gap-2.5 shrink-0">
            <span className="text-[11px] font-mono text-text-muted">{deal.city}</span>
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: STRATEGY_COLORS[deal.strategy].bg, color: STRATEGY_COLORS[deal.strategy].text }}
            >
              {deal.strategy}
            </span>
            <span className="text-[11px] font-mono font-semibold text-text-secondary">
              {deal.metric}
            </span>
            <span className="text-border-strong text-[10px] mx-1">·</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Social Proof Stats
═══════════════════════════════════════════════════════════════════════════ */

function StatsStrip() {
  return (
    <section className="py-16 px-6 border-b border-border-subtle">
      <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10">
        {STATS.map(({ value, label }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.35, delay: i * 0.06 }}
            className="text-center space-y-1"
          >
            <p className="text-3xl font-mono font-bold text-text-primary">{value}</p>
            <p className="text-xs text-text-muted tracking-wide">{label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Features — Bento Grid
   Layout: [large 2-col card | tall right card]
            [full-width pipeline card            ]
═══════════════════════════════════════════════════════════════════════════ */

function FeaturesBento() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-5xl mx-auto space-y-14">

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
          className="space-y-3"
        >
          <p className="text-[10px] uppercase tracking-[0.15em] text-accent-primary font-semibold">
            Features
          </p>
          <h2 className="text-3xl font-semibold text-text-primary">
            The full stack for deal professionals
          </h2>
          <p className="text-sm text-text-secondary max-w-md leading-relaxed">
            One platform replaces five spreadsheets, two apps, and your legal pad.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* ── Large: Multi-Strategy Analysis ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4 }}
            className="md:col-span-2 rounded-2xl border border-border-subtle bg-app-surface p-6 space-y-5 overflow-hidden relative cursor-default"
          >
            {/* Subtle top accent line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-primary/40 to-transparent" />

            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center">
                <Calculator size={17} className="text-accent-primary" />
              </div>
              <h3 className="font-semibold text-text-primary">Multi-Strategy Analysis</h3>
              <p className="text-xs text-text-secondary leading-relaxed max-w-sm">
                Run wholesale, creative finance, BRRRR, buy & hold, and flip simultaneously. Know which strategy wins before you make the call.
              </p>
            </div>

            {/* Strategy badge strip */}
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(STRATEGY_COLORS) as StrategyKey[]).map((s) => (
                <span
                  key={s}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-md"
                  style={{ backgroundColor: STRATEGY_COLORS[s].bg, color: STRATEGY_COLORS[s].text }}
                >
                  {s}
                </span>
              ))}
            </div>

            {/* Mini KPI mockup */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Cash-on-Cash', value: '8.4%',   color: '#10B981' },
                { label: 'Cap Rate',     value: '6.2%',   color: '#F1F5F9' },
                { label: 'Risk Score',   value: '23 / Low', color: '#10B981' },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="p-3 rounded-xl bg-app-elevated border border-border-subtle space-y-1"
                >
                  <p className="text-[9px] uppercase tracking-widest text-text-muted">{label}</p>
                  <p className="text-base font-mono font-semibold leading-none" style={{ color }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Right: AI Document Processing ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="rounded-2xl border border-border-subtle bg-app-surface p-6 space-y-5 cursor-default"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-accent-secondary/10 border border-accent-secondary/20 flex items-center justify-center">
                <FileText size={17} className="text-accent-secondary" />
              </div>
              <h3 className="font-semibold text-text-primary">AI Document Processing</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Upload contracts and leases. Claude extracts key terms, flags risks, and answers your questions in plain English.
              </p>
            </div>

            {/* Mini doc list mockup */}
            <div className="space-y-2">
              {[
                { name: 'Purchase Agreement.pdf', status: 'Ready',      color: '#10B981', dot: '#10B981' },
                { name: 'Inspection Report.pdf',  status: 'Processing', color: '#F59E0B', dot: '#F59E0B' },
                { name: 'Title Commitment.pdf',   status: 'Queued',     color: '#3B82F6', dot: '#3B82F6' },
              ].map(({ name, status, color, dot }) => (
                <div
                  key={name}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-app-elevated border border-border-subtle gap-2"
                >
                  <p className="text-[10px] text-text-secondary font-mono truncate flex-1">{name}</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dot }} />
                    <span className="text-[9px] font-semibold" style={{ color }}>{status}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Full width: Deal Pipeline ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4, delay: 0.12 }}
            className="md:col-span-3 rounded-2xl border border-border-subtle bg-app-surface p-6 space-y-5 cursor-default"
          >
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-accent-success/10 border border-accent-success/20 flex items-center justify-center">
                  <GitBranch size={17} className="text-accent-success" />
                </div>
                <h3 className="font-semibold text-text-primary">Deal Pipeline</h3>
                <p className="text-xs text-text-secondary leading-relaxed max-w-md">
                  Drag deals through a Kanban board from lead to close. Full pipeline visibility for your entire team.
                </p>
              </div>
            </div>

            {/* Mini Kanban */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { stage: 'Lead',           count: 4, deals: ['1842 Pine St', '903 Elm Ave', '6601 Oak Rd'] },
                { stage: 'Analyzing',      count: 2, deals: ['2847 Oak St', '4102 Maple Ln'] },
                { stage: 'Offer Sent',     count: 1, deals: ['4421 Birch Dr'] },
                { stage: 'Under Contract', count: 1, deals: ['7709 Cedar Blvd'] },
              ].map(({ stage, count, deals }) => (
                <div key={stage} className="bg-app-elevated rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] uppercase tracking-[0.12em] text-text-muted font-semibold">
                      {stage}
                    </p>
                    <span className="text-[9px] font-mono text-text-disabled bg-app-overlay px-1.5 py-0.5 rounded">
                      {count}
                    </span>
                  </div>
                  {deals.map((deal) => (
                    <div key={deal} className="p-2 rounded-lg bg-app-surface border border-border-subtle">
                      <p className="text-[10px] text-text-secondary font-mono truncate">{deal}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   How It Works — Editorial numbered steps
═══════════════════════════════════════════════════════════════════════════ */

function HowItWorks() {
  const steps = [
    {
      number: '01', title: 'Analyze',
      description: 'Enter any address and deal terms. Parcel runs all five investment strategies simultaneously and gives you a risk score in seconds — not hours.',
      icon: Calculator,
    },
    {
      number: '02', title: 'Track',
      description: 'Add the deal to your pipeline with one click. Move it through stages with drag-and-drop as you negotiate, inspect, and do your diligence.',
      icon: GitBranch,
    },
    {
      number: '03', title: 'Close',
      description: 'Generate offer letters, share deal summaries with your partners, and log every closed deal to your portfolio tracker.',
      icon: TrendingUp,
    },
  ]

  return (
    <section id="how-it-works" className="py-24 px-6 border-t border-border-subtle">
      <div className="max-w-4xl mx-auto space-y-16">

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
          className="space-y-3"
        >
          <p className="text-[10px] uppercase tracking-[0.15em] text-accent-primary font-semibold">
            Process
          </p>
          <h2 className="text-3xl font-semibold text-text-primary">
            From lead to close in three steps
          </h2>
        </motion.div>

        <div className="space-y-0 divide-y divide-border-subtle">
          {steps.map(({ number, title, description, icon: Icon }, i) => (
            <motion.div
              key={number}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className="flex items-start gap-8 py-9"
            >
              {/* Large decorative number */}
              <span
                className="font-mono font-bold shrink-0 leading-none select-none tabular-nums"
                style={{ fontSize: 'clamp(52px, 6vw, 72px)', color: 'rgba(99,102,241,0.13)' }}
              >
                {number}
              </span>

              {/* Content */}
              <div className="pt-1.5 flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-app-elevated border border-border-subtle flex items-center justify-center">
                    <Icon size={14} className="text-accent-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed max-w-lg">
                  {description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Pricing
═══════════════════════════════════════════════════════════════════════════ */

function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6 border-t border-border-subtle">
      <div className="max-w-5xl mx-auto space-y-14">

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
          className="space-y-3"
        >
          <p className="text-[10px] uppercase tracking-[0.15em] text-accent-primary font-semibold">
            Pricing
          </p>
          <h2 className="text-3xl font-semibold text-text-primary">Simple, transparent pricing</h2>
          <p className="text-sm text-text-secondary">
            No annual contracts. No per-deal fees. Cancel any time.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PRICING.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className={cn(
                'rounded-2xl border p-6 space-y-6 relative overflow-hidden',
                tier.highlighted
                  ? 'border-accent-primary/50 bg-accent-primary/5'
                  : 'border-border-subtle bg-app-surface',
              )}
            >
              {/* Pro card top glow line */}
              {tier.highlighted && (
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent-primary to-transparent" />
              )}

              {/* Pro ambient glow */}
              {tier.highlighted && (
                <div
                  className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-20 rounded-full pointer-events-none"
                  style={{ background: 'rgba(99,102,241,0.18)', filter: 'blur(24px)' }}
                />
              )}

              {/* Header */}
              <div className="space-y-1">
                {tier.highlighted && (
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-accent-primary mb-2">
                    Most popular
                  </p>
                )}
                <p className="font-semibold text-text-primary">{tier.name}</p>
                <p className="text-xs text-text-muted">{tier.description}</p>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold font-mono text-text-primary">{tier.price}</span>
                <span className="text-xs text-text-muted">/ {tier.period}</span>
              </div>

              {/* Features */}
              <ul className="space-y-2.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-text-secondary">
                    <Check size={12} className="text-accent-success mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link to="/register" className="block">
                <Button
                  className={cn(
                    'w-full text-sm font-semibold cursor-pointer transition-colors duration-150',
                    tier.highlighted
                      ? 'bg-accent-primary hover:bg-accent-hover text-white'
                      : 'bg-app-elevated hover:bg-border-subtle text-text-primary border border-border-default hover:border-border-strong',
                  )}
                >
                  {tier.cta}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Final CTA — full-width section (specified in design brief)
═══════════════════════════════════════════════════════════════════════════ */

function FinalCTA() {
  return (
    <section className="py-24 px-6 border-t border-border-subtle relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 60% at 50% 100%, rgba(99,102,241,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-3xl mx-auto text-center space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          <div className="w-10 h-10 rounded-2xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center mx-auto">
            <Zap size={18} className="text-accent-primary" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-text-primary leading-tight tracking-tight">
            Your next deal is waiting.
          </h2>
          <p className="text-text-secondary text-base max-w-sm mx-auto leading-relaxed">
            Join investors who use Parcel to find and close more profitable deals.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link to="/register">
            <Button className="bg-accent-primary hover:bg-accent-hover text-white h-12 px-8 text-sm font-semibold cursor-pointer transition-colors duration-150">
              Get Started Free
              <ArrowRight size={14} className="ml-2" />
            </Button>
          </Link>
          <p className="text-xs text-text-muted flex items-center gap-1.5">
            <Shield size={11} className="text-text-disabled" />
            No credit card required
          </p>
        </motion.div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Footer
═══════════════════════════════════════════════════════════════════════════ */

function Footer() {
  return (
    <footer className="border-t border-border-subtle py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-accent-primary/20 border border-accent-primary/30 flex items-center justify-center">
            <span className="text-[8px] font-bold text-accent-primary font-mono">P</span>
          </div>
          <span className="text-sm font-semibold text-text-secondary">Parcel</span>
        </div>

        <div className="flex gap-6 text-xs text-text-muted">
          {['Privacy', 'Terms', 'Support', 'GitHub'].map((link) => (
            <a
              key={link}
              href="#"
              className="hover:text-text-secondary transition-colors duration-150 cursor-pointer"
            >
              {link}
            </a>
          ))}
        </div>

        <p className="text-xs text-text-muted">
          © 2026 Parcel · Powered by{' '}
          <span className="text-text-secondary">Anthropic</span>
        </p>
      </div>
    </footer>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Page
═══════════════════════════════════════════════════════════════════════════ */

export default function Landing() {
  return (
    <div className="min-h-screen text-text-primary">
      <ParallaxBackground />
      <div className="relative z-10">
        <Navbar />
        <Hero />
        <Ticker />
        <StatsStrip />
        <FeaturesBento />
        <HowItWorks />
        <Pricing />
        <FinalCTA />
        <Footer />
      </div>
    </div>
  )
}
