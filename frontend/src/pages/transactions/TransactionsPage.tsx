// frontend/src/pages/transactions/TransactionsPage.tsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, Plus, Trash2 } from 'lucide-react'
import { Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ComposedChart, CartesianGrid } from 'recharts'
import { CHART_ANIMATION } from '@/lib/chart-theme'
import { AppShell } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/EmptyState'
import { AddTransactionModal } from '@/components/transactions/AddTransactionModal'
import { cn } from '@/lib/utils'
import { safeStaggerContainer, safeStaggerItem } from '@/lib/motion'
import { useTransactions, useTransactionSummary, useDeleteTransaction } from '@/hooks/useTransactions'
import { useProperties } from '@/hooks/useProperties'
import type { TransactionFilters } from '@/types'

type DateRange = 'this_month' | 'last_3' | 'this_year' | 'all'

function getDateRange(range: DateRange): { date_from?: string; date_to?: string } {
  const now = new Date()
  if (range === 'this_month') {
    return { date_from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01` }
  }
  if (range === 'last_3') {
    const d = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    return { date_from: d.toISOString().split('T')[0] }
  }
  if (range === 'this_year') {
    return { date_from: `${now.getFullYear()}-01-01` }
  }
  return {}
}

const CATEGORY_COLORS: Record<string, string> = {
  income: 'bg-profit-bg text-profit border-profit/30',
  expense: 'bg-loss-bg text-loss border-loss/30',
  transfer: 'bg-info-bg text-info border-info/30',
}

export default function TransactionsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('last_3')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [propertyFilter, setPropertyFilter] = useState<string>('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [page, setPage] = useState(1)

  const dateFilters = getDateRange(dateRange)
  const filters: TransactionFilters = {
    ...dateFilters,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    property_id: propertyFilter || undefined,
    page,
    per_page: 25,
  }

  const { data: txnData, isLoading } = useTransactions(filters)
  const { data: summary } = useTransactionSummary(dateFilters)
  const { data: propertiesData } = useProperties({})
  const deleteMutation = useDeleteTransaction()

  const transactions = txnData?.items ?? []
  const properties = (propertiesData?.properties ?? []).map(p => ({ id: p.id, address: p.address_line1 }))

  // Current month KPIs
  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const currentMonth = summary?.by_month.find(m => m.month === currentMonthKey)
  const monthIncome = currentMonth?.income ?? 0
  const monthExpenses = currentMonth?.expenses ?? 0
  const monthNet = currentMonth?.net ?? 0

  // PostHog
  try {
    (window as any).posthog?.capture?.('transactions_page_viewed', {
      count: txnData?.total ?? 0,
      date_range: dateRange,
    })
  } catch { /* ignore */ }

  function handleDelete(id: string) {
    if (!confirm('Delete this transaction?')) return
    deleteMutation.mutate(id)
  }

  return (
    <AppShell title="Transactions">
      <motion.div
        variants={safeStaggerContainer(100)}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Header */}
        <motion.div variants={safeStaggerItem} className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="font-brand font-light text-xl sm:text-2xl text-text-primary">
            Transactions
          </h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-violet-400 text-white hover:bg-violet-500 transition-colors cursor-pointer"
          >
            <Plus size={14} /> Add Transaction
          </button>
        </motion.div>

        {/* KPI row */}
        <motion.div variants={safeStaggerItem} className="grid grid-cols-3 gap-3">
          <KpiCard label="Income (this month)" value={monthIncome} color="text-profit" />
          <KpiCard label="Expenses (this month)" value={monthExpenses} color="text-loss" />
          <KpiCard label="Net (this month)" value={monthNet} color={monthNet >= 0 ? 'text-profit' : 'text-loss'} />
        </motion.div>

        {/* Filters */}
        <motion.div variants={safeStaggerItem} className="flex items-center gap-3 flex-wrap">
          {/* Category pills */}
          <div className="flex items-center gap-1 p-1 bg-app-recessed rounded-lg border border-border-default">
            {['all', 'income', 'expense', 'transfer'].map(c => (
              <button
                key={c}
                onClick={() => { setCategoryFilter(c); setPage(1) }}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer capitalize',
                  categoryFilter === c ? 'bg-violet-400/15 text-violet-400' : 'text-text-muted hover:text-text-secondary'
                )}
              >
                {c === 'all' ? 'All' : c}
              </button>
            ))}
          </div>

          {/* Property filter */}
          <select
            value={propertyFilter}
            onChange={(e) => { setPropertyFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 bg-app-recessed border border-border-default rounded-lg text-xs text-text-primary focus:border-violet-400 outline-none"
          >
            <option value="">All Properties</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.address}</option>
            ))}
          </select>

          {/* Date range */}
          <div className="flex items-center gap-1 p-1 bg-app-recessed rounded-lg border border-border-default">
            {([
              { value: 'this_month', label: 'This Month' },
              { value: 'last_3', label: 'Last 3 Mo' },
              { value: 'this_year', label: 'This Year' },
              { value: 'all', label: 'All' },
            ] as const).map(r => (
              <button
                key={r.value}
                onClick={() => { setDateRange(r.value); setPage(1) }}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer',
                  dateRange === r.value ? 'bg-violet-400/15 text-violet-400' : 'text-text-muted hover:text-text-secondary'
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-app-recessed rounded-lg animate-pulse" />)}
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            heading="No transactions yet"
            description="Start tracking your income and expenses."
          />
        ) : (
          <div className="bg-app-recessed border border-border-default rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] text-text-muted uppercase tracking-wider border-b border-border-default">
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Property</th>
                    <th className="text-left py-3 px-4">Description</th>
                    <th className="text-left py-3 px-4">Category</th>
                    <th className="text-left py-3 px-4">Type</th>
                    <th className="text-right py-3 px-4">Amount</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(txn => {
                    const amt = Number(txn.amount)
                    const isPositive = amt >= 0
                    const catColor = CATEGORY_COLORS[txn.category || ''] || CATEGORY_COLORS.expense
                    const typeLabel = (txn.transaction_type || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                    return (
                      <tr key={txn.id} className="border-b border-border-default/50 last:border-0 hover:bg-app-surface transition-colors">
                        <td className="py-3 px-4 text-text-secondary whitespace-nowrap">
                          {new Date(txn.occurred_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4 text-text-primary max-w-[200px] truncate">{txn.property_address || '—'}</td>
                        <td className="py-3 px-4 text-text-secondary max-w-[200px] truncate">{txn.description || '—'}</td>
                        <td className="py-3 px-4">
                          <span className={cn('text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border', catColor)}>
                            {txn.category || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-text-muted">{typeLabel}</td>
                        <td className={cn('py-3 px-4 text-right tabular-nums font-medium', isPositive ? 'text-profit' : 'text-loss')}>
                          {isPositive ? '+' : ''}${Math.abs(amt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDelete(txn.id)}
                            aria-label="Delete transaction"
                            className="p-1 rounded text-text-muted hover:text-loss hover:bg-loss-bg transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {txnData && txnData.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border-default">
                <span className="text-xs text-text-muted">{txnData.total} transactions</span>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(txnData.pages, 5) }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        'w-8 h-8 text-xs rounded transition-colors cursor-pointer',
                        p === page ? 'bg-violet-400/15 text-violet-400' : 'text-text-muted hover:text-text-secondary'
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Monthly Summary Chart */}
        {summary && summary.by_month.length > 0 && (
          <div className="bg-[var(--chart-bg)] border border-[var(--chart-border)] rounded-xl p-5">
            <h3 className="text-[11px] text-[var(--chart-axis-text)] uppercase tracking-wider font-medium mb-4">
              Monthly Income vs Expenses
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={summary.by_month} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: 'var(--chart-axis-text)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => {
                    const [y, m] = v.split('-')
                    return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'short' })
                  }}
                />
                <YAxis
                  tick={{ fill: 'var(--chart-axis-text)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--chart-tooltip-bg)',
                    border: '1px solid var(--chart-tooltip-border)',
                    borderRadius: '8px',
                    boxShadow: 'var(--chart-tooltip-shadow)',
                    backdropFilter: 'blur(var(--chart-tooltip-blur))',
                  }}
                  formatter={(v: number, name: string) => [`$${v.toLocaleString()}`, name === 'income' ? 'Income' : name === 'expenses' ? 'Expenses' : 'Net']}
                />
                <Bar dataKey="income" fill="var(--chart-positive)" radius={[4, 4, 0, 0]} barSize={20} {...CHART_ANIMATION} />
                <Bar dataKey="expenses" fill="var(--chart-negative)" radius={[4, 4, 0, 0]} barSize={20} {...CHART_ANIMATION} />
                <Line type="monotone" dataKey="net" stroke="var(--chart-tooltip-text)" strokeWidth={2} dot={false} {...CHART_ANIMATION} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.div>

      <AddTransactionModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        properties={properties}
      />
    </AppShell>
  )
}

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-app-recessed border border-border-default rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">{label}</p>
      <p className={cn('text-xl font-medium tabular-nums', color)}>
        ${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  )
}
