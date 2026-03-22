'use client';

import { useState, useEffect, useRef, useMemo } from 'react';

interface UseVirtualListOptions {
  itemHeight: number;
  containerHeight: number;
  itemCount: number;
  overscan?: number;
}

export function useVirtualList({
  itemHeight,
  containerHeight,
  itemCount,
  overscan = 3,
}: UseVirtualListOptions) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const virtualItems = useMemo(() => {
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / itemHeight) - overscan
    );
    const endIndex = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const items: Array<{ index: number; offsetTop: number }> = [];
    for (let i = startIndex; i <= endIndex; i++) {
      items.push({
        index: i,
        offsetTop: i * itemHeight,
      });
    }

    return items;
  }, [scrollTop, itemHeight, containerHeight, itemCount, overscan]);

  const totalHeight = itemCount * itemHeight;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  return {
    containerRef,
    virtualItems,
    totalHeight,
  };
}
