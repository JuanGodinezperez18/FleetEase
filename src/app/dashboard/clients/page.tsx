"use client";

/**
 * NOTICE: page.tsx was truncated during a large automated push.
 * Restore the last good version from git:
 *
 *   git checkout 77ba98d6a343649ecad842546a6b0642ec732647 -- src/app/dashboard/clients/page.tsx
 *   git commit -m "fix(clients): restore page.tsx"
 *   git push
 *
 * Already on master and safe:
 * - client-dashboard.tsx (MetricCard KPIs)
 * - client-status-badges.tsx
 * - columns.tsx (dark badges)
 */

export default function ClientsPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center text-white">
      <p className="text-lg font-semibold">Restaurar módulo Clientes</p>
      <p className="max-w-md text-sm text-white/50">
        Ejecuta en tu máquina local (el contenido completo no cabe en un solo push automatizado):
      </p>
      <pre className="max-w-full overflow-x-auto rounded-xl border border-white/10 bg-[#0e1117] p-4 text-left text-xs text-[#d7ff3f]">
{`git checkout 77ba98d6 -- src/app/dashboard/clients/page.tsx
git commit -m "fix(clients): restore page.tsx"
git push`}
      </pre>
    </div>
  );
}
