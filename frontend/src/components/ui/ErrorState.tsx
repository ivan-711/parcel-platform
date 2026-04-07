import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({ message = 'Something went wrong', onRetry, className }: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className ?? ''}`}>
      <div className="w-12 h-12 rounded-full bg-[#D4766A]/10 flex items-center justify-center mb-4">
        <AlertCircle size={20} className="text-[#D4766A]" />
      </div>
      <p className="text-sm text-text-primary mb-1">Unable to load data</p>
      <p className="text-xs text-text-secondary mb-4 max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 text-xs text-[#8B7AFF] hover:text-[#A89FFF] transition-colors cursor-pointer"
        >
          <RefreshCw size={12} />
          Try again
        </button>
      )}
    </div>
  )
}
