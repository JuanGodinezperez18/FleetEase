import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Página no encontrada | FleetEase',
  description: 'La página que buscas no existe o fue movida.',
};

/**
 * 404 personalizada de FleetEase.
 * Estilos alineados con los tokens --fe-* (mismo look que /cookies y /privacidad).
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#080a0f] px-5 text-white">
      <div className="w-full max-w-xl text-center">
        <p className="text-sm font-medium uppercase tracking-[0.35em] text-[#d7ff3f]">
          Error 404
        </p>
        <h1 className="mt-6 text-5xl font-semibold tracking-tight sm:text-6xl">
          Página no encontrada
        </h1>
        <p className="mt-5 text-base leading-7 text-white/60">
          La página que buscas no existe, fue movida o el enlace ya no es válido.
          Vuelve al inicio o retoma tu operación desde el dashboard.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center rounded-xl bg-[#d7ff3f] px-6 py-3 text-sm font-semibold text-[#0a0c12] transition hover:brightness-95 sm:w-auto"
          >
            Volver al inicio
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/[0.06] sm:w-auto"
          >
            Ir al dashboard
          </Link>
        </div>

        <p className="mt-10 text-sm text-white/45">
          ¿Crees que esto es un error?{' '}
          <Link href="/privacidad" className="text-[#d7ff3f] underline underline-offset-2">
            Contacta a soporte
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
