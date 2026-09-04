"use client";

import { useEffect, useRef } from 'react';

const metricStore: Array<{ name: string; value: number; timestamp: number }> = [];

function logMetric(name: string, metric: { value?: number }) {
  const value = Number(metric.value ?? 0);
  metricStore.push({ name, value, timestamp: Date.now() });
  if (metricStore.length > 100) metricStore.shift();
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[Web Vitals] ${name}: ${value}`);
  }
}

export function usePerformanceMonitor() {
  const mountTimeRef = useRef(Date.now());
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  useEffect(() => {
    mountTimeRef.current = Date.now();
  }, []);

  return {
    mountTime: Date.now() - mountTimeRef.current,
    renderCount: renderCountRef.current,
  };
}

/**
 * Lightweight Web Vitals fallback that does not require an optional package.
 * This keeps production builds deterministic while still collecting the
 * browser's navigation timing when available.
 */
export function useWebVitalsReport() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reportNavigation = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (!navigation) return;

      logMetric('FCP', navigation.responseStart - navigation.startTime);
      logMetric('TTFB', navigation.responseStart - navigation.requestStart);
    };

    if (document.readyState === 'complete') {
      reportNavigation();
      return;
    }

    window.addEventListener('load', reportNavigation, { once: true });
    return () => window.removeEventListener('load', reportNavigation);
  }, []);

  return null;
}
