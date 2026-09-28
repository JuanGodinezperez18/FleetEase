"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SkeletonShimmerProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
  className?: string;
}

const SkeletonShimmer = React.forwardRef<HTMLDivElement, SkeletonShimmerProps>(
  ({ lines = 3, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-3", className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <motion.div
            key={i}
            className="fe-skeleton h-4 rounded"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.5,
              delay: i * 0.1,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{
              width: `${60 + ((i * 17) % 35)}%`,
            }}
          />
        ))}
      </div>
    );
  }
);

SkeletonShimmer.displayName = "SkeletonShimmer";

interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  avatar?: boolean;
  lines?: number;
}

const SkeletonCard = React.forwardRef<HTMLDivElement, SkeletonCardProps>(
  ({ className, avatar = true, lines = 2, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-[var(--fe-radius-lg)] border border-[var(--fe-border)] bg-[var(--fe-surface)] p-6",
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-4">
          {avatar && (
            <div className="fe-skeleton h-12 w-12 flex-shrink-0 rounded-full" />
          )}
          <div className="flex-1 space-y-2">
            <div className="fe-skeleton h-4 w-1/3 rounded" />
            {Array.from({ length: lines }).map((_, i) => (
              <div
                key={i}
                className="fe-skeleton h-3 rounded"
                style={{ width: `${50 + ((i * 23) % 30)}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
);

SkeletonCard.displayName = "SkeletonCard";

export { SkeletonShimmer, SkeletonCard };
