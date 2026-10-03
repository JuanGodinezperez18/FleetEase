"use client";

/**
 * Botón para reabrir el panel de preferencias de cookies.
 * Se usa en /cookies y /privacidad ("Gestionar mis preferencias").
 */

import { openCookiePreferences } from '@/lib/cookie-consent';

export function ManageCookiesButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={openCookiePreferences}
      className={
        className ??
        'inline-flex items-center rounded-xl border border-white/15 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.06]'
      }
    >
      Gestionar mis preferencias de cookies
    </button>
  );
}
