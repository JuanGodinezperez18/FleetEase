import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--fe-radius-sm)] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fe-focus-ring)] focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--fe-lime)] text-[var(--fe-ink)] font-semibold hover:brightness-95 shadow-[0_0_0_1px_rgba(215,255,63,0.15)]",
        destructive:
          "bg-[var(--fe-danger)]/15 text-[var(--fe-danger)] border border-[var(--fe-danger)]/20 hover:bg-[var(--fe-danger)]/25",
        outline:
          "border border-[var(--fe-border)] bg-[var(--fe-input-bg)] text-[var(--fe-text-secondary)] hover:bg-[var(--fe-hover)] hover:text-[var(--fe-text)]",
        secondary:
          "bg-[var(--fe-hover)] text-[var(--fe-text-secondary)] hover:bg-[var(--fe-hover-strong)]",
        ghost:
          "text-[var(--fe-text-secondary)] hover:bg-[var(--fe-hover)] hover:text-[var(--fe-text)]",
        link:
          "text-[var(--fe-lime-text)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-[var(--fe-radius-sm)] px-3 text-xs",
        lg: "h-11 rounded-[var(--fe-radius-sm)] px-8",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const classes = cn(buttonVariants({ variant, size, className }))

    if (asChild) {
      return (
        <Slot
          className={classes}
          ref={ref}
          aria-disabled={loading || disabled ? true : undefined}
          {...props}
        >
          {children}
        </Slot>
      )
    }

    return (
      <button className={classes} ref={ref} disabled={disabled || loading} {...props}>
        {loading && (
          <svg
            className="-ml-1 mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!loading && leftIcon && <span className="mr-1">{leftIcon}</span>}
        {children}
        {!loading && rightIcon && <span className="ml-1">{rightIcon}</span>}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
