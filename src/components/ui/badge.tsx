import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--fe-focus-ring)] focus:ring-offset-[var(--fe-surface)]",
  {
    variants: {
      variant: {
        default:
          "border-[var(--fe-lime)]/20 bg-[var(--fe-lime)]/15 text-[var(--fe-lime)] hover:bg-[var(--fe-lime)]/25",
        secondary:
          "border-[var(--fe-border)] bg-[var(--fe-hover)] text-[var(--fe-text-secondary)] hover:bg-[var(--fe-hover-strong)]",
        destructive:
          "border-[var(--fe-danger)]/20 bg-[var(--fe-danger)]/15 text-[var(--fe-danger)] hover:bg-[var(--fe-danger)]/25",
        outline: "border-[var(--fe-border)] bg-transparent text-[var(--fe-text)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
