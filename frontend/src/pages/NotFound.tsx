import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

/** 404 page shown for invalid routes. */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0C0B0A] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <p className="text-kpi-display text-[64px] text-[#F0EDE8]/10 leading-none">404</p>
        <h1 className="mt-4 text-xl font-semibold text-[#F0EDE8]">Page not found</h1>
        <p className="mt-2 text-sm text-[#A09D98] leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7] text-[#0C0B0A] text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Home size={16} />
            Back to Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/[0.06] text-[#A09D98] text-sm font-medium hover:text-[#F0EDE8] hover:border-white/[0.08] transition-colors"
          >
            <ArrowLeft size={16} />
            Go back
          </button>
        </div>
      </div>
    </div>
  )
}
