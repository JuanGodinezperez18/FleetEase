/**
 * Consentimiento de cookies de FleetEase.
 *
 * Modelo simple y auditable:
 *  - `necessary` siempre es true (no requiere consentimiento).
 *  - `analytics` / `marketing` solo se activan con consentimiento explícito.
 *  - La decisión se versiona: si subes COOKIE_CONSENT_VERSION, se vuelve a pedir.
 *
 * El consentimiento se persiste en localStorage (y en cookie como respaldo)
 * y se comunica vía eventos para que cualquier módulo pueda reaccionar
 * (p. ej. cargar scripts de analítica solo tras aceptar).
 */

export type CookieConsent = {
  version: number;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
};

export const COOKIE_CONSENT_VERSION = 1;
export const COOKIE_CONSENT_STORAGE_KEY = 'fleetease-cookie-consent-v1';
export const COOKIE_CONSENT_COOKIE_NAME = 'fe_cookie_consent';
/** Evento emitido cuando el usuario guarda su preferencia. */
export const COOKIE_CONSENT_EVENT = 'fleetease:cookie-consent-changed';
/** Evento para reabrir el panel de preferencias desde cualquier página. */
export const COOKIE_PREFERENCES_EVENT = 'fleetease:open-cookie-preferences';

const CONSENT_MAX_AGE_DAYS = 180;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/** Devuelve el consentimiento guardado o null si no hay decisión vigente. */
export function readCookieConsent(): CookieConsent | null {
  if (!isBrowser()) return null;

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (!raw) {
    const match = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${COOKIE_CONSENT_COOKIE_NAME}=([^;]*)`),
    );
    raw = match ? decodeURIComponent(match[1]) : null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CookieConsent;
    if (parsed?.version !== COOKIE_CONSENT_VERSION) return null;
    if (typeof parsed.analytics !== 'boolean' || typeof parsed.marketing !== 'boolean') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Guarda la decisión del usuario y la emite a la app. */
export function writeCookieConsent(
  consent: Omit<CookieConsent, 'version' | 'necessary' | 'decidedAt'>,
): CookieConsent {
  const full: CookieConsent = {
    version: COOKIE_CONSENT_VERSION,
    necessary: true,
    analytics: consent.analytics,
    marketing: consent.marketing,
    decidedAt: new Date().toISOString(),
  };

  if (isBrowser()) {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(full));
    } catch {
      // localStorage puede fallar en modo privado: la cookie de respaldo cubre.
    }
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie =
      `${COOKIE_CONSENT_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(full))}` +
      `; Path=/; Max-Age=${CONSENT_MAX_AGE_DAYS * 24 * 60 * 60}; SameSite=Lax${secure}`;
    window.dispatchEvent(
      new CustomEvent<CookieConsent>(COOKIE_CONSENT_EVENT, { detail: full }),
    );
  }

  return full;
}

/** Reabre el banner en modo configuración (desde /cookies, footer, etc.). */
export function openCookiePreferences(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(COOKIE_PREFERENCES_EVENT));
}
