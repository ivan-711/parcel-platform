/** Portfolio dashboard — KPI overview, cash-flow chart, and closed deals table. */

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Inbox, Pencil, Plus } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

import { AppShell } from '@/components/layout/AppShell'
import { KPICard } from '@/components/ui/KPICard'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { StrategyBadge } from '@/components/ui/StrategyBadge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { toast } from 'sonner'

import { STRATEGY_CHART_COLORS, CHART_AXIS, CHART_GRID, CHART_ANIMATION, CHART_COLORS } from '@/lib/chart-theme'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useDeals } from '@/hooks/useDeals'
import { api } from '@/lib/api'
import { EditPortfolioModal } from '@/components/edit-portfolio-modal'
import { FeatureGate } from '@/components/billing/FeatureGate'
import type { Strategy, AddPortfolioEntryRequest, PortfolioEntry } from '@/types'
import type { EditPortfolioData } from '@/components/edit-portfolio-modal'

/* -- Animation variants (same as Dashboard) -- */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: 'easeOut' },
  },
}

/* -- Helpers -- */

function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '\u2014'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '\u2014'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num)
}

function formatMonthYear(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function strategyLabel(s: Strategy): string {
  const map: Record<Strategy, string> = {
    wholesale: 'Wholesale',
    creative_finance: 'Creative Finance',
    brrrr: 'BRRRR',
    buy_and_hold: 'Buy & Hold',
    flip: 'Flip',
  }
  return map[s]
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '...' : text
}

/* -- Strategy color map -- */

const STRATEGY_COLORS: Record<Strategy, string> = STRATEGY_CHART_COLORS as Record<Strategy, string>

/* -- Chart tooltip -- */

interface ChartPayloadItem {
  value: number
  name?: string
  payload?: Record<string, unknown>
}

function ChartTooltipContent({ active, payload, label }: {
  active?: boolean
  payload?: ChartPayloadItem[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#22211D] border border-white/[0.06] rounded-lg px-3 py-2 text-xs shadow-md">
      <p className="text-[#A09D98] mb-1">{label}</p>
      <p className="tabular-nums text-[#F0EDE8] font-medium">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

/** Custom tooltip for the strategy donut chart. */
function DonutTooltipContent({ active, payload }: {
  active?: boolean
  payload?: ChartPayloadItem[]
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  const data = item.payload as Record<string, unknown> | undefined
  return (
    <div className="bg-[#22211D] border border-white/[0.06] rounded-lg px-3 py-2 text-xs shadow-md">
      <p className="text-[#F0EDE8] font-medium mb-1">{item.name}</p>
      <p className="text-[#A09D98]">
        <span className="tabular-nums text-[#F0EDE8]">{item.value}</span> deal{item.value !== 1 ? 's' : ''}
      </p>
      {data && typeof data.totalValue === 'number' && (
        <p className="text-[#A09D98]">
          Total value: <span className="tabular-nums text-[#F0EDE8]">{formatCurrency(data.totalValue as number)}</span>
        </p>
      )}
    </div>
  )
}

/** Custom tooltip for the monthly cash flow bar chart. */
function BarTooltipContent({ active, payload, label }: {
  active?: boolean
  payload?: ChartPayloadItem[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  return (
    <div className="bg-[#22211D] border border-white/[0.06] rounded-lg px-3 py-2 text-xs shadow-md">
      <p className="text-[#A09D98] mb-1">{label}</p>
      <p className={`tabular-nums font-medium ${val >= 0 ? 'text-[#6DBEA3]' : 'text-[#D4766A]'}`}>
        {formatCurrency(val)}
      </p>
    </div>
  )
}

/** Custom legend renderer for the donut chart. */
function DonutLegend({ payload }: { payload?: Array<{ value: string; color: string; payload?: { percent?: number } }> }) {
  if (!payload) return null
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-1.5 text-xs">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[#A09D98]">{entry.value}</span>
          <span className="tabular-nums text-[#F0EDE8]">
            {entry.payload?.percent !== undefined ? `${(entry.payload.percent * 100).toFixed(0)}%` : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

/* -- Add Entry Form -- */

interface AddEntryFormProps {
  onSubmit: (data: AddPortfolioEntryRequest) => void
  isSubmitting: boolean
}

function AddEntryForm({ onSubmit, isSubmitting }: AddEntryFormProps) {
  const { data: deals } = useDeals({})
  const [dealId, setDealId] = useState('')
  const [closedDate, setClosedDate] = useState('')
  const [closedPrice, setClosedPrice] = useState('')
  const [profit, setProfit] = useState('')
  const [monthlyCashFlow, setMonthlyCashFlow] = useState('')
  const [notes, setNotes] = useState('')

  const canSubmit = dealId && closedDate && closedPrice && !isSubmitting

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit({
      deal_id: dealId,
      closed_date: closedDate,
      closed_price: Number(closedPrice),
      profit: Number(profit) || 0,
      monthly_cash_flow: Number(monthlyCashFlow) || 0,
      notes: notes || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 mt-6">
      <div className="space-y-2">
        <Label htmlFor="portfolio-deal" className="text-[#A09D98] text-xs">Deal</Label>
        <Select value={dealId} onValueChange={setDealId}>
          <SelectTrigger id="portfolio-deal" className="bg-[#131210] border border-white/[0.06] text-[#F0EDE8]">
            <SelectValue placeholder="Select a deal" />
          </SelectTrigger>
          <SelectContent className="bg-[#22211D] border-white/[0.06]">
            {deals?.map((d) => (
              <SelectItem key={d.id} value={d.id} className="text-[#F0EDE8] focus:bg-white/[0.04]">
                {d.address} ({strategyLabel(d.strategy)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="portfolio-closed-date" className="text-[#A09D98] text-xs">Closed Date</Label>
        <Input
          id="portfolio-closed-date"
          type="date"
          value={closedDate}
          onChange={(e) => setClosedDate(e.target.value)}
          className="bg-[#131210] border border-white/[0.06] text-[#F0EDE8]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="portfolio-closed-price" className="text-[#A09D98] text-xs">Closed Price ($)</Label>
        <Input
          id="portfolio-closed-price"
          type="number"
          value={closedPrice}
          onChange={(e) => setClosedPrice(e.target.value)}
          placeholder="0"
          className="bg-[#131210] border border-white/[0.06] text-[#F0EDE8] tabular-nums placeholder:text-[#5C5A56]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="portfolio-profit" className="text-[#A09D98] text-xs">Profit ($)</Label>
        <Input
          id="portfolio-profit"
          type="number"
          value={profit}
          onChange={(e) => setProfit(e.target.value)}
          placeholder="0"
          className="bg-[#131210] border border-white/[0.06] text-[#F0EDE8] tabular-nums placeholder:text-[#5C5A56]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="portfolio-cash-flow" className="text-[#A09D98] text-xs">Monthly Cash Flow ($)</Label>
        <Input
          id="portfolio-cash-flow"
          type="number"
          value={monthlyCashFlow}
          onChange={(e) => setMonthlyCashFlow(e.target.value)}
          placeholder="0"
          className="bg-[#131210] border border-white/[0.06] text-[#F0EDE8] tabular-nums placeholder:text-[#5C5A56]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="portfolio-notes" className="text-[#A09D98] text-xs">Notes (optional)</Label>
        <textarea
          id="portfolio-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="flex w-full rounded-md border border-white/[0.06] bg-[#131210] px-3 py-2 text-sm text-[#F0EDE8] placeholder:text-[#5C5A56] focus:outline-none focus:ring-2 focus:ring-[#8B7AFF]/30 focus:border-[#8B7AFF]/40 resize-none"
          placeholder="Optional notes about this deal"
        />
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full h-10 rounded-lg bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7] text-[#0C0B0A] text-sm font-medium transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Adding...' : 'Add to Portfolio'}
      </button>
    </form>
  )
}

/* -- Main Page -- */

export default function PortfolioPage() {
  const { data, isLoading, isError } = usePortfolio()
  const queryClient = useQueryClient()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<PortfolioEntry | null>(null)

  const addMutation = useMutation({
    mutationFn: (entry: AddPortfolioEntryRequest) => api.portfolio.addEntry(entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      setSheetOpen(false)
      toast.success('Deal added to portfolio')
    },
    onError: () => {
      toast.error('Failed to add entry — try again')
    },
  })

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditPortfolioData }) =>
      api.portfolio.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      setEditingEntry(null)
      toast.success('Portfolio entry updated')
    },
    onError: () => {
      toast.error('Failed to update entry — try again')
    },
  })

  const summary = data?.summary
  const entries = data?.entries ?? []

  /* Build cumulative cash-flow chart data */
  const chartData = useMemo(() => {
    if (entries.length < 2) return []
    const sorted = [...entries].sort(
      (a, b) => new Date(a.closed_date).getTime() - new Date(b.closed_date).getTime()
    )
    let cumulative = 0
    return sorted.map((e) => {
      const cashFlow = parseFloat(String(e.monthly_cash_flow ?? 0))
      cumulative += isNaN(cashFlow) ? 0 : cashFlow
      return { date: formatMonthYear(e.closed_date), cashFlow: cumulative }
    })
  }, [entries])

  /* Strategy breakdown donut chart data */
  const strategyBreakdownData = useMemo(() => {
    if (entries.length === 0) return []
    const grouped: Record<Strategy, { count: number; totalValue: number }> = {
      wholesale: { count: 0, totalValue: 0 },
      creative_finance: { count: 0, totalValue: 0 },
      brrrr: { count: 0, totalValue: 0 },
      buy_and_hold: { count: 0, totalValue: 0 },
      flip: { count: 0, totalValue: 0 },
    }
    for (const entry of entries) {
      const s = entry.strategy
      if (grouped[s]) {
        grouped[s].count += 1
        grouped[s].totalValue += parseFloat(String(entry.closed_price ?? 0)) || 0
      }
    }
    return Object.entries(grouped)
      .filter(([, v]) => v.count > 0)
      .map(([key, v]) => ({
        name: strategyLabel(key as Strategy),
        value: v.count,
        totalValue: v.totalValue,
        color: STRATEGY_COLORS[key as Strategy],
      }))
  }, [entries])

  /* Monthly net cash flow bar chart data */
  const monthlyCashFlowData = useMemo(() => {
    if (entries.length === 0) return []
    const byMonth: Record<string, number> = {}
    for (const entry of entries) {
      const month = formatMonthYear(entry.closed_date)
      const cf = parseFloat(String(entry.monthly_cash_flow ?? 0))
      byMonth[month] = (byMonth[month] ?? 0) + (isNaN(cf) ? 0 : cf)
    }
    // Sort chronologically
    const sorted = Object.entries(byMonth).sort((a, b) => {
      const dateA = new Date(a[0])
      const dateB = new Date(b[0])
      return dateA.getTime() - dateB.getTime()
    })
    return sorted.map(([month, cashFlow]) => ({ month, cashFlow }))
  }, [entries])

  /* -- Error state -- */
  if (isError) {
    return (
      <AppShell title="Portfolio">
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#D4766A]/10 flex items-center justify-center">
            <Inbox className="w-6 h-6 text-[#D4766A]" />
          </div>
          <p className="text-base font-medium text-[#F0EDE8]">Failed to load portfolio</p>
          <p className="text-sm text-[#A09D98]">Check your connection and try again.</p>
        </div>
      </AppShell>
    )
  }

  /* -- Loading state -- */
  if (isLoading) {
    return (
      <AppShell title="Portfolio">
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} lines={2} />
            ))}
          </div>
          <SkeletonCard lines={4} />
          <SkeletonCard lines={3} />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Portfolio">
      <FeatureGate feature="portfolio">
      <motion.div
        className="space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* KPI Row */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <KPICard label="Total Deals Closed" value={summary?.total_deals_closed ?? 0} format="number" />
          <KPICard label="Total Profit" value={summary?.total_profit ?? 0} format="currency" className="[&_.kpi-value]:text-[#6DBEA3]" />
          <KPICard label="Monthly Cash Flow" value={summary?.total_monthly_cash_flow ?? 0} format="currency" className="[&_.kpi-value]:text-[#6DBEA3]" />
          <KPICard label="Total Equity" value={summary?.total_equity ?? 0} format="currency" />
        </motion.div>

        {/* Cash Flow Over Time Chart */}
        <motion.div variants={itemVariants}>
          <div className="bg-[#1A1916] border border-white/[0.08] rounded-xl p-5 shadow-xs edge-highlight">
            <p className="text-xs font-medium text-[#A09D98] tracking-wide mb-4">
              Cash Flow Over Time
            </p>
            {chartData.length >= 2 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="cfGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B7AFF" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#8B7AFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={CHART_GRID.stroke} strokeDasharray={CHART_GRID.strokeDasharray} strokeOpacity={CHART_GRID.strokeOpacity} vertical={CHART_GRID.vertical} />
                  <XAxis
                    dataKey="date"
                    tick={CHART_AXIS.tick}
                    axisLine={CHART_AXIS.axisLine}
                    tickLine={CHART_AXIS.tickLine}
                  />
                  <YAxis
                    tick={CHART_AXIS.tick}
                    axisLine={CHART_AXIS.axisLine}
                    tickLine={CHART_AXIS.tickLine}
                    tickFormatter={(v: number) => formatCurrency(v)}
                  />
                  <RechartsTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="cashFlow"
                    stroke="#8B7AFF"
                    fill="url(#cfGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-sm text-[#7A7872]">
                  Add at least 2 closed deals to see your cash flow trend.
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Strategy Breakdown + Monthly Cash Flow Charts */}
        {entries.length > 0 && (
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Strategy Breakdown Donut Chart */}
            <div className="bg-[#1A1916] border border-white/[0.08] rounded-xl p-6 shadow-xs edge-highlight">
              <p className="text-xs font-medium text-[#A09D98] tracking-wide mb-4">
                Portfolio by Strategy
              </p>
              {strategyBreakdownData.length > 0 ? (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={strategyBreakdownData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                        stroke="#0C0B0A"
                        strokeWidth={2}
                        {...CHART_ANIMATION}
                      >
                        {strategyBreakdownData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<DonutTooltipContent />} />
                      <Legend content={<DonutLegend />} />
                      {/* Center label — total count */}
                      <text
                        x="50%"
                        y="46%"
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="fill-[#F0EDE8]"
                        style={{ fontSize: '28px', fontFamily: 'Satoshi, system-ui, sans-serif', fontWeight: 300, fontVariantNumeric: 'tabular-nums' }}
                      >
                        {entries.length}
                      </text>
                      <text
                        x="50%"
                        y="57%"
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="fill-[#A09D98]"
                        style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}
                      >
                        deals
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[220px]">
                  <p className="text-sm text-[#7A7872]">No strategy data yet.</p>
                </div>
              )}
            </div>

            {/* Monthly Cash Flow Bar Chart */}
            <div className="bg-[#1A1916] border border-white/[0.08] rounded-xl p-6 shadow-xs edge-highlight">
              <p className="text-xs font-medium text-[#A09D98] tracking-wide mb-4">
                Monthly Cash Flow
              </p>
              {monthlyCashFlowData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyCashFlowData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                    <CartesianGrid stroke={CHART_GRID.stroke} strokeDasharray={CHART_GRID.strokeDasharray} strokeOpacity={CHART_GRID.strokeOpacity} vertical={CHART_GRID.vertical} />
                    <XAxis
                      dataKey="month"
                      tick={CHART_AXIS.tick}
                      axisLine={CHART_AXIS.axisLine}
                      tickLine={CHART_AXIS.tickLine}
                    />
                    <YAxis
                      tick={CHART_AXIS.tick}
                      axisLine={CHART_AXIS.axisLine}
                      tickLine={CHART_AXIS.tickLine}
                      tickFormatter={(v: number) => formatCurrency(v)}
                    />
                    <RechartsTooltip content={<BarTooltipContent />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Bar
                      dataKey="cashFlow"
                      radius={[4, 4, 0, 0]}
                      {...CHART_ANIMATION}
                    >
                      {monthlyCashFlowData.map((entry, index) => (
                        <Cell
                          key={`bar-${index}`}
                          fill={entry.cashFlow >= 0 ? CHART_COLORS.profit : CHART_COLORS.coral}
                          fillOpacity={0.8}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[220px]">
                  <p className="text-sm text-[#7A7872]">No monthly cash flow data yet.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Closed Deals Table */}
        <motion.div variants={itemVariants} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#F0EDE8]">
              Closed Deals
            </h2>
            <button
              onClick={() => setSheetOpen(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-[#8B7AFF] hover:text-[#A89FFF] transition-colors"
            >
              <Plus size={14} />
              Add closed deal
            </button>
          </div>

          {entries.length === 0 ? (
            <div className="rounded-xl border border-white/[0.08] bg-[#1A1916] flex flex-col items-center justify-center py-16 gap-3 shadow-xs edge-highlight">
              <Inbox size={32} className="text-[#5C5A56]" />
              <p className="text-sm text-[#7A7872]">Close your first deal to get started</p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.08] bg-[#1A1916] overflow-hidden shadow-xs edge-highlight">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                      <th className="text-left text-xs font-medium text-[#7A7872] uppercase tracking-wider px-4 py-3">Address</th>
                      <th className="text-left text-xs font-medium text-[#7A7872] uppercase tracking-wider px-4 py-3">Strategy</th>
                      <th className="text-left text-xs font-medium text-[#7A7872] uppercase tracking-wider px-4 py-3">Closed Date</th>
                      <th className="text-right text-xs font-medium text-[#7A7872] uppercase tracking-wider px-4 py-3">Price</th>
                      <th className="text-right text-xs font-medium text-[#7A7872] uppercase tracking-wider px-4 py-3">Profit</th>
                      <th className="text-right text-xs font-medium text-[#7A7872] uppercase tracking-wider px-4 py-3">Monthly CF</th>
                      <th className="text-left text-xs font-medium text-[#7A7872] uppercase tracking-wider px-4 py-3">Notes</th>
                      <th className="text-left text-xs font-medium text-[#7A7872] uppercase tracking-wider px-4 py-3 w-[60px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry: PortfolioEntry) => (
                      <tr key={entry.id} className="group border-b border-white/[0.03] last:border-0 hover:bg-white/[0.04] transition-colors">
                        <td className="px-4 py-3 text-sm text-[#F0EDE8]">{entry.address}</td>
                        <td className="px-4 py-3">
                          <StrategyBadge strategy={entry.strategy} />
                        </td>
                        <td className="px-4 py-3 text-sm text-[#A09D98] tabular-nums">
                          {formatMonthYear(entry.closed_date)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-[#F0EDE8] tabular-nums">
                          {formatCurrency(entry.closed_price)}
                        </td>
                        <td className={`px-4 py-3 text-right text-sm tabular-nums ${parseFloat(String(entry.profit ?? 0)) >= 0 ? 'text-[#6DBEA3]' : 'text-[#D4766A]'}`}>
                          {formatCurrency(entry.profit)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-[#F0EDE8] tabular-nums">
                          {formatCurrency(entry.monthly_cash_flow)}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#7A7872] italic max-w-[200px]">
                          <NoteCell notes={entry.notes} />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setEditingEntry(entry)}
                            className="md:opacity-0 md:group-hover:opacity-100 p-1.5 rounded-md text-[#7A7872] hover:text-[#F0EDE8] hover:bg-white/[0.06] transition-all"
                            aria-label="Edit entry"
                          >
                            <Pencil size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Add Entry Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="bg-[#1A1916] border-white/[0.06] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-[#F0EDE8]">Add Closed Deal</SheetTitle>
            <SheetDescription className="text-[#A09D98]">
              Record a deal you've closed to track in your portfolio.
            </SheetDescription>
          </SheetHeader>
          <AddEntryForm
            onSubmit={(data) => addMutation.mutate(data)}
            isSubmitting={addMutation.isPending}
          />
        </SheetContent>
      </Sheet>

      {/* Edit Entry Modal */}
      <EditPortfolioModal
        isOpen={editingEntry !== null}
        onClose={() => setEditingEntry(null)}
        entry={editingEntry}
        onSave={(id, data) => editMutation.mutate({ id, data })}
        isSaving={editMutation.isPending}
      />
      </FeatureGate>
    </AppShell>
  )
}

/* -- Notes cell with tooltip for long text -- */

function NoteCell({ notes }: { notes: string | null }) {
  if (!notes) return <span className="text-[#5C5A56]">-</span>

  if (notes.length <= 40) return <>{notes}</>

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-default">{truncate(notes, 40)}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs bg-[#22211D] border-white/[0.06] text-[#F0EDE8] text-xs shadow-lg">
          {notes}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
