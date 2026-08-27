"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface GradientTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: "primary" | "rainbow" | "sunset" | "ocean" | "aurora";
  animate?: boolean;
  as?: "span" | "h1" | "h2" | "h3" | "h4" | "p";
}

const GradientText = React.forwardRef<HTMLSpanElement, GradientTextProps>(
  ({ className, children, variant = "primary", animate = true, as: Component = "span", ...props }, ref) => {
    const variants = {
      primary: "bg-gradient-to-r from-primary via-accent to-primary",
      rainbow: "bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500",
      sunset: "bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600",
      ocean: "bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600",
      aurora: "bg-gradient-to-r from-emerald-400 via-cyan-500 to-purple-600",
    };

    const MotionComponent = motion[Component as keyof typeof motion] as typeof motion.span;

    return (
      <MotionComponent
        ref={ref}
        className={cn(
          "bg-clip-text text-transparent",
          variants[variant],
          animate && "animate-shimmer bg-[length:200%_auto]",
          className
        )}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        {...(props as any)}
      >
        {children}
      </MotionComponent>
    );
  }
);

GradientText.displayName = "GradientText";

export { GradientText };
