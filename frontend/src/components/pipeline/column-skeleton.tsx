/** ColumnSkeleton — shimmer loading placeholder for a Kanban column (dark theme). */

export function ColumnSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-white/[0.04] bg-[#22211D] p-4 space-y-3"
          style={{ opacity: 1 - i * 0.2 }}
        >
          <div className="h-3 w-3/4 rounded bg-white/[0.04] overflow-hidden relative">
            <div className="shimmer-dark absolute inset-0" />
          </div>
          <div className="h-2.5 w-16 rounded bg-white/[0.04] overflow-hidden relative">
            <div className="shimmer-dark absolute inset-0" />
          </div>
          <div className="h-2.5 w-1/2 rounded bg-white/[0.04] overflow-hidden relative">
            <div className="shimmer-dark absolute inset-0" />
          </div>
        </div>
      ))}
    </div>
  )
}
