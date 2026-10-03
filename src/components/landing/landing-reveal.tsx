"use client";

/**
 * Sección de la landing con reveal al hacer scroll (framer-motion).
 *
 * Accesibilidad: si el usuario prefiere movimiento reducido
 * (`prefers-reduced-motion: reduce`), se renderiza contenido estático,
 * sin animación de ningún tipo.
 */

import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

type RevealSectionProps = ComponentPropsWithoutRef<'section'> & {
  children: ReactNode;
  /** Retardo en segundos, opcional. */
  delay?: number;
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function RevealSection({ children, delay = 0, ...sectionProps }: RevealSectionProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <section {...sectionProps}>{children}</section>;
  }

  return (
    <motion.section
      {...sectionProps}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px 0px' }}
      transition={{ duration: 0.55, delay, ease: EASE }}
    >
      {children}
    </motion.section>
  );
}

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

/** Reveal genérico para bloques interiores (listas, cards). */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px 0px' }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
