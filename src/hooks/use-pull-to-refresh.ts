'use client';

import { useEffect, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  resistance?: number;
  enabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
  enabled = true,
}: UsePullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const element = document.documentElement;

    const handleTouchStart = (e: TouchEvent) => {
      if (element.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || isRefreshing) return;

      currentY.current = e.touches[0].clientY;
      const distance = Math.max(0, currentY.current - startY.current);

      if (distance > 0) {
        // Prevent native pull-to-refresh
        e.preventDefault();

        // Apply resistance
        const resistedDistance = distance / resistance;
        setPullDistance(Math.min(resistedDistance, threshold * 1.5));
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling || isRefreshing) return;

      if (pullDistance >= threshold) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }

      setIsPulling(false);
      setPullDistance(0);
      startY.current = 0;
      currentY.current = 0;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, isPulling, isRefreshing, onRefresh, pullDistance, threshold, resistance]);

  return {
    isPulling,
    isRefreshing,
    pullDistance,
    threshold,
  };
}
