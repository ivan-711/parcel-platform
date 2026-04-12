import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface ConceptTooltipProps {
  term: string
  definition: string
  children: React.ReactNode
}

/**
 * Inline glossary tooltip — wraps a term with a dashed underline trigger
 * and shows a dark popover with the definition on hover.
 */
export function ConceptTooltip({ term, definition, children }: ConceptTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="border-b border-dashed border-text-disabled cursor-help">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent
          className="max-w-[280px] bg-app-overlay border border-border-strong p-3 rounded-lg shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
          sideOffset={4}
        >
          <p className="text-sm font-semibold text-text-primary mb-1">{term}</p>
          <p className="text-xs text-text-secondary leading-relaxed">{definition}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
