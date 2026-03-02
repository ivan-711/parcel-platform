/** Portfolio dashboard — KPI overview, cash-flow chart, and closed deals table. */

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Inbox, Pencil, Plus } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
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

import { usePortfolio } from '@/hooks/usePortfolio'
import { useDeals } from '@/hooks/useDeals'
import { api } from '@/lib/api'
import { EditPortfolioModal } from '@/components/edit-portfolio-modal'
import type { Strategy, AddPortfolioEntryRequest, PortfolioEntry } from '@/types'
import type { EditPortfolioData } from '@/components/edit-portfolio-modal'

/* ── Animation variants (same as Dashboard) ── */

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

/* ── Helpers ── */

function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '—'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '—'
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

/* ── Chart tooltip ── */

interface ChartPayloadItem {
  value: number
}

function ChartTooltipContent({ active, payload, label }: {
  active?: boolean
  payload?: ChartPayloadItem[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0F0F1A] border border-[#1A1A2E] rounded-lg px-3 py-2 text-xs">
      <p className="text-[#94A3B8] mb-1">{label}</p>
      <p className="font-mono text-[#F1F5F9]">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

/* ── Add Entry Form ── */

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
        <Label className="text-text-secondary text-xs">Deal</Label>
        <Select value={dealId} onValueChange={setDealId}>
          <SelectTrigger className="bg-[#08080F] border-[#1A1A2E] text-text-primary">
            <SelectValue placeholder="Select a deal" />
          </SelectTrigger>
          <SelectContent className="bg-[#0F0F1A] border-[#1A1A2E]">
            {deals?.map((d) => (
              <SelectItem key={d.id} value={d.id} className="text-text-primary focus:bg-[#1A1A2E]">
                {d.address} ({strategyLabel(d.strategy)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-text-secondary text-xs">Closed Date</Label>
        <Input
          type="date"
          value={closedDate}
          onChange={(e) => setClosedDate(e.target.value)}
          className="bg-[#08080F] border-[#1A1A2E] text-text-primary"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-text-secondary text-xs">Closed Price ($)</Label>
        <Input
          type="number"
          value={closedPrice}
          onChange={(e) => setClosedPrice(e.target.value)}
          placeholder="0"
          className="bg-[#08080F] border-[#1A1A2E] text-text-primary font-mono"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-text-secondary text-xs">Profit ($)</Label>
        <Input
          type="number"
          value={profit}
          onChange={(e) => setProfit(e.target.value)}
          placeholder="0"
          className="bg-[#08080F] border-[#1A1A2E] text-text-primary font-mono"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-text-secondary text-xs">Monthly Cash Flow ($)</Label>
        <Input
          type="number"
          value={monthlyCashFlow}
          onChange={(e) => setMonthlyCashFlow(e.target.value)}
          placeholder="0"
          className="bg-[#08080F] border-[#1A1A2E] text-text-primary font-mono"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-text-secondary text-xs">Notes (optional)</Label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="flex w-full rounded-md border border-[#1A1A2E] bg-[#08080F] px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background resize-none"
          placeholder="Optional notes about this deal"
        />
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full h-10 rounded-lg bg-accent-primary text-white text-sm font-medium transition-colors hover:bg-accent-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Adding...' : 'Add to Portfolio'}
      </button>
    </form>
  )
}

/* ── Main Page ── */

export default function PortfolioPage() {
  const { data, isLoading } = usePortfolio()
  const queryClient = useQueryClient()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<PortfolioEntry | null>(null)

  const addMutation = useMutation({
    mutationFn: (entry: AddPortfolioEntryRequest) => api.portfolio.addEntry(entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      setSheetOpen(false)
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

  /* ── Loading state ── */
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
          <KPICard label="Total Profit" value={summary?.total_profit ?? 0} format="currency" className="[&_.kpi-value]:text-accent-success" />
          <KPICard label="Monthly Cash Flow" value={summary?.total_monthly_cash_flow ?? 0} format="currency" className="[&_.kpi-value]:text-accent-success" />
          <KPICard label="Total Equity" value={summary?.total_equity ?? 0} format="currency" />
        </motion.div>

        {/* Cash Flow Over Time Chart */}
        <motion.div variants={itemVariants}>
          <div className="bg-[#0F0F1A] border border-[#1A1A2E] rounded-xl p-5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#94A3B8] mb-4">
              Cash Flow Over Time
            </p>
            {chartData.length >= 2 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="cfGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A1A2E" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => formatCurrency(v)}
                  />
                  <RechartsTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="cashFlow"
                    stroke="#6366F1"
                    fill="url(#cfGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-sm text-text-muted">
                  Add at least 2 closed deals to see your cash flow trend.
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Closed Deals Table */}
        <motion.div variants={itemVariants} className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#94A3B8]">
              Closed Deals
            </p>
            <button
              onClick={() => setSheetOpen(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-accent-primary hover:text-accent-primary/80 transition-colors"
            >
              <Plus size={14} />
              Add closed deal
            </button>
          </div>

          {entries.length === 0 ? (
            <div className="rounded-xl border border-[#1A1A2E] bg-[#0F0F1A] flex flex-col items-center justify-center py-16 gap-3">
              <Inbox size={32} className="text-text-muted" />
              <p className="text-sm text-text-muted">No closed deals yet</p>
            </div>
          ) : (
            <div className="rounded-xl border border-[#1A1A2E] bg-[#0F0F1A] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#1A1A2E]">
                      <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wide px-4 py-3">Address</th>
                      <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wide px-4 py-3">Strategy</th>
                      <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wide px-4 py-3">Closed Date</th>
                      <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wide px-4 py-3">Price</th>
                      <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wide px-4 py-3">Profit</th>
                      <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wide px-4 py-3">Monthly CF</th>
                      <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wide px-4 py-3">Notes</th>
                      <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wide px-4 py-3 w-[60px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry: PortfolioEntry) => (
                      <tr key={entry.id} className="group border-b border-[#1A1A2E] last:border-0 hover:bg-[#1A1A2E]/30 transition-colors">
                        <td className="px-4 py-3 text-sm text-[#F1F5F9]">{entry.address}</td>
                        <td className="px-4 py-3">
                          <StrategyBadge strategy={entry.strategy} />
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary font-mono text-[13px]">
                          {formatMonthYear(entry.closed_date)}
                        </td>
                        <td className="px-4 py-3 font-mono text-[13px] text-text-primary">
                          {formatCurrency(entry.closed_price)}
                        </td>
                        <td className={`px-4 py-3 font-mono text-[13px] ${parseFloat(String(entry.profit ?? 0)) >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                          {formatCurrency(entry.profit)}
                        </td>
                        <td className="px-4 py-3 font-mono text-[13px] text-text-primary">
                          {formatCurrency(entry.monthly_cash_flow)}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#94A3B8] italic max-w-[200px]">
                          <NoteCell notes={entry.notes} />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setEditingEntry(entry)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-[#1A1A2E] transition-all"
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
        <SheetContent className="bg-[#0F0F1A] border-[#1A1A2E] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-text-primary">Add Closed Deal</SheetTitle>
            <SheetDescription className="text-text-muted">
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
    </AppShell>
  )
}

/* ── Notes cell with tooltip for long text ── */

function NoteCell({ notes }: { notes: string | null }) {
  if (!notes) return <span className="text-text-muted">-</span>

  if (notes.length <= 40) return <>{notes}</>

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-default">{truncate(notes, 40)}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs bg-[#0F0F1A] border-[#1A1A2E] text-text-primary text-xs">
          {notes}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
