'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SparklineProps {
  data: number[];
  className?: string;
  color?: 'blue' | 'green' | 'red' | 'purple' | 'orange';
  height?: number;
  showDots?: boolean;
  animate?: boolean;
}

export function Sparkline({
  data,
  className,
  color = 'blue',
  height = 40,
  showDots = false,
  animate = true,
}: SparklineProps) {
  if (!data || data.length < 2) {
    return null;
  }

  const colors = {
    blue: {
      stroke: 'stroke-blue-500',
      fill: 'fill-blue-500/20',
      dot: 'fill-blue-500',
    },
    green: {
      stroke: 'stroke-green-500',
      fill: 'fill-green-500/20',
      dot: 'fill-green-500',
    },
    red: {
      stroke: 'stroke-red-500',
      fill: 'fill-red-500/20',
      dot: 'fill-red-500',
    },
    purple: {
      stroke: 'stroke-purple-500',
      fill: 'fill-purple-500/20',
      dot: 'fill-purple-500',
    },
    orange: {
      stroke: 'stroke-orange-500',
      fill: 'fill-orange-500/20',
      dot: 'fill-orange-500',
    },
  };

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const width = data.length * 10;
  const padding = 2;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * (width - padding * 2) + padding;
    const y = height - ((value - min) / range) * (height - padding * 2) - padding;
    return { x, y };
  });

  const pathD = points.reduce((acc, point, index) => {
    if (index === 0) {
      return `M ${point.x},${point.y}`;
    }
    return `${acc} L ${point.x},${point.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      className={cn('overflow-visible', className)}
      aria-label="Gráfico de tendencia"
      role="img"
    >
      {/* Area fill */}
      <motion.path
        d={areaD}
        className={cn(colors[color].fill, 'transition-colors')}
        initial={animate ? { opacity: 0 } : undefined}
        animate={animate ? { opacity: 1 } : undefined}
        transition={animate ? { duration: 0.5, delay: 0.2 } : undefined}
      />

      {/* Line */}
      <motion.path
        d={pathD}
        className={cn(colors[color].stroke, 'transition-colors')}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={animate ? { pathLength: 0 } : undefined}
        animate={animate ? { pathLength: 1 } : undefined}
        transition={
          animate
            ? {
                duration: 1,
                ease: 'easeInOut',
              }
            : undefined
        }
      />

      {/* Dots */}
      {showDots &&
        points.map((point, index) => (
          <motion.circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="2"
            className={cn(colors[color].dot, 'transition-colors')}
            initial={animate ? { scale: 0 } : undefined}
            animate={animate ? { scale: 1 } : undefined}
            transition={
              animate
                ? {
                    duration: 0.3,
                    delay: 0.5 + index * 0.05,
                  }
                : undefined
            }
          />
        ))}
    </svg>
  );
}
