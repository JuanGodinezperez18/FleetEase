// Animation utilities for consistent animations across the app

export const easings = {
  outExpo: [0.16, 1, 0.3, 1],
  outBack: [0.34, 1.56, 0.64, 1],
  spring: { type: "spring" as const, stiffness: 400, damping: 30 },
  smooth: [0.4, 0, 0.2, 1],
  dramatic: [0.87, 0, 0.13, 1],
};

export const durations = {
  instant: 0.15,
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
  dramatic: 0.8,
};

// Framer Motion variants
export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: durations.normal, ease: easings.smooth } },
};

export const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.slow, ease: easings.outExpo },
  },
};

export const fadeInScale = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: durations.normal, ease: easings.outExpo },
  },
};

export const slideInRight = {
  hidden: { opacity: 0, x: 100 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: durations.slow, ease: easings.outExpo },
  },
};

export const slideInLeft = {
  hidden: { opacity: 0, x: -100 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: durations.slow, ease: easings.outExpo },
  },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.slow, ease: easings.outExpo },
  },
};

export const scaleOnHover = {
  scale: 1.02,
  transition: { duration: durations.fast, ease: easings.smooth },
};

export const scaleOnTap = {
  scale: 0.98,
};

// Page transition variants
export const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.slow, ease: easings.outExpo },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: durations.normal, ease: easings.smooth },
  },
};

// Card hover effects
export const cardHover = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.02,
    y: -4,
    transition: { duration: durations.fast, ease: easings.outExpo },
  },
};

// Button animations
export const buttonTap = {
  scale: 0.95,
  transition: { duration: durations.instant },
};

// Loading animation
export const loadingPulse = {
  scale: [1, 1.05, 1],
  opacity: [0.5, 1, 0.5],
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: "easeInOut",
  },
};

// Success animation
export const successPop = {
  scale: [0.8, 1.1, 1],
  transition: { duration: durations.normal, ease: easings.outBack },
};

// Error shake animation
export const errorShake = {
  x: [-10, 10, -10, 10, 0],
  transition: { duration: 0.5 },
};

// Tooltip animation
export const tooltip = {
  hidden: { opacity: 0, y: 10, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: durations.fast, ease: easings.outBack },
  },
};

// Modal animation
export const modal = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: durations.normal, ease: easings.outExpo },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: durations.fast, ease: easings.smooth },
  },
};

// Scroll-triggered reveal
export const scrollReveal = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.slow, ease: easings.outExpo },
  },
};

// Parallax values
export const parallax = {
  slow: { y: -20 },
  medium: { y: -50 },
  fast: { y: -100 },
};

// Custom hook for reduced motion preference
export const useReducedMotion = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};
