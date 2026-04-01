/** App-wide error boundary -- catches render errors and shows a branded fallback UI. */
import { Component } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: React.ReactNode
  /** Optional fallback component to render instead of the default error UI. */
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-[#0C0B0A] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#1A1916] border border-white/[0.04] rounded-xl p-8 text-center space-y-6">
            <div className="mx-auto w-14 h-14 rounded-full bg-[#D4766A]/10 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-[#D4766A]" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-[#F0EDE8]">Something went wrong</h1>
              <p className="text-sm text-[#A09D98]">
                An unexpected error occurred. Try refreshing, or go back to the dashboard.
              </p>
            </div>

            {this.state.error && import.meta.env.DEV && (
              <pre className="text-left text-xs text-[#D4766A] bg-[#0C0B0A] border border-white/[0.04] rounded-lg p-3 overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}

            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={this.handleGoHome}
                className="gap-2 border-white/[0.06] text-[#A09D98] hover:text-[#F0EDE8] hover:bg-white/[0.04]"
              >
                <Home size={14} />
                Dashboard
              </Button>
              <Button
                onClick={this.handleReset}
                className="gap-2 bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7] text-[#0C0B0A] hover:opacity-90"
              >
                <RefreshCw size={14} />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/** Lightweight page-level error boundary with simpler fallback. */
export class PageErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#D4766A]/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-[#D4766A]" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-medium text-[#F0EDE8]">This section encountered an error</p>
            <p className="text-sm text-[#A09D98]">
              The rest of the app is still working.
            </p>
          </div>
          <Button variant="outline" onClick={this.handleRetry} className="gap-2 border-white/[0.06] text-[#A09D98] hover:text-[#F0EDE8] hover:bg-white/[0.04]">
            <RefreshCw size={14} />
            Retry
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
