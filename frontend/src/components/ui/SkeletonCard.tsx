import { cn } from '@/lib/utils'

interface SkeletonCardProps {
  className?: string
  lines?: number
}

/** Skeleton loading placeholder — replaces spinners for all loading states. */
export function SkeletonCard({ className, lines = 3 }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-5 space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
        className
      )}
    >
      <div className="h-4 w-2/5 rounded-md bg-gray-100 animate-pulse" />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-3 rounded-md bg-gray-100 animate-pulse',
            i === lines - 1 ? 'w-3/4' : 'w-full'
          )}
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  )
}
