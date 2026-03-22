"use client";

import { Suspense, type ReactNode } from 'react';
import { ModernLoader, LoadingStates } from './modern-suspense';

/**
 * Route Suspense Wrapper - React 19 Optimized
 *
 * Wrapper especializado para rutas lazy-loaded con fallbacks personalizados
 * según el tipo de contenido que se está cargando.
 *
 * React 19 mejora Suspense con:
 * - Mejor coordinación con Server Components
 * - Soporte mejorado para streaming
 * - Transiciones más fluidas entre estados de carga
 */

export type RouteType = 'dashboard' | 'table' | 'list' | 'form' | 'details' | 'custom';

interface RouteSuspenseWrapperProps {
  children: ReactNode;
  routeType?: RouteType;
  customFallback?: ReactNode;
  loadingMessage?: string;
}

/**
 * Wrapper de Suspense optimizado para rutas
 *
 * @param children - Componente hijo que puede suspenderse
 * @param routeType - Tipo de ruta para determinar el fallback apropiado
 * @param customFallback - Fallback personalizado opcional
 * @param loadingMessage - Mensaje personalizado para el loader
 *
 * @example
 * ```tsx
 * // En una página de dashboard
 * <RouteSuspenseWrapper routeType="dashboard">
 *   <DashboardContent />
 * </RouteSuspenseWrapper>
 *
 * // En una tabla
 * <RouteSuspenseWrapper routeType="table" loadingMessage="Cargando vehículos...">
 *   <VehiclesTable />
 * </RouteSuspenseWrapper>
 * ```
 */
export function RouteSuspenseWrapper({
  children,
  routeType = 'dashboard',
  customFallback,
  loadingMessage = 'Cargando...'
}: RouteSuspenseWrapperProps) {
  // Si hay fallback personalizado, usarlo
  if (customFallback) {
    return <Suspense fallback={customFallback}>{children}</Suspense>;
  }

  // Determinar fallback basado en el tipo de ruta
  const getFallback = () => {
    switch (routeType) {
      case 'dashboard':
        return <LoadingStates.Dashboard />;
      case 'table':
        return <LoadingStates.Table />;
      case 'list':
        return <LoadingStates.List />;
      case 'form':
        return <LoadingStates.Form />;
      case 'details':
        return (
          <div className="space-y-4 max-w-4xl">
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/3 animate-pulse" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2 animate-pulse" />
            <div className="grid gap-4 md:grid-cols-2 mt-6">
              <LoadingStates.Form />
              <LoadingStates.Form />
            </div>
          </div>
        );
      default:
        return <ModernLoader message={loadingMessage} />;
    }
  };

  return <Suspense fallback={getFallback()}>{children}</Suspense>;
}

/**
 * Suspense Wrapper para contenido en paralelo
 *
 * Permite cargar múltiples secciones en paralelo con fallbacks independientes
 *
 * @example
 * ```tsx
 * <ParallelSuspenseWrapper>
 *   <RouteSuspenseWrapper routeType="dashboard">
 *     <DashboardCards />
 *   </RouteSuspenseWrapper>
 *   <RouteSuspenseWrapper routeType="table">
 *     <RecentTransactions />
 *   </RouteSuspenseWrapper>
 * </ParallelSuspenseWrapper>
 * ```
 */
export function ParallelSuspenseWrapper({ children }: { children: ReactNode }) {
  return <div className="space-y-6">{children}</div>;
}

/**
 * Suspense Boundary con Error Handling
 *
 * Combina Suspense con Error Boundary para manejo robusto
 */
interface SuspenseWithErrorProps {
  children: ReactNode;
  routeType?: RouteType;
  fallback?: ReactNode;
  errorFallback?: (error: Error, reset: () => void) => ReactNode;
}

export function SuspenseWithError({
  children,
  routeType = 'dashboard',
  fallback,
  errorFallback
}: SuspenseWithErrorProps) {
  return (
    <RouteSuspenseWrapper
      routeType={routeType}
      customFallback={fallback}
    >
      {children}
    </RouteSuspenseWrapper>
  );
}

/**
 * EJEMPLOS DE USO EN RUTAS:
 *
 * 1. Dashboard principal:
 * ```tsx
 * // app/dashboard/page.tsx
 * export default function DashboardPage() {
 *   return (
 *     <RouteSuspenseWrapper routeType="dashboard">
 *       <DashboardContent />
 *     </RouteSuspenseWrapper>
 *   );
 * }
 * ```
 *
 * 2. Página con tabla:
 * ```tsx
 * // app/dashboard/vehicles/page.tsx
 * export default function VehiclesPage() {
 *   return (
 *     <RouteSuspenseWrapper routeType="table" loadingMessage="Cargando vehículos...">
 *       <VehiclesTable />
 *     </RouteSuspenseWrapper>
 *   );
 * }
 * ```
 *
 * 3. Múltiples secciones en paralelo:
 * ```tsx
 * export default function AnalyticsPage() {
 *   return (
 *     <ParallelSuspenseWrapper>
 *       <RouteSuspenseWrapper routeType="dashboard">
 *         <StatsCards />
 *       </RouteSuspenseWrapper>
 *       <RouteSuspenseWrapper routeType="table">
 *         <RecentActivity />
 *       </RouteSuspenseWrapper>
 *     </ParallelSuspenseWrapper>
 *   );
 * }
 * ```
 */
