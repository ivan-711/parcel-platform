import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

/** 404 page shown for invalid routes. */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <p className="text-7xl font-bold font-mono text-accent-primary/20">404</p>
        <h1 className="mt-4 text-xl font-semibold text-text-primary">Page not found</h1>
        <p className="mt-2 text-sm text-text-secondary leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-primary text-white text-sm font-medium hover:bg-accent-primary/90 transition-colors"
          >
            <Home size={16} />
            Go Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border-subtle text-text-secondary text-sm font-medium hover:text-text-primary hover:border-border-default transition-colors"
          >
            <ArrowLeft size={16} />
            Go back
          </button>
        </div>
      </div>
    </div>
  )
}
