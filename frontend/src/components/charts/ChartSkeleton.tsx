/** Shimmer loading placeholder for charts. */

export function ChartSkeleton({ height = 250 }: { height?: number }) {
  return (
    <div className="rounded-xl border bg-[var(--chart-bg)] border-[var(--chart-border)] p-4">
      <div className="animate-pulse space-y-3">
        <div className="h-3 w-24 rounded bg-[var(--chart-grid)]" />
        <div className="h-6 w-32 rounded bg-[var(--chart-grid)]" />
        <div className="w-full rounded-lg overflow-hidden" style={{ height }}>
          <div className="h-full w-full animate-shimmer" style={{
            background: 'linear-gradient(90deg, var(--chart-grid) 25%, transparent 50%, var(--chart-grid) 75%)',
            backgroundSize: '200% 100%',
          }} />
        </div>
      </div>
    </div>
  )
}
