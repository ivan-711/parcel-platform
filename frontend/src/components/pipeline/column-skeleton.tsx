/** ColumnSkeleton — shimmer loading placeholder for a Kanban column (light theme). */

export function ColumnSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-[10px] border border-gray-200 bg-white p-4 space-y-3"
          style={{ opacity: 1 - i * 0.2 }}
        >
          <div className="h-3 w-3/4 rounded bg-gray-100 overflow-hidden relative">
            <div className="shimmer-light absolute inset-0" />
          </div>
          <div className="h-2.5 w-16 rounded bg-gray-100 overflow-hidden relative">
            <div className="shimmer-light absolute inset-0" />
          </div>
          <div className="h-2.5 w-1/2 rounded bg-gray-100 overflow-hidden relative">
            <div className="shimmer-light absolute inset-0" />
          </div>
        </div>
      ))}
    </div>
  )
}
