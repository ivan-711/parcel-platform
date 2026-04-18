/**
 * CreateReportModal — dialog for creating a new branded report.
 * Can be opened from reports list or analysis results (with pre-filled context).
 */

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

function trackEvent(event: string, props?: Record<string, unknown>) {
  try { (window as any).posthog?.capture?.(event, props) } catch { /* ignore */ }
}

interface CreateReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyId?: string
  scenarioId?: string
  defaultTitle?: string
}

export function CreateReportModal({
  open,
  onOpenChange,
  propertyId,
  scenarioId,
  defaultTitle,
}: CreateReportModalProps) {
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)

  const [title, setTitle] = useState(defaultTitle || 'Analysis Report')
  const [reportType] = useState('analysis')
  const [audience, setAudience] = useState('client')

  // Reset title when modal opens with new context
  const handleOpenChange = (o: boolean) => {
    if (o && defaultTitle) setTitle(defaultTitle)
    onOpenChange(o)
  }

  const createMutation = useMutation({
    mutationFn: () =>
      api.reports.create({
        title,
        report_type: reportType,
        property_id: propertyId || '',
        scenario_id: scenarioId || '',
        audience,
      }),
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'reports'] })
      onOpenChange(false)

      // Copy share link
      if (report.share_url) {
        void navigator.clipboard.writeText(report.share_url)
        toast.success('Report created — share link copied!', {
          description: report.share_url,
        })
      } else {
        toast.success('Report created')
      }

      trackEvent('report_created', {
        report_type: reportType,
        audience,
        property_id: propertyId,
      })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create report')
    },
  })

  const canSubmit = propertyId && scenarioId && title.trim()

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px] bg-app-elevated border-border-default" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-text-primary">
            <FileText size={16} className="text-violet-400" />
            Generate Report
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1.5">
              Report Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-app-recessed px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-violet-400/20 focus:border-violet-400/40"
              placeholder="Analysis Report — 613 N 14th St"
            />
          </div>

          {/* Audience */}
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1.5">
              Audience
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['client', 'lender', 'partner', 'internal'] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAudience(a)}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium capitalize transition-colors cursor-pointer ${
                    audience === a
                      ? 'border-violet-400 bg-violet-400/10 text-violet-400'
                      : 'border-border-default bg-transparent text-text-secondary hover:bg-layer-2'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Missing context warning */}
          {(!propertyId || !scenarioId) && (
            <div className="rounded-lg bg-warning-bg border border-warning/20 p-3">
              <p className="text-xs text-warning">
                Open this modal from a property analysis to pre-fill the property and scenario data.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="border-border-default bg-transparent text-text-secondary hover:bg-layer-2"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!canSubmit || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="bg-violet-400 hover:bg-violet-600 text-white gap-1.5"
            >
              <Link2 size={12} />
              {createMutation.isPending ? 'Creating...' : 'Create & Copy Link'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
