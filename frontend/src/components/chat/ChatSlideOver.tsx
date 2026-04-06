/** ChatSlideOver — right-side sheet panel containing a ChatPanel instance. */

import { Sheet, SheetContent } from '@/components/ui/sheet'
import { ChatPanel } from './ChatPanel'

interface ChatSlideOverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChatSlideOver({ open, onOpenChange }: ChatSlideOverProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[480px] sm:max-w-[480px] p-0 border-l border-border-default bg-app-bg [&>button]:hidden"
      >
        <div className="h-full flex flex-col">
          {/* Close bar */}
          <div className="shrink-0 flex items-center justify-end px-3 py-2 border-b border-border-subtle">
            <button
              onClick={() => onOpenChange(false)}
              className="text-xs text-text-secondary hover:text-text-primary transition-colors px-2 py-1 rounded hover:bg-layer-2"
            >
              Close
            </button>
          </div>
          {/* Chat panel fills remaining space */}
          <div className="flex-1 min-h-0">
            <ChatPanel />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
