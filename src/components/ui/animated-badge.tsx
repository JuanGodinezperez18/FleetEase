"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary border border-primary/20",
        success: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
        warning: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
        danger: "bg-red-500/10 text-red-500 border border-red-500/20",
        info: "bg-blue-500/10 text-blue-500 border border-blue-500/20",
        pulse: "bg-primary/10 text-primary border border-primary/20 animate-pulse",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface AnimatedBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
  animated?: boolean;
  pulse?: boolean;
  glow?: boolean;
}

const AnimatedBadge = React.forwardRef<HTMLSpanElement, AnimatedBadgeProps>(
  ({ className, variant, children, animated = true, pulse = false, glow = false, ...props }, ref) => {
    return (
      <motion.span
        ref={ref}
        className={cn(
          badgeVariants({ variant }),
          pulse && "relative",
          glow && "shadow-glow",
          className
        )}
        initial={animated ? { opacity: 0, scale: 0.8 } : false}
        animate={animated ? { opacity: 1, scale: 1 } : false}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
        {...(props as any)}
      >
        {pulse && (
          <span className="absolute inset-0 rounded-full animate-ping bg-current opacity-20" />
        )}
        <span className="relative z-10">{children}</span>
      </motion.span>
    );
  }
);

AnimatedBadge.displayName = "AnimatedBadge";

export { AnimatedBadge, badgeVariants };
