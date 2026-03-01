/** Wrapper for the scrollable content area inside AppShell. */

interface PageContentProps {
  children: React.ReactNode
  className?: string
}

export function PageContent({ children, className }: PageContentProps) {
  return (
    <div className={className}>
      {children}
    </div>
  )
}
