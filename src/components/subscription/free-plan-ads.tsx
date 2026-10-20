"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, Sparkles } from 'lucide-react';
import { planShowsAds, type PlanType } from '@/config/plans';
import { adsConfig, isAdsNetworkConfigured } from '@/config/ads';

const ROUTE_COUNT_KEY = 'fleetease_ads_route_count';
const LAST_INTERSTITIAL_KEY = 'fleetease_ads_last_interstitial';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

function loadAdSenseScript(clientId: string) {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`script[data-ad-client="${clientId}"]`)) return;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
  script.crossOrigin = 'anonymous';
  script.dataset.adClient = clientId;
  document.head.appendChild(script);
}

function pushAd() {
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch {
    // AdSense no cargó o bloqueador de anuncios.
  }
}

/** Unidad AdSense o placeholder si aún no hay client/slot configurados. */
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
  const ref = useRef<HTMLModElement>(null);

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
      ref={ref}
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
 * Sistema de anuncios del plan Free:
 * 1) Banner superior persistente (cerrable por sesión).
 * 2) Intersticial (modal) cada N cambios de ruta, con cooldown en segundos.
 * No se usa video forzado; AdSense puede servir display o video según su red.
 */
export function FreePlanAds() {
  const pathname = usePathname();
  const [plan, setPlan] = useState<PlanType | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [closeCountdown, setCloseCountdown] = useState(0);
  const prevPathRef = useRef<string | null>(null);

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

  useEffect(() => {
    if (!adsActive || !adsConfig.clientId) return;
    loadAdSenseScript(adsConfig.clientId);
  }, [adsActive]);

  const tryShowInterstitial = useCallback(() => {
    if (typeof window === 'undefined') return;
    const now = Date.now();
    const last = Number(sessionStorage.getItem(LAST_INTERSTITIAL_KEY) || '0');
    const minMs = adsConfig.interstitialMinSeconds * 1000;
    if (now - last < minMs) return;

    let count = Number(sessionStorage.getItem(ROUTE_COUNT_KEY) || '0') + 1;
    sessionStorage.setItem(ROUTE_COUNT_KEY, String(count));

    if (count >= adsConfig.interstitialEveryNRoutes) {
      sessionStorage.setItem(ROUTE_COUNT_KEY, '0');
      sessionStorage.setItem(LAST_INTERSTITIAL_KEY, String(now));
      setCloseCountdown(adsConfig.interstitialClosableAfterSeconds);
      setShowInterstitial(true);
    }
  }, []);

  // Contar navegaciones dentro del dashboard para el intersticial.
  useEffect(() => {
    if (!adsActive) return;
    if (prevPathRef.current === null) {
      prevPathRef.current = pathname;
      return;
    }
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      tryShowInterstitial();
    }
  }, [pathname, adsActive, tryShowInterstitial]);

  useEffect(() => {
    if (!showInterstitial || closeCountdown <= 0) return;
    const t = setTimeout(() => setCloseCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [showInterstitial, closeCountdown]);

  if (!adsActive) return null;

  return (
    <>
      {!bannerDismissed && (
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
                    Free incluye funciones Pro. Actualiza a un plan de pago para quitar anuncios y subir límites (más vehículos y usuarios).
                  </p>
                </div>
              </div>
              <AdUnit
                slot={adsConfig.bannerSlot}
                format="horizontal"
                className="w-full min-h-[90px]"
                placeholderLabel="Banner publicitario (configura NEXT_PUBLIC_ADSENSE_CLIENT_ID y SLOT_BANNER en Vercel)"
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
      )}

      {showInterstitial && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Anuncio intersticial"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0e1117] p-5 shadow-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
              Anuncio · Plan Free
            </p>
            <p className="mt-2 text-sm text-white/70">
              Este espacio mantiene FleetEase gratis. Los planes de pago no muestran anuncios.
            </p>
            <div className="mt-4">
              <AdUnit
                slot={adsConfig.interstitialSlot || adsConfig.bannerSlot}
                format="rectangle"
                className="min-h-[250px] w-full"
                placeholderLabel="Anuncio intersticial (configura NEXT_PUBLIC_ADSENSE_SLOT_INTERSTITIAL)"
              />
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <Link
                href="/dashboard/settings/subscription"
                className="text-xs font-medium text-[#d7ff3f] hover:underline"
              >
                Quitar anuncios con un plan de pago
              </Link>
              <button
                type="button"
                disabled={closeCountdown > 0}
                onClick={() => setShowInterstitial(false)}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-white/10 px-4 text-xs font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {closeCountdown > 0 ? `Cerrar en ${closeCountdown}s` : 'Cerrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
