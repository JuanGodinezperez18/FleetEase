"use client";

/**
 * Banner de cookies con consentimiento real (RGPD/ LFPDPPP).
 *
 * - No se muestra si ya existe una decisión vigente y versionada.
 * - "Aceptar todas" / "Solo necesarias" cierran en un clic (sin dark patterns).
 * - "Configurar" permite elegir por categoría antes de guardar.
 * - Reabierto mediante `openCookiePreferences()` (evento COOKIE_PREFERENCES_EVENT).
 * - Sin animaciones: respeta prefers-reduced-motion por defecto.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  COOKIE_PREFERENCES_EVENT,
  openCookiePreferences,
  readCookieConsent,
  writeCookieConsent,
} from '@/lib/cookie-consent';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!readCookieConsent()) {
      setVisible(true);
    }
    const onOpen = () => {
      setShowSettings(true);
      setVisible(true);
    };
    window.addEventListener(COOKIE_PREFERENCES_EVENT, onOpen);
    return () => window.removeEventListener(COOKIE_PREFERENCES_EVENT, onOpen);
  }, []);

  const save = useCallback((next: { analytics: boolean; marketing: boolean }) => {
    writeCookieConsent(next);
    setVisible(false);
    setShowSettings(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Preferencias de cookies"
      className="fixed inset-x-0 bottom-0 z-[80] px-4 pb-4 sm:px-6 sm:pb-6"
    >
      <div
        ref={panelRef}
        className="mx-auto max-w-[980px] rounded-2xl border border-[var(--fe-border)] bg-[var(--fe-panel)] p-5 shadow-2xl sm:p-6"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-[620px]">
            <h2 className="text-base font-semibold text-[var(--fe-text)]">
              Tu privacidad importa
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--fe-text-secondary)]">
              Usamos cookies esenciales para el funcionamiento del sitio. Con tu permiso,
              también usamos cookies analíticas y de marketing para mejorar FleetEase.
              Puedes aceptar todas, rechazar las opcionales o configurar tus preferencias.
              Consulta nuestra{' '}
              <Link href="/cookies" className="text-[var(--fe-link)] underline underline-offset-2">
                Política de Cookies
              </Link>
              .
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => save({ analytics: false, marketing: false })}
              className="rounded-xl border border-[var(--fe-border)] px-4 py-2.5 text-sm font-medium text-[var(--fe-text)] transition hover:bg-[var(--fe-hover)]"
            >
              Solo necesarias
            </button>
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              aria-expanded={showSettings}
              className="rounded-xl border border-[var(--fe-border)] px-4 py-2.5 text-sm font-medium text-[var(--fe-text)] transition hover:bg-[var(--fe-hover)]"
            >
              Configurar
            </button>
            <button
              type="button"
              onClick={() => save({ analytics: true, marketing: true })}
              className="rounded-xl bg-[var(--fe-lime)] px-5 py-2.5 text-sm font-semibold text-[#0a0c12] transition hover:brightness-95"
            >
              Aceptar todas
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="mt-5 space-y-3 border-t border-[var(--fe-border)] pt-4">
            <label className="flex items-start gap-3 text-sm text-[var(--fe-text-secondary)]">
              <input
                type="checkbox"
                checked
                disabled
                className="mt-1 h-4 w-4 accent-[var(--fe-lime)]"
              />
              <span>
                <strong className="text-[var(--fe-text)]">Necesarias</strong> — siempre
                activas: sesión, seguridad y preferencias básicas.
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm text-[var(--fe-text-secondary)]">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[var(--fe-lime)]"
              />
              <span>
                <strong className="text-[var(--fe-text)]">Analíticas</strong> — nos ayudan a
                entender el uso del sitio de forma agregada.
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm text-[var(--fe-text-secondary)]">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[var(--fe-lime)]"
              />
              <span>
                <strong className="text-[var(--fe-text)]">Marketing</strong> — para mostrarte
                contenido relevante sobre FleetEase.
              </span>
            </label>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => save({ analytics, marketing })}
                className="rounded-xl bg-[var(--fe-lime)] px-5 py-2 text-sm font-semibold text-[#0a0c12] transition hover:brightness-95"
              >
                Guardar preferencias
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Acceso re-exportado para páginas (p. ej. /cookies). */
export { openCookiePreferences };
