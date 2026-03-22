"use client";

import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

export function GlobalLoader() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-32 w-screen">
      <div className="bg-white dark:bg-slate-950/50 border-b border-gray-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {/* Header skeleton */}
          <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-1/4"></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full">
        {/* Grid skeleton con mismo ancho que el contenido real */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-max">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-gray-200 dark:bg-slate-700 rounded-lg h-32 animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
