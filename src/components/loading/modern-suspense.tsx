"use client";

import { Suspense, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';
import { SkeletonLoader } from '../animations/modern-transitions';

/**
 * Componentes de Suspense modernos para React 19
 *
 * React 19 mejora Suspense con:
 * - Mejor coordinación con Server Components
 * - Soporte mejorado para streaming
 * - Transiciones más fluidas entre estados de carga
 */

// Loader principal mejorado
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
          <Loader2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </motion.div>

        {/* Pulse ring alrededor del loader */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-blue-600/30 dark:border-blue-400/30"
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

      <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
        {message}
      </p>
    </motion.div>
  );
}

// Skeleton específico para cards
export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <SkeletonLoader className="h-5 w-32" />
        <SkeletonLoader className="h-5 w-5 rounded-full" />
      </div>
      <SkeletonLoader className="h-4 w-full" />
      <SkeletonLoader className="h-4 w-3/4" />
      <div className="flex gap-2 pt-2">
        <SkeletonLoader className="h-8 w-20" />
        <SkeletonLoader className="h-8 w-24" />
      </div>
    </div>
  );
}

// Skeleton para tabla
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <SkeletonLoader className="h-4 w-1/4" />
        <SkeletonLoader className="h-4 w-1/3" />
        <SkeletonLoader className="h-4 w-1/4" />
        <SkeletonLoader className="h-4 w-1/5" />
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <SkeletonLoader className="h-10 w-1/4" />
          <SkeletonLoader className="h-10 w-1/3" />
          <SkeletonLoader className="h-10 w-1/4" />
          <SkeletonLoader className="h-10 w-1/5" />
        </div>
      ))}
    </div>
  );
}

// Skeleton para lista
export function ListSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
          <SkeletonLoader className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <SkeletonLoader className="h-4 w-3/4" />
            <SkeletonLoader className="h-3 w-1/2" />
          </div>
          <SkeletonLoader className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

// Wrapper de Suspense con fallback personalizado
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
  // Determinar el fallback basado en el tipo
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

// Error Boundary mejorado para React 19
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
        <div className="h-16 w-16 bg-red-100 dark:bg-red-950/20 rounded-full flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-red-600/30"
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
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Algo salió mal
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md">
          {error.message || 'Ha ocurrido un error inesperado'}
        </p>
      </div>

      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
      >
        Intentar de nuevo
      </button>
    </motion.div>
  );
}

// Loading states para diferentes secciones
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
      <SkeletonLoader className="h-10 w-full" />
      <SkeletonLoader className="h-10 w-full" />
      <SkeletonLoader className="h-24 w-full" />
      <SkeletonLoader className="h-10 w-32" />
    </div>
  )
};
