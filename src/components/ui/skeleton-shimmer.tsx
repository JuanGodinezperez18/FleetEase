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
            className="h-4 bg-gradient-to-r from-muted via-muted/50 to-muted rounded"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.5,
              delay: i * 0.1,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{
              backgroundSize: "200% 100%",
              animation: "shimmer 2s linear infinite",
              width: `${Math.random() * 40 + 60}%`,
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
          "p-6 rounded-2xl bg-card border border-border",
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-4">
          {avatar && (
            <div
              className="w-12 h-12 rounded-full bg-gradient-to-r from-muted via-muted/50 to-muted flex-shrink-0"
              style={{
                backgroundSize: "200% 100%",
                animation: "shimmer 2s linear infinite",
              }}
            />
          )}
          <div className="flex-1 space-y-2">
            <div
              className="h-4 w-1/3 bg-gradient-to-r from-muted via-muted/50 to-muted rounded"
              style={{
                backgroundSize: "200% 100%",
                animation: "shimmer 2s linear infinite",
              }}
            />
            {Array.from({ length: lines }).map((_, i) => (
              <div
                key={i}
                className="h-3 bg-gradient-to-r from-muted via-muted/50 to-muted rounded"
                style={{
                  backgroundSize: "200% 100%",
                  animation: "shimmer 2s linear infinite",
                  animationDelay: `${i * 0.1}s`,
                  width: `${Math.random() * 30 + 50}%`,
                }}
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
