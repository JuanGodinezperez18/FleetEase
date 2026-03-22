"use client";

import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * ModernCard - Componente optimizado para React 19
 *
 * ANTES (React 18):
 * - Necesitábamos useMemo para children complejos
 * - useCallback para event handlers
 * - memo() para evitar re-renders
 *
 * AHORA (React 19):
 * - El React Compiler optimiza automáticamente
 * - No necesitamos memoización manual
 * - Código más limpio y mantenible
 */

interface ModernCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
  onClick?: () => void;
  isLoading?: boolean;
}

// ✨ React 19: No necesitamos memo() aquí
// El compilador se encarga de la optimización automática
export function ModernCard({
  title,
  description,
  children,
  icon,
  className = '',
  onClick,
  isLoading = false
}: ModernCardProps) {
  // ✨ React 19: No necesitamos useCallback para onClick
  // El compilador memoiza automáticamente
  const handleClick = () => {
    if (!isLoading && onClick) {
      onClick();
    }
  };

  // ✨ React 19: No necesitamos useMemo para computed values
  // El compilador optimiza automáticamente
  const isInteractive = !!onClick;

  return (
    <motion.div
      whileHover={isInteractive ? { scale: 1.02, y: -2 } : undefined}
      whileTap={isInteractive ? { scale: 0.98 } : undefined}
      onClick={handleClick}
      className={`${isInteractive ? 'cursor-pointer' : ''} ${className}`}
    >
      <Card className={`
        transition-all duration-200
        ${isInteractive ? 'hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700' : ''}
        ${isLoading ? 'opacity-50 pointer-events-none' : ''}
      `}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <CardTitle className="flex items-center gap-2">
                {icon && <span className="text-blue-600 dark:text-blue-400">{icon}</span>}
                {title}
              </CardTitle>
              {description && (
                <CardDescription>{description}</CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-3/4" />
            </div>
          ) : (
            children
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Ejemplo de lista optimizada
interface OptimizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T) => string | number;
  emptyMessage?: string;
}

/**
 * ✨ React 19: Lista optimizada sin memoización manual
 * El compilador maneja la optimización automáticamente
 */
export function OptimizedList<T>({
  items,
  renderItem,
  keyExtractor,
  emptyMessage = 'No hay elementos para mostrar'
}: OptimizedListProps<T>) {
  // ✨ No necesitamos useMemo para el map
  // React 19 Compiler lo optimiza automáticamente

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-2"
    >
      {items.map((item, index) => (
        <motion.div
          key={keyExtractor(item)}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          {renderItem(item, index)}
        </motion.div>
      ))}
    </motion.div>
  );
}

// Comparación antes/después

/**
 * ❌ ANTES (React 18) - Código verbose con memoización manual:
 *
 * const ExpensiveComponent = memo(({ data }) => {
 *   const processedData = useMemo(() => {
 *     return data.map(item => ({
 *       ...item,
 *       computed: item.value * 2
 *     }));
 *   }, [data]);
 *
 *   const handleClick = useCallback(() => {
 *     console.log('clicked');
 *   }, []);
 *
 *   return <div onClick={handleClick}>{processedData}</div>;
 * });
 *
 * ✅ AHORA (React 19) - Código limpio, compiler hace el trabajo:
 *
 * function ExpensiveComponent({ data }) {
 *   const processedData = data.map(item => ({
 *     ...item,
 *     computed: item.value * 2
 *   }));
 *
 *   const handleClick = () => {
 *     console.log('clicked');
 *   };
 *
 *   return <div onClick={handleClick}>{processedData}</div>;
 * }
 *
 * El React Compiler se encarga de toda la optimización automáticamente!
 */
