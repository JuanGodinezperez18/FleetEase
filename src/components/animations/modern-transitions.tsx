"use client";

import { motion, type Variants } from 'framer-motion';
import { type ReactNode } from 'react';

/**
 * Transiciones modernas optimizadas para React 19
 *
 * React 19 mejora el rendimiento de animaciones con:
 * - Mejor coordinación con Concurrent Features
 * - Automatic batching mejorado
 * - Transiciones más fluidas con useTransition
 */

// Variantes de animación predefinidas y optimizadas
export const fadeInUp: Variants = {
  hidden: {
    opacity: 0,
    y: 24,
    filter: 'blur(4px)'
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1], // easeOutExpo
    }
  }
};

export const fadeInScale: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    filter: 'blur(4px)'
  },
  visible: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1],
    }
  }
};

export const slideInRight: Variants = {
  hidden: {
    x: 100,
    opacity: 0
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20
    }
  }
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

export const cardHover: Variants = {
  rest: {
    scale: 1,
    y: 0,
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
  },
  hover: {
    scale: 1.02,
    y: -4,
    boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

// Componentes reutilizables

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function FadeIn({ children, delay = 0, className }: FadeInProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      custom={delay}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function FadeInScale({ children, delay = 0, className }: FadeInProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInScale}
      custom={delay}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface StaggerProps {
  children: ReactNode;
  className?: string;
}

export function StaggerContainer({ children, className }: StaggerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: FadeInProps) {
  return (
    <motion.div
      variants={fadeInUp}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Versión específica para filas de tabla
export function StaggerTableRow({ children, className }: FadeInProps) {
  return (
    <motion.tr
      variants={fadeInUp}
      className={className}
    >
      {children}
    </motion.tr>
  );
}

interface HoverCardProps {
  children: ReactNode;
  className?: string;
}

export function HoverCard({ children, className }: HoverCardProps) {
  return (
    <motion.div
      initial="rest"
      whileHover="hover"
      variants={cardHover}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Animación de número contador (útil para dashboards)
interface CountUpProps {
  value: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

export function CountUp({
  value,
  duration = 2,
  suffix = '',
  prefix = '',
  className
}: CountUpProps) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1]
      }}
      className={className}
    >
      {prefix}{value}{suffix}
    </motion.span>
  );
}

// Loading skeleton animado
export function SkeletonLoader({ className }: { className?: string }) {
  return (
    <motion.div
      className={`bg-slate-200 dark:bg-slate-800 rounded ${className}`}
      animate={{
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  );
}

// Pulso para notificaciones
export function PulseIndicator({ className }: { className?: string }) {
  return (
    <motion.div
      className={`rounded-full ${className}`}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.7, 1, 0.7],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  );
}
