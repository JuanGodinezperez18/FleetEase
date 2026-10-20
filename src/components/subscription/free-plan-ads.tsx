"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Sparkles } from 'lucide-react';
import { planShowsAds, type PlanType } from '@/config/plans';

/**
 * Banner de anuncios para el plan Free.
 * Es la forma de monetizar el plan gratuito permanente.
 * Los planes de pago (Starter/Pro/Enterprise) no muestran anuncios.
 *
 * Placeholder listo para conectar AdSense / red de anuncios:
 * sustituye el contenido interior por el script del proveedor cuando esté listo.
 */
export function FreePlanAds() {
  const [plan, setPlan] = useState<PlanType | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/stripe/status', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && data.success && data.plan) {
          setPlan(data.plan as PlanType);
        }
      } catch {
        if (!cancelled) setPlan('free');
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!plan || !planShowsAds(plan) || dismissed) return null;

  return (
    <div
      role="complementary"
      aria-label="Anuncio — plan Free"
      className="relative mb-4 overflow-hidden rounded-xl border border-[#d7ff3f]/15 bg-gradient-to-r from-[#0e1117] via-[#12161f] to-[#0e1117] px-4 py-3 shadow-lg"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#d7ff3f]/20 bg-[#d7ff3f]/10 text-[#d7ff3f]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
              Anuncio · Plan Free
            </p>
            <p className="mt-0.5 text-sm font-medium text-white/90">
              Estás en Free con todas las funciones operativas. Actualiza a Starter o Pro para quitar anuncios y aumentar límites.
            </p>
            <p className="mt-1 text-xs text-white/45">
              {/* Slot publicitario: aquí se inyectará el creativo de la red de anuncios */}
              Espacio publicitario — configura tu red de anuncios (AdSense u otra) en este componente.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/dashboard/settings/subscription"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-[#d7ff3f] px-3 text-xs font-semibold text-black transition hover:bg-[#c8f02e]"
          >
            Quitar anuncios
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/50 transition hover:bg-white/5 hover:text-white/80"
            aria-label="Cerrar anuncio"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
