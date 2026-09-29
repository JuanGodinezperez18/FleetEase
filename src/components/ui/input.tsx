import * as React from "react"
import { CheckCircle2, AlertCircle } from "lucide-react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.ComponentProps<"input"> {
  validationState?: 'success' | 'error';
  showValidationIcon?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, validationState, showValidationIcon = true, ...props }, ref) => {
    const hasValidation = validationState && showValidationIcon;
    const isCurrencyAmount = props.name === 'amount';

    return (
      <div className="relative w-full">
        {isCurrencyAmount && (
          <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-sm font-medium text-[var(--fe-text-muted)]" aria-hidden="true">
            $
          </span>
        )}
        <input
          type={type}
          className={cn(
            "flex h-[var(--fe-control-height)] w-full rounded-[var(--fe-radius-sm)] border border-[var(--fe-border)] bg-[var(--fe-input-bg)] px-3 py-2 text-[14px] text-[var(--fe-text)] shadow-[inset_0_1px_0_rgba(255,255,255,.025)] outline-none transition-[border-color,background-color,box-shadow] duration-[var(--fe-motion-fast)] file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[var(--fe-text-muted)] hover:border-[var(--fe-border-strong)] hover:bg-[var(--fe-hover)] focus-visible:border-[var(--fe-lime)] focus-visible:bg-[var(--fe-hover)] focus-visible:ring-2 focus-visible:ring-[var(--fe-focus-ring)] aria-[invalid=true]:border-[var(--fe-danger)] aria-[invalid=true]:focus-visible:ring-[var(--fe-danger)]/10 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-[var(--fe-border)] disabled:hover:bg-[var(--fe-input-bg)] md:text-sm",
            isCurrencyAmount && "pl-7 tabular-nums",
            validationState === 'success' && "border-[var(--fe-success)] focus-visible:border-[var(--fe-success)] focus-visible:ring-2 focus-visible:ring-[var(--fe-success)]/10 pr-10",
            validationState === 'error' && "border-[var(--fe-danger)] focus-visible:border-[var(--fe-danger)] focus-visible:ring-2 focus-visible:ring-[var(--fe-danger)]/10 pr-10",
            className
          )}
          ref={ref}
          aria-invalid={validationState === 'error'}
          {...props}
        />
        {hasValidation && validationState === 'success' && (
          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fe-success)]" />
        )}
        {hasValidation && validationState === 'error' && (
          <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fe-danger)]" />
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
