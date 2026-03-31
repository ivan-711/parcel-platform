/** Shared constants and data for the landing page sections. */

export type StrategyKey = 'Wholesale' | 'Creative Finance' | 'BRRRR' | 'Buy & Hold' | 'Flip'

export interface DemoMetrics {
  coc: string
  capRate: string
  cashFlow: string
  risk: number
  riskLabel: string
  riskColor: string
  aiSummary: string
}

export interface PricingTier {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  highlighted: boolean
  cta: string
}

export const STRATEGIES: StrategyKey[] = ['Wholesale', 'Creative Finance', 'BRRRR', 'Buy & Hold', 'Flip']

export const STRATEGY_COLORS: Record<StrategyKey, { bg: string; text: string }> = {
  'Wholesale':        { bg: '#FEF3C7', text: '#92400E' },
  'Creative Finance': { bg: '#EDE9FE', text: '#5B21B6' },
  'BRRRR':            { bg: '#DBEAFE', text: '#1E40AF' },
  'Buy & Hold':       { bg: '#D1FAE5', text: '#065F46' },
  'Flip':             { bg: '#FFE4E6', text: '#9F1239' },
}

export const DEMO_METRICS: Record<StrategyKey, DemoMetrics> = {
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

export const TICKER_DEALS: Array<{ city: string; strategy: StrategyKey; metric: string }> = [
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

export interface StatItem {
  label: string
  numericValue: number
  prefix: string
  suffix: string
  /** Lucide icon name — mapped to component in stats-strip.tsx */
  icon: 'DollarSign' | 'BarChart3' | 'MapPin' | 'Star'
  /** Number of decimal places to show (default 0) */
  decimals?: number
  /** Whether to format with commas (default false) */
  useCommas?: boolean
}

export const STATS: StatItem[] = [
  { label: 'Deal value tracked',  numericValue: 840,  prefix: '$', suffix: 'M',  icon: 'DollarSign' },
  { label: 'Deals analyzed',      numericValue: 2400, prefix: '',  suffix: '+',  icon: 'BarChart3', useCommas: true },
  { label: 'Markets covered',     numericValue: 48,   prefix: '',  suffix: '',   icon: 'MapPin' },
  { label: 'Avg. rating',         numericValue: 4.9,  prefix: '',  suffix: '\u2605', icon: 'Star', decimals: 1 },
]

export const PRICING: PricingTier[] = [
  {
    name: 'Free', price: '$0', period: 'forever',
    description: '5 deals/month. Full pipeline. PDF exports.',
    features: ['5 deal analyses / month', 'Pipeline (up to 10 deals)', 'Basic AI chat', 'PDF exports'],
    highlighted: false, cta: 'Start free',
  },
  {
    name: 'Pro', price: '$69', period: 'per month',
    description: 'For active investors and agents. 7-day free trial.',
    features: ['Unlimited deal analyses', 'Unlimited pipeline', 'Document AI (10 uploads / mo)', 'Offer letter generator', 'Deal sharing links', 'Priority support'],
    highlighted: true, cta: 'Start 7-day free trial',
  },
  {
    name: 'Team', price: '$99', period: 'per month',
    description: 'For real estate teams and brokerages.',
    features: ['Everything in Pro', 'Up to 10 team members', 'Shared pipeline & deals', 'Role-based access', 'Unlimited document AI', 'Team analytics'],
    highlighted: false, cta: 'Contact sales',
  },
]
