// src/hooks/use-performance-monitor.ts
'use client';

import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  mountTime: number;
  unmountTime?: number;
  renderCount: number;
  lastRenderTime?: number;
}

interface UsePerformanceMonitorOptions {
  componentName: string;
  logOnUnmount?: boolean;
  warnThreshold?: number; // ms
  enabled?: boolean;
}

/**
 * Hook para monitorear rendimiento de componentes
 * - Mide tiempo de mount
 * - Cuenta re-renders
 * - Opcionalmente loguea métricas al desmontar
 */
export function usePerformanceMonitor({
  componentName,
  logOnUnmount = false,
  warnThreshold = 3000,
  enabled = true,
}: UsePerformanceMonitorOptions) {
  const mountTimeRef = useRef<number>(Date.now());
  const renderCountRef = useRef<number>(0);
  const lastRenderTimeRef = useRef<number | undefined>(undefined);
  const metricsRef = useRef<PerformanceMetrics>({
    mountTime: 0,
    renderCount: 0,
  });

  // Registrar render
  useEffect(() => {
    if (!enabled) return;

    renderCountRef.current += 1;
    lastRenderTimeRef.current = Date.now();

    metricsRef.current = {
      mountTime: lastRenderTimeRef.current - mountTimeRef.current,
      renderCount: renderCountRef.current,
      lastRenderTime: lastRenderTimeRef.current,
    };
  });

  // Log al montar
  useEffect(() => {
    if (!enabled) return;

    const mountDuration = Date.now() - mountTimeRef.current;

    if (mountDuration > warnThreshold) {
      console.warn(
        `⚠️ [Performance] ${componentName} tardó ${mountDuration.toFixed(0)}ms en montarse (threshold: ${warnThreshold}ms)`
      );
    } else if (process.env.NODE_ENV === 'development') {
      console.log(
        `✅ [Performance] ${componentName} montado en ${mountDuration.toFixed(0)}ms`
      );
    }
  }, [componentName, warnThreshold, enabled]);

  // Log al desmontar
  useEffect(() => {
    return () => {
      if (!enabled || !logOnUnmount) return;

      const unmountTime = Date.now();
      const totalTime = unmountTime - mountTimeRef.current;

      console.log(
        `[Performance] ${componentName}:`,
        {
          mountTime: metricsRef.current.mountTime,
          totalRenders: metricsRef.current.renderCount,
          totalTime,
          avgRenderTime: totalTime / metricsRef.current.renderCount,
        }
      );
    };
  }, [componentName, logOnUnmount, enabled]);

  // Obtener métricas actuales
  const getMetrics = useCallback((): PerformanceMetrics => {
    return {
      mountTime: Date.now() - mountTimeRef.current,
      unmountTime: undefined,
      renderCount: renderCountRef.current,
      lastRenderTime: lastRenderTimeRef.current,
    };
  }, []);

  // Resetear contador (útil para medir entre acciones)
  const resetMetrics = useCallback(() => {
    renderCountRef.current = 0;
    lastRenderTimeRef.current = undefined;
  }, []);

  return {
    getMetrics,
    resetMetrics,
    mountTime: Date.now() - mountTimeRef.current,
    renderCount: renderCountRef.current,
  };
}

/**
 * Hook para reportar Web Vitals
 */
export function useWebVitalsReport() {
  useEffect(() => {
    // Solo en cliente
    if (typeof window === 'undefined') return;

    // Importar dinámicamente web-vitals si está disponible
    const reportWebVitals = async () => {
      try {
        // Intentar cargar web-vitals si existe
        const { onCLS, onFID, onFCP, onLCP, onTTFB } = await import('web-vitals');

        onCLS((metric) => logMetric('CLS', metric));
        onFID((metric) => logMetric('FID', metric));
        onFCP((metric) => logMetric('FCP', metric));
        onLCP((metric) => logMetric('LCP', metric));
        onTTFB((metric) => logMetric('TTFB', metric));
      } catch (error) {
        // web-vitals no disponible, usar fallback
        console.log('[Web Vitals] Package not available, using fallback');
      }
    };

    reportWebVitals();
  }, []);

  return null;
}

function logMetric(name: string, metric: any) {
  // Log en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${name}:`, metric.value, metric.rating);
  }

  // Enviar a servicio de analytics en producción
  if (process.env.NODE_ENV === 'production') {
    // Aquí iría el código para enviar a Google Analytics, etc.
    // gtag('event', name, { value: metric.value, ... });
  }
}
