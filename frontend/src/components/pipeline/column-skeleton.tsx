/** ColumnSkeleton — shimmer loading placeholder for a Kanban column. */

export function ColumnSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-[#1A1A2E] bg-[#0F0F1A] p-4 space-y-3"
          style={{ opacity: 1 - i * 0.2 }}
        >
          <div className="h-3 w-3/4 rounded bg-[#1C1C30] overflow-hidden relative">
            <div className="shimmer absolute inset-0" />
          </div>
          <div className="h-3 w-1/2 rounded bg-[#1C1C30] overflow-hidden relative">
            <div className="shimmer absolute inset-0" />
          </div>
          <div className="flex gap-2">
            <div className="h-5 w-16 rounded-full bg-[#1C1C30] overflow-hidden relative">
              <div className="shimmer absolute inset-0" />
            </div>
            <div className="h-5 w-10 rounded bg-[#1C1C30] overflow-hidden relative">
              <div className="shimmer absolute inset-0" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
