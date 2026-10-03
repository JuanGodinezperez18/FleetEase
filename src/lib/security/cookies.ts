/**
 * Endurecimiento de cookies de sesión para FleetEase.
 *
 * Contexto arquitectónico importante: la app usa `createBrowserClient` de
 * `@supabase/ssr` (src/lib/supabase-browser.ts), que lee/escribe las cookies
 * de sesión desde JavaScript en el navegador. Por eso las cookies de auth
 * NO pueden ser `httpOnly` (rompería la sesión del cliente y el refresh token).
 *
 * Lo que sí se fuerza siempre, sin excepción:
 *  - `secure` en producción (nunca viajan por HTTP plano)
 *  - `sameSite: 'lax'` explícito (mitiga CSRF en envíos cross-site)
 *  - `path: '/'` explícito
 *
 * Para cookies propias que el navegador NO necesita leer, usar
 * `hardenServerCookieOptions` (httpOnly: true).
 */

import type { CookieOptions } from '@supabase/ssr';

const isProduction = process.env.NODE_ENV === 'production';

/** Cookies de sesión Supabase: endurecidas pero legibles por el cliente SSR. */
export function hardenAuthCookieOptions(
  options?: CookieOptions,
): Required<Pick<CookieOptions, 'path' | 'sameSite' | 'secure' | 'httpOnly'>> &
  CookieOptions {
  return {
    ...options,
    path: options?.path ?? '/',
    sameSite: 'lax',
    secure: isProduction,
    // Requerido por createBrowserClient (@supabase/ssr): ver docstring.
    httpOnly: false,
  };
}

/** Cookies propias de solo servidor: httpOnly real. */
export function hardenServerCookieOptions(
  options?: CookieOptions,
): Required<Pick<CookieOptions, 'path' | 'sameSite' | 'secure' | 'httpOnly'>> &
  CookieOptions {
  return {
    ...options,
    path: options?.path ?? '/',
    sameSite: 'lax',
    secure: isProduction,
    httpOnly: true,
  };
}
