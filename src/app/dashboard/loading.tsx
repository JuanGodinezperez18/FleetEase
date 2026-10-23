import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton de navegación entre módulos del dashboard.
 * Se muestra mientras Next resuelve la ruta destino; el layout (sidebar)
 * permanece visible porque este archivo solo sustituye el segmento de página.
 */
export default function Loading() {
  return (
    <div
      className="space-y-5 p-1 sm:space-y-6"
      aria-busy="true"
      aria-label="Cargando módulo"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-11 w-28 rounded-xl" />
          <Skeleton className="h-11 w-32 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[14px] border border-white/[0.07] bg-[#0e1117] p-5"
          >
            <Skeleton className="mb-4 h-3 w-24 rounded" />
            <Skeleton className="mb-2 h-8 w-28 rounded-lg" />
            <Skeleton className="h-3 w-36 rounded" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#0e1117] p-5">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-10 w-56 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
