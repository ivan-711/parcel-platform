import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Hammer, Calendar } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/EmptyState'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useRehabProjects, useCreateRehabProject } from '@/hooks/useRehab'
import { useProperties } from '@/hooks/useProperties'
import type { RehabProject, CreateRehabProjectRequest } from '@/types'

/* ─── Status badge config ─── */

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  planning: { label: 'Planning', cls: 'bg-text-muted/15 text-text-secondary' },
  in_progress: { label: 'In Progress', cls: 'bg-info-bg text-info' },
  completed: { label: 'Completed', cls: 'bg-profit/15 text-profit' },
  on_hold: { label: 'On Hold', cls: 'bg-warning-bg text-warning' },
}

/* ─── Helpers ─── */

function formatBudget(value: number): string {
  if (value >= 1000) return `$${Math.round(value / 1000)}K`
  return `$${Math.round(value)}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

/* ─── Page ─── */

export default function RehabsPage() {
  const [showCreate, setShowCreate] = useState(false)
  const { data, isLoading } = useRehabProjects()
  const { data: propData } = useProperties({})

  const projects: RehabProject[] = Array.isArray(data) ? data : (data as any)?.items ?? []

  // Build a property address lookup for cards that don't have property_address joined
  const propertyMap = useMemo(() => {
    const map = new Map<string, string>()
    const props = propData?.properties ?? []
    for (const p of props) {
      const pAny = p as unknown as Record<string, unknown>
      const addr = (pAny.address_line1 ?? pAny.address ?? '') as string
      const parts = [addr, pAny.city, pAny.state].filter(Boolean)
      if (pAny.id && parts.length) map.set(pAny.id as string, parts.join(', '))
    }
    return map
  }, [propData])

  // PostHog
  useEffect(() => {
    try {
      ;(window as any).posthog?.capture?.('rehab_projects_page_viewed', {
        project_count: projects.length,
      })
    } catch {
      /* ignore */
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <AppShell title="Rehab Projects">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 bg-app-recessed rounded-xl animate-pulse" />
          ))}
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Rehab Projects">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1
            className="text-xl sm:text-2xl text-text-primary font-brand font-light"
          >
            Rehab Projects
          </h1>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-violet-400 text-white font-medium hover:bg-violet-500 transition-colors cursor-pointer"
          >
            <Plus size={16} />
            New Project
          </button>
        </div>

        {/* Empty state */}
        {projects.length === 0 && (
          <EmptyState
            icon={Hammer}
            heading="No rehab projects yet"
            description="Start tracking renovation costs on your properties."
          />
        )}

        {/* Project cards grid */}
        {projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project, i) => (
              <ProjectCard key={project.id} project={project} index={i} propertyMap={propertyMap} />
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      <CreateProjectModal open={showCreate} onOpenChange={setShowCreate} />
    </AppShell>
  )
}

/* ─── Project Card ─── */

function ProjectCard({ project, index, propertyMap }: { project: RehabProject; index: number; propertyMap: Map<string, string> }) {
  const status = STATUS_STYLES[project.status] ?? STATUS_STYLES.planning
  const estimated = project.total_estimated || project.estimated_budget || 0
  const actual = project.total_actual || project.actual_spent || 0
  const overBudget = estimated > 0 && actual > estimated
  const budgetPct = estimated > 0 ? Math.min((actual / estimated) * 100, 100) : 0
  const completedCount = Math.round((project.completion_pct ?? 0) / 100 * (project.item_count ?? 0))
  // Resolve property address: prefer backend-joined field, fall back to local lookup
  const propertyAddress = (project as unknown as Record<string, unknown>).property_address as string
    || propertyMap.get(project.property_id)
    || null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
    >
      <Link
        to={`/rehabs/${project.id}`}
        className="block bg-app-recessed border border-border-default rounded-xl p-4 hover:border-border-strong transition-colors group"
      >
        {/* Top row: address + status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-sm text-text-primary font-medium truncate">
              {propertyAddress || project.name}
            </p>
            <p className="text-xs text-text-muted mt-0.5 truncate">{project.name}</p>
          </div>
          <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${status.cls}`}>
            {status.label}
          </span>
        </div>

        {/* Budget progress bar */}
        <div className="mb-2">
          <div className="h-1.5 bg-border-default rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${overBudget ? 'bg-loss' : 'bg-profit'}`}
              style={{ width: `${estimated > 0 ? Math.min((actual / estimated) * 100, 100) : 0}%` }}
            />
          </div>
        </div>

        {/* Budget label */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-text-muted">
            {estimated > 0 ? (
              <>
                {formatBudget(actual)} of {formatBudget(estimated)}
                {overBudget && (
                  <span className="text-loss ml-1">(over budget)</span>
                )}
              </>
            ) : (
              'No budget set'
            )}
          </span>
          {budgetPct > 0 && (
            <span className={`text-xs tabular-nums ${overBudget ? 'text-loss' : 'text-text-muted'}`}>
              {Math.round(actual / estimated * 100)}%
            </span>
          )}
        </div>

        {/* Completion */}
        {project.item_count > 0 && (
          <p className="text-xs text-text-muted">
            {completedCount} of {project.item_count} items ({Math.round(project.completion_pct ?? 0)}%)
          </p>
        )}

        {/* Date range */}
        {(project.start_date || project.target_completion) && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-text-muted">
            <Calendar size={12} className="shrink-0" />
            <span>
              {project.start_date ? formatDate(project.start_date) : '?'}
              {' — '}
              {project.target_completion ? formatDate(project.target_completion) : '?'}
            </span>
          </div>
        )}
      </Link>
    </motion.div>
  )
}

/* ─── Create Project Modal ─── */

function CreateProjectModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [name, setName] = useState('')
  const [propertyId, setPropertyId] = useState('')
  const [importBricked, setImportBricked] = useState(false)

  const { data: propData } = useProperties({})
  const properties = propData?.properties ?? []

  const createMutation = useCreateRehabProject()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !propertyId) return

    const payload: CreateRehabProjectRequest = {
      property_id: propertyId,
      name: name.trim(),
      import_bricked: importBricked,
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        setName('')
        setPropertyId('')
        setImportBricked(false)
        onOpenChange(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle
            className="text-lg text-text-primary font-brand font-light"
          >
            New Rehab Project
          </DialogTitle>
          <DialogDescription className="text-sm text-text-muted">
            Track renovation costs for a property.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Name */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-muted mb-1 block">
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kitchen & Bath Reno"
              className="w-full px-3 py-2 bg-app-bg border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-muted/50 focus:border-violet-400 outline-none transition-colors"
              required
            />
          </div>

          {/* Property selector */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-muted mb-1 block">
              Property
            </label>
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full px-3 py-2 bg-app-bg border border-border-default rounded-lg text-sm text-text-primary focus:border-violet-400 outline-none transition-colors"
              required
            >
              <option value="" disabled>
                Select a property
              </option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.address_line1}, {p.city}, {p.state}
                </option>
              ))}
            </select>
          </div>

          {/* Import bricked toggle */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={importBricked}
                onChange={(e) => setImportBricked(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-border-default rounded-full peer-checked:bg-violet-400 transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-text-secondary rounded-full transition-transform peer-checked:translate-x-4 peer-checked:bg-white" />
            </div>
            <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
              Import AI repair estimates
            </span>
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={createMutation.isPending || !name.trim() || !propertyId}
            className="w-full px-4 py-2.5 text-sm rounded-lg bg-violet-400 text-white font-medium hover:bg-violet-500 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
