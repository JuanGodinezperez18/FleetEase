'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
  enabled?: boolean;
}

export function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
  enabled = true,
}: PullToRefreshProps) {
  const { isPulling, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh,
    threshold,
    enabled,
  });

  const progress = Math.min(pullDistance / threshold, 1);
  const shouldShowIndicator = isPulling || isRefreshing;

  return (
    <div className="relative">
      <AnimatePresence>
        {shouldShowIndicator && (
          <motion.div
            className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
            initial={{ y: -60 }}
            animate={{ y: isPulling ? pullDistance - 60 : 0 }}
            exit={{ y: -60 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div
              className={cn(
                'bg-primary text-primary-foreground rounded-full p-3 shadow-lg',
                'flex items-center justify-center',
                'transition-all duration-200'
              )}
              style={{
                transform: `scale(${0.7 + progress * 0.3})`,
                opacity: progress,
              }}
            >
              <motion.div
                animate={{
                  rotate: isRefreshing ? 360 : progress * 180,
                }}
                transition={{
                  rotate: isRefreshing
                    ? {
                        repeat: Infinity,
                        duration: 1,
                        ease: 'linear',
                      }
                    : {
                        duration: 0.2,
                      },
                }}
              >
                <RefreshCw className="w-5 h-5" />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {children}
    </div>
  );
}
