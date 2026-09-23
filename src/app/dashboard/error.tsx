'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

const RETRY_KEY = 'fe_dashboard_route_retry';
const MAX_RETRIES = 2;

function clearClientCachesAndReload() {
  const reload = () => window.location.reload();
  try {
    sessionStorage.setItem(RETRY_KEY, '0');
  } catch {}

  if (!('serviceWorker' in navigator)) {
    reload();
    return;
  }

  navigator.serviceWorker.getRegistrations()
    .then(registrations => Promise.all(registrations.map(reg => reg.unregister())))
    .then(() => ('caches' in window ? caches.keys() : []))
    .then(names => Promise.all(names.map(name => caches.delete(name))))
    .then(reload)
    .catch(reload);
}

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    console.error('[DashboardError] Error de navegación/renderizado:', error);
  }, [error]);

  const handleRetry = () => {
    setRetrying(true);

    let count = 0;
    try {
      count = Number(sessionStorage.getItem(RETRY_KEY) || '0');
      sessionStorage.setItem(RETRY_KEY, String(count + 1));
    } catch {}

    if (count + 1 >= MAX_RETRIES) {
      clearClientCachesAndReload();
      return;
    }

    // Primero reintenta la ruta sin desmontar toda la aplicación.
    reset();
    setTimeout(() => setRetrying(false), 1200);
  };

  return (
    <main className="flex min-h-[70vh] items-center justify-center rounded-[30px] bg-[#080a0f] p-6 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-white/[0.03] p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <h1 className="text-xl font-semibold">No pudimos cargar esta sección</h1>
        <p className="mt-2 text-sm leading-6 text-white/55">
          FleetEase encontró un problema al cargar la ruta. Puedes reintentar sin cerrar la aplicación.
        </p>

        {error?.message && (
          <details className="mt-4 rounded-xl bg-black/20 p-3 text-left text-xs text-white/45">
            <summary className="cursor-pointer font-medium text-white/65">Detalles técnicos</summary>
            <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap">{error.message}</pre>
          </details>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="inline-flex items-center justify-center rounded-xl bg-[#d7ff3f] px-5 py-3 text-sm font-semibold text-[#080a0f] disabled:opacity-60"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
            {retrying ? 'Reintentando…' : 'Reintentar'}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/75 hover:bg-white/5"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </button>
        </div>
      </section>
    </main>
  );
}
