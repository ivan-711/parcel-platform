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
        'bg-app-surface border border-border-subtle rounded-xl shadow-xs p-5 space-y-3',
        className
      )}
    >
      <div className="h-4 w-2/5 rounded-md bg-gradient-to-r from-white/[0.03] via-white/[0.06] to-white/[0.03] bg-[length:200%_100%] animate-shimmer" />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-3 rounded-md bg-gradient-to-r from-white/[0.03] via-white/[0.06] to-white/[0.03] bg-[length:200%_100%] animate-shimmer',
            i === lines - 1 ? 'w-3/4' : 'w-full'
          )}
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  )
}
