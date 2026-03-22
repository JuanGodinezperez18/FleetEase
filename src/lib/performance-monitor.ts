/**
 * Sistema de monitoreo de rendimiento
 *
 * Rastrea y optimiza:
 * - Queries de Firestore
 * - Tiempos de carga de componentes
 * - Uso de caché
 * - Detecta queries innecesarias
 */

interface QueryMetrics {
  queryKey: string;
  executionTime: number;
  cacheHit: boolean;
  timestamp: number;
  documentsRead: number;
}

interface PerformanceReport {
  totalQueries: number;
  cacheHitRate: number;
  averageQueryTime: number;
  totalDocumentsRead: number;
  slowQueries: QueryMetrics[];
  suggestions: string[];
}

class PerformanceMonitor {
  private metrics: QueryMetrics[] = [];
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'development';
  }

  trackQuery(
    queryKey: string,
    startTime: number,
    documentsRead: number,
    cacheHit: boolean
  ) {
    if (!this.isEnabled) return;

    const executionTime = performance.now() - startTime;

    this.metrics.push({
      queryKey,
      executionTime,
      cacheHit,
      timestamp: Date.now(),
      documentsRead,
    });

    // Alertar queries lentas
    if (executionTime > 1000) {
      console.warn(
        `🐌 Query lenta detectada: ${queryKey} (${executionTime.toFixed(2)}ms, ${documentsRead} docs)`
      );
    }

    // Alertar queries grandes
    if (documentsRead > 100) {
      console.warn(
        `📚 Query grande detectada: ${queryKey} (${documentsRead} documentos). Considera paginación.`
      );
    }
  }

  getReport(): PerformanceReport {
    if (this.metrics.length === 0) {
      return {
        totalQueries: 0,
        cacheHitRate: 0,
        averageQueryTime: 0,
        totalDocumentsRead: 0,
        slowQueries: [],
        suggestions: [],
      };
    }

    const totalQueries = this.metrics.length;
    const cacheHits = this.metrics.filter(m => m.cacheHit).length;
    const cacheHitRate = (cacheHits / totalQueries) * 100;
    const averageQueryTime =
      this.metrics.reduce((sum, m) => sum + m.executionTime, 0) / totalQueries;
    const totalDocumentsRead = this.metrics.reduce(
      (sum, m) => sum + m.documentsRead,
      0
    );

    // Queries lentas (>500ms)
    const slowQueries = this.metrics
      .filter(m => m.executionTime > 500)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    // Generar sugerencias
    const suggestions: string[] = [];

    if (cacheHitRate < 50) {
      suggestions.push(
        '⚠️ Baja tasa de caché (< 50%). Aumenta staleTime en tus queries.'
      );
    }

    if (averageQueryTime > 300) {
      suggestions.push(
        '⚠️ Tiempo promedio de query alto. Considera agregar índices en Firestore.'
      );
    }

    if (totalDocumentsRead > 1000) {
      suggestions.push(
        '⚠️ Alto número de documentos leídos. Implementa paginación o filtros más específicos.'
      );
    }

    // Detectar queries duplicadas
    const queryKeyCount = new Map<string, number>();
    this.metrics.forEach(m => {
      queryKeyCount.set(m.queryKey, (queryKeyCount.get(m.queryKey) || 0) + 1);
    });

    const duplicates = Array.from(queryKeyCount.entries())
      .filter(([_, count]) => count > 3)
      .sort((a, b) => b[1] - a[1]);

    if (duplicates.length > 0) {
      suggestions.push(
        `⚠️ Queries duplicadas detectadas: ${duplicates.map(([key, count]) => `${key} (${count}x)`).join(', ')}`
      );
    }

    return {
      totalQueries,
      cacheHitRate,
      averageQueryTime,
      totalDocumentsRead,
      slowQueries,
      suggestions,
    };
  }

  printReport() {
    if (!this.isEnabled) return;

    const report = this.getReport();

    console.group('📊 Performance Report');
    console.log(`Total Queries: ${report.totalQueries}`);
    console.log(`Cache Hit Rate: ${report.cacheHitRate.toFixed(2)}%`);
    console.log(`Average Query Time: ${report.averageQueryTime.toFixed(2)}ms`);
    console.log(`Total Documents Read: ${report.totalDocumentsRead}`);

    if (report.slowQueries.length > 0) {
      console.group('🐌 Slowest Queries');
      report.slowQueries.forEach(q => {
        console.log(
          `${q.queryKey}: ${q.executionTime.toFixed(2)}ms (${q.documentsRead} docs)`
        );
      });
      console.groupEnd();
    }

    if (report.suggestions.length > 0) {
      console.group('💡 Suggestions');
      report.suggestions.forEach(s => console.log(s));
      console.groupEnd();
    }

    console.groupEnd();
  }

  reset() {
    this.metrics = [];
  }

  // Calcular costos estimados de Firestore
  estimateCost(): { reads: number; cost: number } {
    const totalReads = this.metrics.reduce((sum, m) => sum + m.documentsRead, 0);

    // Pricing de Firestore (aproximado)
    // Primeros 50,000 reads/día: gratis
    // Después: $0.06 por 100,000 reads
    const freeReads = 50000;
    const billableReads = Math.max(0, totalReads - freeReads);
    const cost = (billableReads / 100000) * 0.06;

    return { reads: totalReads, cost };
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Helper para medir componentes
export function measureComponentRender(componentName: string) {
  const startTime = performance.now();

  return () => {
    const renderTime = performance.now() - startTime;
    if (process.env.NODE_ENV === 'development' && renderTime > 100) {
      console.warn(
        `⏱️ Slow render: ${componentName} took ${renderTime.toFixed(2)}ms`
      );
    }
  };
}

// Hook para medir renders en React 19
export function useRenderTracking(componentName: string) {
  if (process.env.NODE_ENV !== 'development') return;

  const startTime = performance.now();

  // Cleanup function
  return () => {
    const renderTime = performance.now() - startTime;
    if (renderTime > 50) {
      console.warn(
        `⏱️ ${componentName} render: ${renderTime.toFixed(2)}ms`
      );
    }
  };
}

// Utility para debug de re-renders
export function useWhyDidYouUpdate(name: string, props: Record<string, any>) {
  if (process.env.NODE_ENV !== 'development') return;

  const previousProps = useRef<Record<string, any> | undefined>(undefined);

  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: Record<string, { from: any; to: any }> = {};

      allKeys.forEach(key => {
        if (previousProps.current![key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current![key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changedProps).length > 0) {
        console.log(`[why-did-you-update] ${name}`, changedProps);
      }
    }

    previousProps.current = props;
  });
}

import { useEffect, useRef } from 'react';

// Export performance utilities
export const PerformanceUtils = {
  monitor: performanceMonitor,
  measureRender: measureComponentRender,
  trackRender: useRenderTracking,
  debugProps: useWhyDidYouUpdate,
};
