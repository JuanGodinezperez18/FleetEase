"use client";

import { Suspense, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';
import { SkeletonLoader } from '../animations/modern-transitions';
import { cn } from '@/lib/utils';

/**
 * Componentes de Suspense modernos para React 19
 * Alineados al design system FleetEase (dark + lime + glass).
 */

export function ModernLoader({ message = 'Cargando...' }: { message?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center p-12 space-y-4"
    >
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <Loader2 className="h-8 w-8 text-[#d7ff3f]" />
        </motion.div>

        <motion.div
          className="absolute inset-0 rounded-full border-2 border-[#d7ff3f]/25"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 0, 0.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <p className="text-sm text-white/50 font-medium">
        {message}
      </p>
    </motion.div>
  );
}

/** Skeleton de card de métrica / KPI alineado al glass dark */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.08] bg-[#0e1117]/80 p-5 sm:p-6 space-y-4 backdrop-blur-xl",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="fe-skeleton h-11 w-11 rounded-xl" />
        <div className="fe-skeleton h-6 w-14 rounded-full" />
      </div>
      <div className="fe-skeleton h-3 w-24 rounded" />
      <div className="fe-skeleton h-8 w-32 rounded" />
      <div className="fe-skeleton h-3 w-40 rounded" />
    </div>
  );
}

/** Skeleton de tabla */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 pb-3 border-b border-white/[0.06]">
        <div className="fe-skeleton h-4 w-1/4 rounded" />
        <div className="fe-skeleton h-4 w-1/3 rounded" />
        <div className="fe-skeleton h-4 w-1/4 rounded" />
        <div className="fe-skeleton h-4 w-1/5 rounded" />
      </div>

      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="fe-skeleton h-10 w-1/4 rounded" />
          <div className="fe-skeleton h-10 w-1/3 rounded" />
          <div className="fe-skeleton h-10 w-1/4 rounded" />
          <div className="fe-skeleton h-10 w-1/5 rounded" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton de lista */
export function ListSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.08] bg-[#0e1117]/60"
        >
          <div className="fe-skeleton h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="fe-skeleton h-4 w-3/4 rounded" />
            <div className="fe-skeleton h-3 w-1/2 rounded" />
          </div>
          <div className="fe-skeleton h-8 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

interface SuspenseWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  fallbackType?: 'loader' | 'card' | 'table' | 'list';
  message?: string;
}

export function SuspenseWrapper({
  children,
  fallback,
  fallbackType = 'loader',
  message
}: SuspenseWrapperProps) {
  const defaultFallback = () => {
    switch (fallbackType) {
      case 'card':
        return <CardSkeleton />;
      case 'table':
        return <TableSkeleton />;
      case 'list':
        return <ListSkeleton />;
      default:
        return <ModernLoader message={message} />;
    }
  };

  return (
    <Suspense fallback={fallback || defaultFallback()}>
      {children}
    </Suspense>
  );
}

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export function ModernErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center p-12 text-center space-y-4"
    >
      <div className="relative">
        <div className="h-16 w-16 bg-rose-500/10 rounded-full flex items-center justify-center border border-rose-500/20">
          <AlertCircle className="h-8 w-8 text-rose-400" />
        </div>
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-rose-500/20"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0, 0.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <div className="space-y-2">
        <h3 className="font-heading text-lg font-semibold text-white">
          Algo salió mal
        </h3>
        <p className="text-sm text-white/50 max-w-md">
          {error.message || 'Ha ocurrido un error inesperado'}
        </p>
      </div>

      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-[#d7ff3f] hover:bg-white text-[#080a0f] rounded-full text-sm font-bold transition-colors duration-200"
      >
        Intentar de nuevo
      </button>
    </motion.div>
  );
}

export const LoadingStates = {
  Dashboard: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  ),
  Table: () => <TableSkeleton rows={8} />,
  List: () => <ListSkeleton items={5} />,
  Form: () => (
    <div className="space-y-4 max-w-md">
      <div className="fe-skeleton h-10 w-full rounded-lg" />
      <div className="fe-skeleton h-10 w-full rounded-lg" />
      <div className="fe-skeleton h-24 w-full rounded-lg" />
      <div className="fe-skeleton h-10 w-32 rounded-full" />
    </div>
  )
};
