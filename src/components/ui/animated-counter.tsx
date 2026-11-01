"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, useSpring, useTransform, useInView } from "framer-motion";
import { durations, useReducedMotion } from "@/lib/animations";

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  /** Seconds. Default 0.6 (audit Table 5). */
  duration?: number;
  className?: string;
  formatter?: (value: number) => string;
}

const AnimatedCounter = ({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = durations.counter,
  className,
  formatter,
}: AnimatedCounterProps) => {
  const ref = React.useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const prefersReduced = useReducedMotion();

  const spring = useSpring(prefersReduced ? value : 0, {
    duration: duration * 1000,
    bounce: 0,
  });

  const display = useTransform(spring, (current) => {
    if (formatter) {
      return formatter(current);
    }
    return current.toFixed(decimals);
  });

  React.useEffect(() => {
    if (prefersReduced) {
      spring.jump(value);
      return;
    }
    if (isInView) {
      spring.set(value);
    }
  }, [isInView, spring, value, prefersReduced]);

  if (prefersReduced) {
    const staticText = formatter
      ? formatter(value)
      : value.toFixed(decimals);
    return (
      <span ref={ref} className={cn("tabular-nums", className)}>
        {prefix}
        {staticText}
        {suffix}
      </span>
    );
  }

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  );
};

export { AnimatedCounter };
