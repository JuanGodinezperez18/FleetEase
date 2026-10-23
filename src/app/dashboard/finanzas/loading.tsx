import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-5 p-1 sm:space-y-6" aria-busy="true" aria-label="Cargando finanzas">
      <div className="space-y-3">
        <Skeleton className="h-3 w-20 rounded" />
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-4 w-64 rounded" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-[14px] border border-white/[0.07] bg-[#0e1117] p-5">
            <Skeleton className="mb-4 h-3 w-24 rounded" />
            <Skeleton className="mb-2 h-8 w-28 rounded-lg" />
            <Skeleton className="h-3 w-36 rounded" />
          </div>
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-[14px] border border-white/[0.07] bg-[#0e1117]" />
    </div>
  );
}
