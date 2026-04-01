/** Page-level header with title, optional subtitle, and optional action slot. */

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-semibold font-brand text-[#F0EDE8]">{title}</h1>
        {subtitle && (
          <p className="text-sm text-[#A09D98] mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
