/**
 * Endurecimiento de opciones de cookies para FleetEase.
 *
 * - Secure: siempre en producción (HTTPS).
 * - SameSite: lax (equilibrio entre CSRF y flujos OAuth/redirect).
 * - path: /
 *
 * Nota importante sobre httpOnly:
 * Las cookies de sesión de Supabase Auth usadas por `createBrowserClient`
 * (@supabase/ssr) deben ser legibles desde JavaScript del navegador.
 * Por eso `httpOnly` se deja en `false` para las cookies de auth.
 * Las cookies de servidor (consentimiento, preferencias, etc.) sí pueden
 * (y deben) ser httpOnly cuando no necesitan ser leídas por el cliente.
 */

export type CookieOptions = {
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
};

const isProd = process.env.NODE_ENV === 'production';

/**
 * Opciones para cookies de autenticación (Supabase SSR / browser client).
 * httpOnly = false (requerido por createBrowserClient).
 */
export function hardenAuthCookieOptions(
  opts: CookieOptions = {},
): CookieOptions {
  return {
    path: '/',
    sameSite: 'lax',
    secure: isProd,
    httpOnly: false,
    ...opts,
    // Forzar de nuevo por si opts sobrescribe de forma insegura
    path: opts.path ?? '/',
    sameSite: opts.sameSite ?? 'lax',
    secure: opts.secure ?? isProd,
    httpOnly: false,
  };
}

/**
 * Opciones para cookies de servidor (consentimiento, flags, etc.).
 * httpOnly = true por defecto.
 */
export function hardenServerCookieOptions(
  opts: CookieOptions = {},
): CookieOptions {
  return {
    path: '/',
    sameSite: 'lax',
    secure: isProd,
    httpOnly: true,
    ...opts,
    path: opts.path ?? '/',
    sameSite: opts.sameSite ?? 'lax',
    secure: opts.secure ?? isProd,
    httpOnly: opts.httpOnly ?? true,
  };
}
