// Animation utilities — FleetEase UX audit Table 5 (Phase 3).
// Durations in seconds for framer-motion; CSS tokens use ms (--fe-motion-*).

import { useEffect, useState } from 'react';

export const easings = {
  outExpo: [0.16, 1, 0.3, 1] as const,
  outBack: [0.34, 1.56, 0.64, 1] as const,
  spring: { type: 'spring' as const, stiffness: 400, damping: 30 },
  smooth: [0.4, 0, 0.2, 1] as const,
  dramatic: [0.87, 0, 0.13, 1] as const,
};

/** Seconds — maps to --fe-motion-fast/base/slow (160 / 240 / 360 ms). */
export const durations = {
  instant: 0.08,
  fast: 0.16,
  normal: 0.24,
  slow: 0.36,
  /** KPI counter spring (Table 5). */
  counter: 0.6,
  /** Sparkline stroke draw (Table 5). */
  sparkline: 0.6,
  /** Absolute ceiling for staggered grid entrance. */
  staggerCap: 0.6,
};

/** Milliseconds — for CSS / SVG inline transitions. */
export const durationsMs = {
  instant: 80,
  fast: 160,
  normal: 240,
  slow: 360,
  counter: 600,
  sparkline: 600,
  staggerStep: 30,
  staggerCap: 600,
  /** Critical alert attention pulse: 2 × 480 ms then static. */
  alertPulseCycle: 480,
  alertPulseCycles: 2,
};

/** Stagger delay for item index, capped at staggerCap (Table 5). */
export function staggerDelay(index: number): number {
  return Math.min(index * durationsMs.staggerStep, durationsMs.staggerCap) / 1000;
}

// Framer Motion variants
export const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: durations.normal, ease: easings.smooth },
  },
};

export const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.normal, ease: easings.outExpo },
  },
};

export const fadeInScale = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: durations.normal, ease: easings.outExpo },
  },
};

export const slideInRight = {
  hidden: { opacity: 0, x: 24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: durations.normal, ease: easings.outExpo },
  },
};

export const slideInLeft = {
  hidden: { opacity: 0, x: -24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: durations.normal, ease: easings.outExpo },
  },
};

/** Dashboard KPI / list entrance — 30 ms step, no 200 ms head delay (Table 5). */
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: durationsMs.staggerStep / 1000,
      delayChildren: 0,
    },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.normal, ease: easings.outExpo },
  },
};

/** Critical alert icon: two pulse cycles then rest (not Infinity). */
export const alertPulseLimited = {
  scale: [1, 1.15, 1],
  transition: {
    duration: durationsMs.alertPulseCycle / 1000,
    repeat: durationsMs.alertPulseCycles - 1,
    ease: 'easeInOut' as const,
  },
};

export const scaleOnHover = {
  scale: 1.02,
  transition: { duration: durations.fast, ease: easings.smooth },
};

export const scaleOnTap = {
  scale: 0.98,
};

export const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.normal, ease: easings.outExpo },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: durations.fast, ease: easings.smooth },
  },
};

export const cardHover = {
  rest: { scale: 1, y: 0 },
  hover: {
    y: -2,
    transition: { duration: durations.fast, ease: easings.outExpo },
  },
};

export const buttonTap = {
  scale: 0.95,
  transition: { duration: durations.instant },
};

/** Prefer limited alert pulse over infinite loading pulse for operational UI. */
export const loadingPulse = {
  scale: [1, 1.03, 1],
  opacity: [0.55, 1, 0.55],
  transition: {
    duration: 1.2,
    repeat: Infinity,
    ease: 'easeInOut' as const,
  },
};

export const successPop = {
  scale: [0.8, 1.05, 1],
  transition: { duration: durations.normal, ease: easings.outBack },
};

export const errorShake = {
  x: [-8, 8, -6, 6, 0],
  transition: { duration: 0.4 },
};

export const tooltip = {
  hidden: { opacity: 0, y: 8, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: durations.fast, ease: easings.outBack },
  },
};

/** Modal — 240 ms in out-expo / 160 ms out smooth (Table 5). */
export const modal = {
  hidden: { opacity: 0, scale: 0.97, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: durations.normal, ease: easings.outExpo },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 8,
    transition: { duration: durations.fast, ease: easings.smooth },
  },
};

export const scrollReveal = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.slow, ease: easings.outExpo },
  },
};

export const parallax = {
  slow: { y: -20 },
  medium: { y: -50 },
  fast: { y: -100 },
};

/**
 * Reactive prefers-reduced-motion (SSR-safe).
 * Use to short-circuit framer-motion and SVG dash animations in JS.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return reduced;
}
