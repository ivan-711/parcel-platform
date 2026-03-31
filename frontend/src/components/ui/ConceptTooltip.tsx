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
          <span className="border-b border-dashed border-text-muted cursor-help">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent
          className="max-w-[280px] bg-gray-900 border border-gray-800 text-white p-3"
          sideOffset={4}
        >
          <p className="font-semibold text-sm mb-1 text-white">{term}</p>
          <p className="text-xs text-gray-300 leading-relaxed">{definition}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
