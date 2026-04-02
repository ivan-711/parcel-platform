import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background focus-visible:ring-offset-2 focus-visible:ring-offset-violet-400 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7] text-accent-text-on-accent shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_12px_-3px_rgba(139,122,255,0.25)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.4),0_0_20px_-3px_rgba(139,122,255,0.4)] hover:brightness-110 active:scale-[0.98] active:brightness-95",
        destructive:
          "bg-error/10 text-error border border-error/20 hover:bg-error/15",
        outline:
          "border border-border-default bg-transparent text-foreground hover:bg-layer-2 hover:text-foreground",
        secondary:
          "bg-layer-2 text-muted-foreground hover:bg-layer-3 hover:text-foreground",
        ghost:
          "text-muted-foreground hover:bg-layer-2 hover:text-foreground",
        link: "text-violet-400 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 min-h-[44px] md:min-h-0 px-5 py-2 rounded-lg",
        sm: "h-8 min-h-[44px] md:min-h-0 px-3 text-xs rounded-md",
        lg: "h-12 px-6 text-base rounded-lg",
        icon: "h-10 w-10 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
