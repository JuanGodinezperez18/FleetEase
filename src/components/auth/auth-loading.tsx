"use client";

import { Skeleton } from "@/components/ui/skeleton";

/** Auth-specific loading state; deliberately avoids dashboard-shaped placeholders. */
export function AuthLoading() {
  return (
    <main
      className="fleetease-auth-modern dark flex min-h-screen items-center justify-center bg-[#080a0f] px-4 py-10 text-white"
      aria-busy="true"
      aria-live="polite"
      aria-label="Cargando autenticación de FleetEase"
    >
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <Skeleton className="mx-auto mb-4 h-2 w-16 rounded" />
          <Skeleton className="mx-auto h-9 w-56 rounded-lg" />
          <Skeleton className="mx-auto mt-3 h-4 w-44 rounded" />
        </div>
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
          <Skeleton className="mx-auto h-6 w-36 rounded-md" />
          <Skeleton className="mx-auto mt-3 h-4 w-48 rounded" />
          <div className="mt-7 space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-3 w-28 rounded" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="mx-auto h-4 w-40 rounded" />
          </div>
        </div>
      </div>
    </main>
  );
}
