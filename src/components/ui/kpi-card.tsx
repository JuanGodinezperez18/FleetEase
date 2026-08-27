"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, LucideIcon } from "lucide-react";
import { AnimatedCounter } from "./animated-counter";

interface KPICardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  trend?: number;
  trendLabel?: string;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  loading?: boolean;
}

const KPICard = React.forwardRef<HTMLDivElement, KPICardProps>(
  ({
    className,
    title,
    value,
    prefix = "",
    suffix = "",
    decimals = 0,
    trend,
    trendLabel,
    icon: Icon,
    variant = "default",
    loading = false,
    ...props
  }, ref) => {
    const variants = {
      default: "from-slate-500/20 to-slate-600/10",
      success: "from-emerald-500/20 to-emerald-600/10",
      warning: "from-amber-500/20 to-amber-600/10",
      danger: "from-red-500/20 to-red-600/10",
      info: "from-blue-500/20 to-blue-600/10",
    };

    const iconColors = {
      default: "text-slate-500",
      success: "text-emerald-500",
      warning: "text-amber-500",
      danger: "text-red-500",
      info: "text-blue-500",
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-2xl bg-gradient-to-br p-6",
          "glass-premium border border-white/10",
          variants[variant],
          "hover-lift cursor-pointer",
          className
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        {...(props as any)}
      >
        {/* Background glow effect */}
        <div
          className={cn(
            "absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl opacity-20",
            iconColors[variant].replace("text-", "bg-")
          )}
        />

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">{title}</span>
            <motion.div
              className={cn(
                "p-2 rounded-xl bg-white/5 backdrop-blur-sm",
                iconColors[variant]
              )}
              whileHover={{ rotate: 10, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Icon className="w-5 h-5" />
            </motion.div>
          </div>

          {/* Value */}
          <div className="flex items-baseline gap-2">
            {loading ? (
              <div className="h-8 w-24 bg-muted/50 rounded animate-pulse" />
            ) : (
              <>
                <span className="text-2xl font-bold text-foreground">
                  {prefix}
                  <AnimatedCounter
                    value={value}
                    decimals={decimals}
                    duration={1.5}
                    className="text-2xl font-bold"
                  />
                  {suffix}
                </span>
              </>
            )}
          </div>

          {/* Trend */}
          {trend !== undefined && !loading && (
            <motion.div
              className="flex items-center gap-2 mt-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <span
                className={cn(
                  "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                  trend > 0
                    ? "bg-emerald-500/10 text-emerald-500"
                    : trend < 0
                    ? "bg-red-500/10 text-red-500"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {trend > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : trend < 0 ? (
                  <TrendingDown className="w-3 h-3" />
                ) : (
                  <Minus className="w-3 h-3" />
                )}
                {Math.abs(trend)}%
              </span>
              {trendLabel && (
                <span className="text-xs text-muted-foreground">{trendLabel}</span>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  }
);

KPICard.displayName = "KPICard";

export { KPICard };
