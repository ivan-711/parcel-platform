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
          <span className="border-b border-dashed border-[#5C5A56] cursor-help">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent
          className="max-w-[280px] bg-[#2A2924] border border-white/[0.08] p-3 rounded-lg shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
          sideOffset={4}
        >
          <p className="text-sm font-semibold text-[#F0EDE8] mb-1">{term}</p>
          <p className="text-xs text-[#A09D98] leading-relaxed">{definition}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
