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
          <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-sm font-medium text-muted-foreground" aria-hidden="true">
            $
          </span>
        )}
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-colors",
            isCurrencyAmount && "pl-7 tabular-nums",
            validationState === 'success' && "border-green-500 focus-visible:ring-green-500 pr-10",
            validationState === 'error' && "border-red-500 focus-visible:ring-red-500 pr-10",
            className
          )}
          ref={ref}
          aria-invalid={validationState === 'error'}
          {...props}
        />
        {hasValidation && validationState === 'success' && (
          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500 animate-in zoom-in duration-200" />
        )}
        {hasValidation && validationState === 'error' && (
          <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500 animate-in zoom-in duration-200" />
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
