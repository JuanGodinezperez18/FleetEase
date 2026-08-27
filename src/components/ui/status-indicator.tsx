"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";

const statusVariants = cva(
  "relative inline-flex items-center gap-2",
  {
    variants: {
      status: {
        online: "text-emerald-500",
        offline: "text-slate-500",
        away: "text-amber-500",
        busy: "text-red-500",
        idle: "text-blue-500",
      },
      size: {
        sm: "text-xs",
        md: "text-sm",
        lg: "text-base",
      },
    },
    defaultVariants: {
      status: "online",
      size: "md",
    },
  }
);

interface StatusIndicatorProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusVariants> {
  label?: string;
  pulse?: boolean;
  animated?: boolean;
}

const StatusIndicator = React.forwardRef<HTMLSpanElement, StatusIndicatorProps>(
  ({ className, status, size, label, pulse = true, animated = true, ...props }, ref) => {
    const dotColors = {
      online: "bg-emerald-500",
      offline: "bg-slate-500",
      away: "bg-amber-500",
      busy: "bg-red-500",
      idle: "bg-blue-500",
    };

    const dotSizes = {
      sm: "w-1.5 h-1.5",
      md: "w-2 h-2",
      lg: "w-2.5 h-2.5",
    };

    return (
      <motion.span
        ref={ref}
        className={cn(statusVariants({ status, size }), className)}
        initial={animated ? { opacity: 0, scale: 0.8 } : false}
        animate={animated ? { opacity: 1, scale: 1 } : false}
        transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
        {...(props as any)}
      >
        <span className="relative flex"
        >
          <motion.span
            className={cn("rounded-full", dotColors[status || "online"], dotSizes[size || "md"])}
            animate={pulse ? { scale: [1, 1.2, 1] } : {}}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          {pulse && (
            <span
              className={cn(
                "absolute inline-flex rounded-full opacity-75 animate-ping",
                dotColors[status || "online"],
                dotSizes[size || "md"]
              )}
            />
          )}
        </span>
        {label && <span className="font-medium">{label}</span>}
      </motion.span>
    );
  }
);

StatusIndicator.displayName = "StatusIndicator";

export { StatusIndicator, statusVariants };
