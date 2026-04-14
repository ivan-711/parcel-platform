import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 min-h-[44px] md:min-h-0 w-full bg-gray-1 text-text-primary text-sm placeholder:text-text-muted border border-border-default rounded-lg shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] hover:border-border-emphasis focus-ring focus-visible:border-violet-400/50 focus-visible:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_0_0_3px_rgba(139,122,255,0.12)] focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground transition-all duration-200",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
