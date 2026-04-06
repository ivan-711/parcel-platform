// frontend/src/pages/transactions/TransactionsPage.tsx
import { useState } from 'react'
import { DollarSign, Plus, Trash2 } from 'lucide-react'
import { Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ComposedChart, CartesianGrid } from 'recharts'
import { CHART_ANIMATION } from '@/lib/chart-theme'
import { AppShell } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/EmptyState'
import { AddTransactionModal } from '@/components/transactions/AddTransactionModal'
import { cn } from '@/lib/utils'
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
  income: 'bg-[#4ADE80]/15 text-[#4ADE80] border-[#4ADE80]/30',
  expense: 'bg-[#F87171]/15 text-[#F87171] border-[#F87171]/30',
  transfer: 'bg-[#60A5FA]/15 text-[#60A5FA] border-[#60A5FA]/30',
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl sm:text-2xl text-[#F0EDE8]" style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}>
            Transactions
          </h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] transition-colors cursor-pointer"
          >
            <Plus size={14} /> Add Transaction
          </button>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-3">
          <KpiCard label="Income (this month)" value={monthIncome} color="text-[#4ADE80]" />
          <KpiCard label="Expenses (this month)" value={monthExpenses} color="text-[#F87171]" />
          <KpiCard label="Net (this month)" value={monthNet} color={monthNet >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'} />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Category pills */}
          <div className="flex items-center gap-1 p-1 bg-[#141311] rounded-lg border border-[#1E1D1B]">
            {['all', 'income', 'expense', 'transfer'].map(c => (
              <button
                key={c}
                onClick={() => { setCategoryFilter(c); setPage(1) }}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer capitalize',
                  categoryFilter === c ? 'bg-[#8B7AFF]/15 text-[#8B7AFF]' : 'text-[#8A8580] hover:text-[#C5C0B8]'
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
            className="px-3 py-2 bg-[#141311] border border-[#1E1D1B] rounded-lg text-xs text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
          >
            <option value="">All Properties</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.address}</option>
            ))}
          </select>

          {/* Date range */}
          <div className="flex items-center gap-1 p-1 bg-[#141311] rounded-lg border border-[#1E1D1B]">
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
                  dateRange === r.value ? 'bg-[#8B7AFF]/15 text-[#8B7AFF]' : 'text-[#8A8580] hover:text-[#C5C0B8]'
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-[#141311] rounded-lg animate-pulse" />)}
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            heading="No transactions yet"
            description="Start tracking your income and expenses."
          />
        ) : (
          <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] text-[#8A8580] uppercase tracking-wider border-b border-[#1E1D1B]">
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
                      <tr key={txn.id} className="border-b border-[#1E1D1B]/50 last:border-0 hover:bg-[#1A1918] transition-colors">
                        <td className="py-3 px-4 text-[#C5C0B8] whitespace-nowrap">
                          {new Date(txn.occurred_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4 text-[#F0EDE8] max-w-[200px] truncate">{txn.property_address || '—'}</td>
                        <td className="py-3 px-4 text-[#C5C0B8] max-w-[200px] truncate">{txn.description || '—'}</td>
                        <td className="py-3 px-4">
                          <span className={cn('text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border', catColor)}>
                            {txn.category || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-[#8A8580]">{typeLabel}</td>
                        <td className={cn('py-3 px-4 text-right tabular-nums font-medium', isPositive ? 'text-[#4ADE80]' : 'text-[#F87171]')}>
                          {isPositive ? '+' : ''}${Math.abs(amt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDelete(txn.id)}
                            className="p-1 rounded text-[#8A8580] hover:text-[#F87171] hover:bg-[#F87171]/10 transition-colors cursor-pointer"
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
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#1E1D1B]">
                <span className="text-xs text-[#8A8580]">{txnData.total} transactions</span>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(txnData.pages, 5) }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        'w-8 h-8 text-xs rounded transition-colors cursor-pointer',
                        p === page ? 'bg-[#8B7AFF]/15 text-[#8B7AFF]' : 'text-[#8A8580] hover:text-[#C5C0B8]'
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
      </div>

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
    <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-wider text-[#8A8580] mb-1">{label}</p>
      <p className={cn('text-xl font-medium tabular-nums', color)}>
        ${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  )
}
