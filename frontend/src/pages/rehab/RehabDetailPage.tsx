import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ChevronDown,
  Plus,
  Trash2,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import {
  useRehabProject,
  useRehabSummary,
  useCreateRehabItem,
  useDeleteRehabItem,
  useUpdateRehabProject,
} from '@/hooks/useRehab'
import type { RehabItem, RehabCategorySummary, CreateRehabItemRequest } from '@/types'

/* ─── Constants ─── */

const CATEGORY_COLORS: Record<string, string> = {
  kitchen: 'bg-[#FBBF24]/15 text-[#FBBF24] border-[#FBBF24]/30',
  bathroom: 'bg-[#60A5FA]/15 text-[#60A5FA] border-[#60A5FA]/30',
  flooring: 'bg-[#8B7AFF]/15 text-[#A89FFF] border-[#8B7AFF]/30',
  roof: 'bg-[#F87171]/15 text-[#F87171] border-[#F87171]/30',
  hvac: 'bg-[#2DD4BF]/15 text-[#2DD4BF] border-[#2DD4BF]/30',
  plumbing: 'bg-[#60A5FA]/15 text-[#93C5FD] border-[#60A5FA]/30',
  electrical: 'bg-[#FBBF24]/15 text-[#FCD34D] border-[#FBBF24]/30',
  exterior: 'bg-[#34D399]/15 text-[#34D399] border-[#34D399]/30',
  foundation: 'bg-[#F87171]/15 text-[#FCA5A5] border-[#F87171]/30',
  windows_doors: 'bg-[#C084FC]/15 text-[#C084FC] border-[#C084FC]/30',
  painting: 'bg-[#FB923C]/15 text-[#FB923C] border-[#FB923C]/30',
  landscaping: 'bg-[#4ADE80]/15 text-[#4ADE80] border-[#4ADE80]/30',
  general: 'bg-[#8A8580]/15 text-[#C5C0B8] border-[#8A8580]/30',
  permits: 'bg-[#8A8580]/15 text-[#C5C0B8] border-[#8A8580]/30',
  other: 'bg-[#8A8580]/15 text-[#C5C0B8] border-[#8A8580]/30',
}

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-[#8A8580]/15 text-[#C5C0B8] border-[#8A8580]/30',
  in_progress: 'bg-[#60A5FA]/15 text-[#60A5FA] border-[#60A5FA]/30',
  completed: 'bg-[#4ADE80]/15 text-[#4ADE80] border-[#4ADE80]/30',
  skipped: 'bg-[#FBBF24]/15 text-[#FBBF24] border-[#FBBF24]/30',
}

const PROJECT_STATUSES = [
  { value: 'planning', label: 'Planning' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
]

const ITEM_STATUSES = ['planned', 'in_progress', 'completed', 'skipped']

const CATEGORIES = [
  'kitchen',
  'bathroom',
  'flooring',
  'roof',
  'hvac',
  'plumbing',
  'electrical',
  'exterior',
  'foundation',
  'windows_doors',
  'painting',
  'landscaping',
  'general',
  'permits',
  'other',
]

/* ─── Helpers ─── */

function formatCurrency(n: number | null | undefined): string {
  if (n == null) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function formatCategory(cat: string): string {
  return cat
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatStatus(s: string): string {
  return s
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/* ─── Main Component ─── */

export default function RehabDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: project, isLoading } = useRehabProject(projectId)
  const { data: summary } = useRehabSummary(projectId)
  const updateProject = useUpdateRehabProject()
  const createItem = useCreateRehabItem(projectId ?? '')
  const deleteItem = useDeleteRehabItem(projectId ?? '')

  const [showAddForm, setShowAddForm] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)

  // Check if project has AI-imported items
  const hasAiImports = useMemo(
    () => project?.items?.some((i: RehabItem) => i.notes === 'Imported from AI estimate') ?? false,
    [project],
  )

  if (isLoading) {
    return (
      <AppShell title="Rehab Project">
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#8B7AFF] border-t-transparent" />
        </div>
      </AppShell>
    )
  }

  if (!project) {
    return (
      <AppShell title="Rehab Project">
        <div className="py-20 text-center text-[#8A8580]">
          Project not found.{' '}
          <Link to="/rehabs" className="text-[#8B7AFF] hover:underline">
            Back to projects
          </Link>
        </div>
      </AppShell>
    )
  }

  const items: RehabItem[] = project.items ?? []
  const totalEstimated = project.total_estimated ?? 0
  const totalActual = project.total_actual ?? 0
  const variance = totalActual - totalEstimated

  function handleStatusChange(newStatus: string) {
    if (!projectId) return
    updateProject.mutate({ id: projectId, data: { status: newStatus } })
    setStatusOpen(false)
  }

  return (
    <AppShell title={project.name}>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* ── Header ── */}
        <div className="space-y-4">
          {/* Breadcrumb */}
          <Link
            to="/rehabs"
            className="inline-flex items-center gap-1.5 text-sm text-[#8A8580] transition-colors hover:text-[#F0EDE8]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Rehab Projects
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-light tracking-tight text-[#F0EDE8]">
                {project.name}
              </h1>

              {hasAiImports && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#8B7AFF]/30 bg-[#8B7AFF]/10 px-2 py-0.5 text-xs text-[#A89FFF]">
                  <Sparkles className="h-3 w-3" />
                  AI Estimated
                </span>
              )}

              {/* Status Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setStatusOpen(!statusOpen)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#1E1D1B] bg-[#141311] px-3 py-1.5 text-sm text-[#C5C0B8] transition-colors hover:border-[#2a2826]"
                >
                  {formatStatus(project.status)}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <AnimatePresence>
                  {statusOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 top-full z-20 mt-1 w-40 rounded-lg border border-[#1E1D1B] bg-[#141311] py-1 shadow-xl"
                    >
                      {PROJECT_STATUSES.map((s) => (
                        <button
                          key={s.value}
                          onClick={() => handleStatusChange(s.value)}
                          className={`w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-[#1E1D1B] ${
                            project.status === s.value
                              ? 'text-[#8B7AFF]'
                              : 'text-[#C5C0B8]'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Budget KPIs */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-[#1E1D1B] bg-[#141311] px-4 py-3">
              <p className="text-xs text-[#8A8580]">Estimated</p>
              <p className="text-lg font-light text-[#F0EDE8]">
                {formatCurrency(totalEstimated)}
              </p>
            </div>
            <div className="rounded-xl border border-[#1E1D1B] bg-[#141311] px-4 py-3">
              <p className="text-xs text-[#8A8580]">Actual</p>
              <p className="text-lg font-light text-[#F0EDE8]">
                {formatCurrency(totalActual)}
              </p>
            </div>
            <div className="rounded-xl border border-[#1E1D1B] bg-[#141311] px-4 py-3">
              <p className="text-xs text-[#8A8580]">Variance</p>
              <p
                className={`inline-flex items-center gap-1 text-lg font-light ${
                  variance <= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'
                }`}
              >
                {variance <= 0 ? (
                  <TrendingDown className="h-4 w-4" />
                ) : (
                  <TrendingUp className="h-4 w-4" />
                )}
                {formatCurrency(variance)}
              </p>
            </div>
          </div>
        </div>

        {/* ── Items Table ── */}
        <div className="rounded-xl border border-[#1E1D1B] bg-[#141311]">
          <div className="flex items-center justify-between border-b border-[#1E1D1B] px-4 py-3">
            <h2 className="text-sm font-medium text-[#F0EDE8]">Line Items</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#8B7AFF] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#7B6AEF]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </button>
            </div>
          </div>

          {/* Add Item Form */}
          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <AddItemForm
                  onAdd={(data) => {
                    createItem.mutate(data, { onSuccess: () => setShowAddForm(false) })
                  }}
                  isSubmitting={createItem.isPending}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1D1B] text-left text-xs text-[#8A8580]">
                  <th className="px-4 py-2.5 font-medium">Category</th>
                  <th className="px-4 py-2.5 font-medium">Description</th>
                  <th className="px-4 py-2.5 font-medium text-right">Estimated</th>
                  <th className="px-4 py-2.5 font-medium text-right">Actual</th>
                  <th className="px-4 py-2.5 font-medium">Contractor</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-[#8A8580]"
                    >
                      No items yet. Click "Add Item" to get started.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onDelete={() => deleteItem.mutate(item.id)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Category Summary Cards ── */}
        {summary && summary.by_category.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-medium text-[#F0EDE8]">
              Category Breakdown
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {summary.by_category.map((cat: RehabCategorySummary) => (
                <CategoryCard key={cat.category} data={cat} />
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

/* ─── Item Row ─── */

function ItemRow({
  item,
  onDelete,
}: {
  item: RehabItem
  onDelete: () => void
}) {
  const catColor =
    CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.other
  const statusColor =
    STATUS_COLORS[item.status] ?? STATUS_COLORS.planned

  return (
    <tr className="border-b border-[#1E1D1B]/60 transition-colors hover:bg-[#1E1D1B]/30">
      <td className="px-4 py-2.5">
        <span
          className={`inline-block rounded-full border px-2 py-0.5 text-xs ${catColor}`}
        >
          {formatCategory(item.category)}
        </span>
      </td>
      <td className="px-4 py-2.5 text-[#C5C0B8]">{item.description}</td>
      <td className="px-4 py-2.5 text-right tabular-nums text-[#C5C0B8]">
        {formatCurrency(item.estimated_cost)}
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums text-[#C5C0B8]">
        {item.actual_cost != null ? formatCurrency(item.actual_cost) : '—'}
      </td>
      <td className="px-4 py-2.5 text-[#8A8580]">
        {item.contractor_name || '—'}
      </td>
      <td className="px-4 py-2.5">
        <span
          className={`inline-block rounded-full border px-2 py-0.5 text-xs ${statusColor}`}
        >
          {formatStatus(item.status)}
        </span>
      </td>
      <td className="px-4 py-2.5">
        <button
          onClick={onDelete}
          className="rounded-md p-1 text-[#8A8580] transition-colors hover:bg-[#F87171]/10 hover:text-[#F87171]"
          title="Delete item"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  )
}

/* ─── Add Item Form ─── */

function AddItemForm({
  onAdd,
  isSubmitting,
}: {
  onAdd: (data: CreateRehabItemRequest) => void
  isSubmitting: boolean
}) {
  const [category, setCategory] = useState('general')
  const [description, setDescription] = useState('')
  const [estimatedCost, setEstimatedCost] = useState('')
  const [contractorName, setContractorName] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) return
    onAdd({
      category,
      description: description.trim(),
      estimated_cost: estimatedCost ? Number(estimatedCost) : undefined,
      contractor_name: contractorName.trim() || undefined,
      status: 'planned',
    })
  }

  const inputCls =
    'w-full rounded-lg border border-[#1E1D1B] bg-[#0C0B0A] px-3 py-2 text-sm text-[#F0EDE8] placeholder:text-[#8A8580]/60 focus:border-[#8B7AFF]/50 focus:outline-none focus:ring-1 focus:ring-[#8B7AFF]/30'

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-2 gap-3 border-b border-[#1E1D1B] bg-[#0C0B0A]/40 px-4 py-3 md:grid-cols-5"
    >
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className={inputCls}
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {formatCategory(c)}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className={inputCls}
        required
      />
      <input
        type="number"
        placeholder="Estimated cost"
        value={estimatedCost}
        onChange={(e) => setEstimatedCost(e.target.value)}
        className={inputCls}
        min={0}
        step={1}
      />
      <input
        type="text"
        placeholder="Contractor"
        value={contractorName}
        onChange={(e) => setContractorName(e.target.value)}
        className={inputCls}
      />
      <button
        type="submit"
        disabled={isSubmitting || !description.trim()}
        className="rounded-lg bg-[#8B7AFF] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#7B6AEF] disabled:opacity-40"
      >
        {isSubmitting ? 'Adding...' : 'Add'}
      </button>
    </form>
  )
}

/* ─── Category Summary Card ─── */

function CategoryCard({ data }: { data: RehabCategorySummary }) {
  const catColor =
    CATEGORY_COLORS[data.category] ?? CATEGORY_COLORS.other
  const pct =
    data.estimated > 0
      ? Math.min(100, Math.round((data.actual / data.estimated) * 100))
      : 0
  const barColor =
    data.actual <= data.estimated ? 'bg-[#4ADE80]' : 'bg-[#F87171]'

  return (
    <div className="rounded-xl border border-[#1E1D1B] bg-[#141311] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span
          className={`inline-block rounded-full border px-2 py-0.5 text-xs ${catColor}`}
        >
          {formatCategory(data.category)}
        </span>
        <span className="text-xs text-[#8A8580]">
          {data.completed_count} of {data.item_count} complete
        </span>
      </div>

      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className="text-[#8A8580]">
          {formatCurrency(data.actual)}{' '}
          <span className="text-[#8A8580]/60">/ {formatCurrency(data.estimated)}</span>
        </span>
        <span
          className={`text-xs ${
            data.variance <= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'
          }`}
        >
          {data.variance <= 0 ? '' : '+'}
          {formatCurrency(data.variance)}
        </span>
      </div>

      {/* Mini bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1E1D1B]">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
