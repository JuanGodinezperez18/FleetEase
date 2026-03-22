'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

interface SuccessAnimationProps {
  size?: 'sm' | 'md' | 'lg';
  onComplete?: () => void;
}

export function SuccessAnimation({ size = 'md', onComplete }: SuccessAnimationProps) {
  const sizes = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <motion.div
      className="flex items-center justify-center"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
      }}
      onAnimationComplete={onComplete}
    >
      <motion.div
        className={`${sizes[size]} rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center`}
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{
          duration: 0.5,
          times: [0, 0.6, 1],
          ease: 'easeOut',
        }}
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            delay: 0.2,
            duration: 0.3,
            ease: 'easeOut',
          }}
        >
          <CheckCircle2 className={`${iconSizes[size]} text-green-600 dark:text-green-400`} />
        </motion.div>
      </motion.div>

      {/* Ripple effect */}
      <motion.div
        className={`${sizes[size]} rounded-full border-2 border-green-400 absolute`}
        initial={{ scale: 1, opacity: 0.6 }}
        animate={{ scale: 2, opacity: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </motion.div>
  );
}
