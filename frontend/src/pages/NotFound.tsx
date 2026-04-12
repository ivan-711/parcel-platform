import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** 404 page shown for invalid routes. */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <p className="text-kpi-display text-[64px] text-text-primary/10 leading-none">404</p>
        <h1 className="mt-4 text-xl font-semibold text-text-primary">Page not found</h1>
        <p className="mt-2 text-sm text-text-secondary leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/">
            <Button variant="outline" className="inline-flex items-center gap-2 border-border-default text-text-secondary hover:text-text-primary hover:border-border-strong text-sm font-medium">
              <Home size={16} />
              Back to Dashboard
            </Button>
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border-default text-text-secondary text-sm font-medium hover:text-text-primary hover:border-border-strong transition-colors"
          >
            <ArrowLeft size={16} />
            Go back
          </button>
        </div>
      </div>
    </div>
  )
}
