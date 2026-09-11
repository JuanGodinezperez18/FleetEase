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
          <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-sm font-medium text-white/40" aria-hidden="true">
            $
          </span>
        )}
        <input
          type={type}
          className={cn(
            "flex h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-[14px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.025)] outline-none transition-[border-color,background-color,box-shadow] duration-150 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-white/30 hover:border-white/[0.13] hover:bg-white/[0.045] focus-visible:border-[#d7ff3f]/50 focus-visible:bg-white/[0.055] focus-visible:ring-2 focus-visible:ring-[#d7ff3f]/10 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-white/[0.08] disabled:hover:bg-white/[0.035] md:text-sm",
            isCurrencyAmount && "pl-7 tabular-nums",
            validationState === 'success' && "border-emerald-400/60 focus-visible:border-emerald-400 focus-visible:ring-emerald-400/10 pr-10",
            validationState === 'error' && "border-red-400/70 focus-visible:border-red-400 focus-visible:ring-red-400/10 pr-10",
            className
          )}
          ref={ref}
          aria-invalid={validationState === 'error'}
          {...props}
        />
        {hasValidation && validationState === 'success' && (
          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
        )}
        {hasValidation && validationState === 'error' && (
          <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-400" />
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
