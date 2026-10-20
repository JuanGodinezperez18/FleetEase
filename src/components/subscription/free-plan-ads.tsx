"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Sparkles } from 'lucide-react';
import { planShowsAds, type PlanType } from '@/config/plans';
import { adsConfig, isAdsNetworkConfigured } from '@/config/ads';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

function pushAd() {
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch {
    // AdSense no cargó o bloqueador de anuncios.
  }
}

function AdUnit({
  slot,
  format = 'auto',
  className,
  placeholderLabel,
}: {
  slot: string;
  format?: string;
  className?: string;
  placeholderLabel: string;
}) {
  useEffect(() => {
    if (!isAdsNetworkConfigured() || !slot) return;
    pushAd();
  }, [slot]);

  if (!isAdsNetworkConfigured() || !slot) {
    return (
      <div
        className={`flex min-h-[90px] items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.03] px-3 text-center text-xs text-white/40 ${className || ''}`}
      >
        {placeholderLabel}
      </div>
    );
  }

  return (
    <ins
      className={`adsbygoogle block ${className || ''}`}
      style={{ display: 'block' }}
      data-ad-client={adsConfig.clientId}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}

/**
 * Anuncios del plan Free — solo banner en el dashboard (usuarios autenticados).
 * No se muestran en la landing pública (mejor para revisión AdSense y UX).
 * Sin intersticiales / modales a pantalla completa (política de emplazamiento).
 */
export function FreePlanAds() {
  const [plan, setPlan] = useState<PlanType | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

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

  const adsActive = Boolean(plan && planShowsAds(plan) && adsConfig.enabled);

  if (!adsActive || bannerDismissed) return null;

  return (
    <div
      role="complementary"
      aria-label="Anuncio — plan Free"
      className="relative mb-4 overflow-hidden rounded-xl border border-[#d7ff3f]/15 bg-gradient-to-r from-[#0e1117] via-[#12161f] to-[#0e1117] px-4 py-3 shadow-lg"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#d7ff3f]/20 bg-[#d7ff3f]/10 text-[#d7ff3f]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                Anuncio · Plan Free
              </p>
              <p className="mt-0.5 text-sm font-medium text-white/90">
                Free incluye funciones Pro. Actualiza a un plan de pago para quitar anuncios y subir límites.
              </p>
            </div>
          </div>
          <AdUnit
            slot={adsConfig.bannerSlot}
            format="horizontal"
            className="w-full min-h-[90px]"
            placeholderLabel="Espacio publicitario (plan Free). Configura NEXT_PUBLIC_ADSENSE_SLOT_BANNER en Vercel cuando AdSense apruebe el sitio."
          />
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
            onClick={() => setBannerDismissed(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/50 transition hover:bg-white/5 hover:text-white/80"
            aria-label="Cerrar banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
