/** PipelineEmpty — empty state shown when the pipeline has no deals. */

import { Link } from 'react-router-dom'
import { Plus, GitBranch } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageContent } from '@/components/layout/PageContent'

export function PipelineEmpty() {
  return (
    <AppShell>
      <PageHeader title="Pipeline" />
      <PageContent>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4 max-w-md text-center">
            <div className="w-12 h-12 rounded-xl bg-[#0F0F1A] border border-[#1A1A2E] flex items-center justify-center">
              <GitBranch size={24} className="text-[#94A3B8]" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-[#F1F5F9]">Your pipeline is empty</p>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Start by analyzing a deal and adding it to your pipeline to track its progress.
              </p>
            </div>
            <Link
              to="/analyze"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[13px] font-medium transition-colors"
            >
              <Plus size={14} />
              Analyze a Deal
            </Link>
          </div>
        </div>
      </PageContent>
    </AppShell>
  )
}
