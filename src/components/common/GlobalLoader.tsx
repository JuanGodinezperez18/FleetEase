"use client";

import { Skeleton } from '@/components/ui/skeleton';

export function GlobalLoader() {
  return (
    <div
      className="fe-app-shell min-h-screen w-full bg-[#080a0f] px-4 pb-12 pt-6 text-white sm:px-6 lg:px-8"
      aria-busy="true"
      aria-label="Cargando FleetEase"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex items-center justify-between border-b border-white/[0.06] pb-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-3 w-40 rounded" />
            </div>
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-8 w-56 rounded-lg" />
            <Skeleton className="h-4 w-72 rounded" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/[0.07] bg-[#0e1117]/80 p-5"
            >
              <Skeleton className="mb-5 h-3 w-24 rounded" />
              <Skeleton className="mb-3 h-8 w-28 rounded-lg" />
              <Skeleton className="h-3 w-36 rounded" />
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-64 rounded-2xl border border-white/[0.07] bg-[#0e1117]/80 p-5">
            <Skeleton className="h-full w-full rounded-xl" />
          </div>
          <div className="h-64 rounded-2xl border border-white/[0.07] bg-[#0e1117]/80 p-5">
            <Skeleton className="h-full w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
