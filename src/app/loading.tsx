import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton global para el primer acceso y las rutas fuera del dashboard.
 * El dashboard conserva su propio loading.tsx para mostrar el esqueleto
 * específico de navegación entre módulos.
 */
export default function Loading() {
  return (
    <main
      className="fe-app-shell fe-shell-bg min-h-screen w-full px-4 pb-12 pt-6 sm:px-6 lg:px-8"
      aria-busy="true"
      aria-label="Cargando FleetEase"
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex items-center justify-between border-b fe-border-subtle pb-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-3 w-40 rounded" />
            </div>
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </header>
        <section className="space-y-3">
          <Skeleton className="h-8 w-56 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded" />
        </section>
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="fe-surface-bg rounded-[14px] border fe-border-subtle p-5">
              <Skeleton className="mb-5 h-3 w-24 rounded" />
              <Skeleton className="mb-3 h-8 w-28 rounded-lg" />
              <Skeleton className="h-3 w-36 rounded" />
            </div>
          ))}
        </section>
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="fe-surface-bg h-64 rounded-[14px] border fe-border-subtle p-5">
            <Skeleton className="h-full w-full rounded-xl" />
          </div>
          <div className="fe-surface-bg h-64 rounded-[14px] border fe-border-subtle p-5">
            <Skeleton className="h-full w-full rounded-xl" />
          </div>
        </section>
      </div>
    </main>
  );
}
