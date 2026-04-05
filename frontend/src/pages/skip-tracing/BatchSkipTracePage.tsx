/** Batch Skip Trace page — CSV upload for bulk owner lookups. */

import { Link } from 'react-router-dom'
import { ArrowLeft, Upload } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'

export default function BatchSkipTracePage() {
  return (
    <AppShell title="Batch Skip Trace">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            to="/skip-tracing"
            className="inline-flex items-center gap-1.5 text-xs text-[#8A8580] hover:text-[#C5C0B8] transition-colors"
          >
            <ArrowLeft size={13} />
            Skip Tracing
          </Link>
        </div>

        <h1
          className="text-2xl text-[#F0EDE8]"
          style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
        >
          Batch Upload
        </h1>

        {/* Upload area */}
        <div className="bg-[#141311] border border-dashed border-[#1E1D1B] rounded-xl p-12 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#8B7AFF]/10 flex items-center justify-center">
            <Upload size={20} className="text-[#8B7AFF]/60" />
          </div>
          <div>
            <p
              className="text-base text-[#F0EDE8] mb-1"
              style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
            >
              Upload a CSV file
            </p>
            <p className="text-xs text-[#8A8580]">
              Columns: address, city, state, zip_code
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] transition-colors"
            onClick={() => {}}
          >
            <Upload size={14} />
            Choose File
          </button>
        </div>

        <p className="text-xs text-[#8A8580]">
          Batch tracing processes addresses in the background. Results will appear in the history table on the Skip Tracing page.
        </p>
      </div>
    </AppShell>
  )
}
