/**
 * ReportsListPage — lists generated reports with engagement data and actions.
 * Reference: reports_list.png, reports_empty_state.png
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ErrorState } from '@/components/ui/ErrorState'
import { motion } from 'framer-motion'
import {
  FileText,
  Link2,
  Download,
  Trash2,
  Plus,
  Eye,
  Loader2,
  Lock,
} from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { hasAccess } from '@/types'
import type { ReportResponse } from '@/types'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

function trackEvent(event: string, props?: Record<string, unknown>) {
  try { (window as any).posthog?.capture?.(event, props) } catch { /* ignore */ }
}

const TYPE_COLORS: Record<string, string> = {
  analysis: 'bg-violet-400/10 text-violet-400 border-violet-400/20',
  portfolio_snapshot: 'bg-success-bg text-success border-success/20',
  buyer_packet: 'bg-warning-bg text-warning border-warning/20',
}

const AUDIENCE_COLORS: Record<string, string> = {
  client: 'bg-violet-400/10 text-violet-400 border-violet-400/20',
  lender: 'bg-success-bg text-success border-success/20',
  internal: 'bg-layer-2 text-text-secondary border-border-default',
  partner: 'bg-warning-bg text-warning border-warning/20',
}

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ReportActions({
  report,
  onDelete,
}: {
  report: ReportResponse
  onDelete: (id: string) => void
}) {
  const [pdfLoading, setPdfLoading] = useState(false)
  const user = useAuthStore((s) => s.user)
  const effectiveTier = user?.trial_active && user.plan_tier === 'free' ? 'pro' : (user?.plan_tier ?? 'free')
  const canExportPdf = user?.email === 'demo@parcel.app' || hasAccess(effectiveTier, 'pro')

  const handleCopyLink = () => {
    if (report.share_url) {
      void navigator.clipboard.writeText(report.share_url)
      toast.success('Link copied')
      trackEvent('report_link_copied', { report_id: report.id })
    }
  }

  const handleDownloadPdf = async () => {
    setPdfLoading(true)
    try {
      const initial = await api.reports.triggerPdf(report.id)
      if (initial.status === 'ready' && initial.download_url) {
        window.open(initial.download_url, '_blank')
        trackEvent('report_pdf_downloaded', { report_id: report.id })
        return
      }
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000))
        const status = await api.reports.pdfStatus(report.id)
        if (status.status === 'ready' && status.download_url) {
          window.open(status.download_url, '_blank')
          trackEvent('report_pdf_downloaded', { report_id: report.id })
          return
        }
      }
      toast.error('PDF generation timed out')
    } catch {
      toast.error('Failed to generate PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button onClick={handleCopyLink} className="p-1.5 rounded-md hover:bg-layer-2 text-text-secondary hover:text-text-primary transition-colors" title="Copy share link" aria-label="Copy share link">
        <Link2 size={14} />
      </button>
      {canExportPdf ? (
        <button onClick={() => void handleDownloadPdf()} disabled={pdfLoading} className="p-1.5 rounded-md hover:bg-layer-2 text-text-secondary hover:text-text-primary transition-colors disabled:opacity-40" title="Download PDF" aria-label="Download PDF">
          {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        </button>
      ) : (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-1.5 rounded-md text-text-disabled cursor-not-allowed" aria-label="PDF Export (upgrade required)">
                <Lock size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-app-overlay border border-border-strong rounded-lg px-3 py-2 shadow-lg">
              <p className="text-xs text-text-secondary">Upgrade to Carbon for PDF export</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <button onClick={() => onDelete(report.id)} className="p-1.5 rounded-md hover:bg-error-bg text-text-secondary hover:text-error transition-colors" title="Delete" aria-label="Delete report">
        <Trash2 size={14} />
      </button>
    </div>
  )
}

export default function ReportsListPage() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['reports'],
    queryFn: () => api.reports.list(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.reports.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'reports'] })
      toast.success('Report deleted')
      trackEvent('report_deleted')
    },
    onError: () => toast.error('Failed to delete report'),
  })

  const reports = data?.reports ?? []
  const total = data?.total ?? 0
  const totalViews = reports.reduce((sum, r) => sum + r.view_count, 0)
  const viewedCount = reports.filter((r) => r.view_count > 0).length
  const engagementRate = total > 0 ? Math.round((viewedCount / total) * 100) : 0

  const isEmpty = !isLoading && reports.length === 0

  return (
    <AppShell title="Reports">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Reports</h1>
            <p className="text-xs text-text-secondary mt-0.5">
              {total > 0 ? `${total} report${total !== 1 ? 's' : ''} generated` : 'Generate reports to share with clients'}
            </p>
          </div>
          {!isEmpty && (
            <Button
              className="bg-violet-400 hover:bg-violet-600 text-white text-xs gap-1.5"
              size="sm"
              onClick={() => toast('Create report from an analysis result', { description: 'Go to a property analysis and click "Generate Report"' })}
            >
              <Plus size={14} />
              Create Report
            </Button>
          )}
        </div>

        {/* Stats bar */}
        {!isEmpty && (
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-border-default bg-app-surface p-4">
              <p className="text-[10px] uppercase tracking-[0.08em] text-text-secondary">Total Reports</p>
              <p className="text-xl font-semibold text-text-primary mt-1 tabular-nums">{total}</p>
            </div>
            <div className="rounded-lg border border-border-default bg-app-surface p-4">
              <p className="text-[10px] uppercase tracking-[0.08em] text-text-secondary">Total Views</p>
              <p className="text-xl font-semibold text-text-primary mt-1 tabular-nums">{totalViews}</p>
            </div>
            <div className="rounded-lg border border-border-default bg-app-surface p-4">
              <p className="text-[10px] uppercase tracking-[0.08em] text-text-secondary">Engagement</p>
              <p className="text-xl font-semibold text-text-primary mt-1 tabular-nums">{engagementRate}%</p>
            </div>
          </div>
        )}

        {/* Error state — check BEFORE empty */}
        {isError && (
          <ErrorState
            message={error instanceof Error ? error.message : 'Failed to load reports'}
            onRetry={() => queryClient.invalidateQueries({ queryKey: ['u', userId, 'reports'] })}
          />
        )}

        {/* Empty state */}
        {!isError && isEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-violet-400/10 border border-violet-400/15 flex items-center justify-center mb-4">
              <FileText size={28} className="text-violet-400" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              No reports yet
            </h2>
            <p className="text-sm text-text-secondary max-w-sm mb-6">
              Analyze a property, then export a report to share with partners or lenders.
            </p>
            <Button
              className="bg-violet-400 hover:bg-violet-600 text-white gap-1.5"
              onClick={() => toast('Create report from an analysis result', { description: 'Go to a property analysis and click "Generate Report"' })}
            >
              <Plus size={14} />
              Create First Report
            </Button>
          </motion.div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-layer-2 animate-pulse" />
            ))}
          </div>
        )}

        {/* Reports table */}
        {!isError && !isEmpty && !isLoading && (
          <div className="rounded-xl border border-border-default bg-app-surface overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-border-default bg-layer-1 text-[10px] uppercase tracking-[0.08em] text-text-secondary font-medium">
              <span>Title</span>
              <span>Property</span>
              <span>Type</span>
              <span>Audience</span>
              <span>Created</span>
              <span>Views</span>
              <span>Actions</span>
            </div>

            {reports.map((report) => (
              <div
                key={report.id}
                className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-border-subtle last:border-b-0 items-center hover:bg-layer-1 transition-colors"
              >
                <span className="text-sm text-text-primary font-medium truncate">{report.title}</span>
                <span className="text-xs text-text-secondary truncate">{report.property_address || '—'}</span>
                <Badge className={cn('text-[10px] capitalize', TYPE_COLORS[report.report_type] || TYPE_COLORS.analysis)}>
                  {report.report_type.replace('_', ' ')}
                </Badge>
                <Badge className={cn('text-[10px] capitalize', AUDIENCE_COLORS[report.audience || 'internal'])}>
                  {report.audience || 'internal'}
                </Badge>
                <span className="text-xs text-text-secondary tabular-nums whitespace-nowrap">{formatRelativeDate(report.created_at)}</span>
                <span className={cn('text-xs tabular-nums flex items-center gap-1', report.view_count > 0 ? 'text-success' : 'text-text-disabled')}>
                  <Eye size={12} />
                  {report.view_count}
                </span>
                <ReportActions report={report} onDelete={(id) => deleteMutation.mutate(id)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
