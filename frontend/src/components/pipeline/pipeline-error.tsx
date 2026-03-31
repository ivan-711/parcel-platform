/** PipelineError — error state shown when pipeline data fails to load (light theme). */

import { AlertTriangle } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageContent } from '@/components/layout/PageContent'

interface PipelineErrorProps {
  error: Error | null
  onRetry: () => void
}

export function PipelineError({ error, onRetry }: PipelineErrorProps) {
  return (
    <AppShell>
      <PageHeader title="Pipeline" />
      <PageContent>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4 max-w-md text-center">
            <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-900">Failed to load pipeline</p>
              <p className="text-[13px] text-gray-500">
                {error ? error.message : 'Something went wrong. Please try again.'}
              </p>
            </div>
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-medium transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </PageContent>
    </AppShell>
  )
}
