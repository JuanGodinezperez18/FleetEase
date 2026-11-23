import { parseCookieHeader, serializeCookieHeader, type CookieOptions } from '@supabase/ssr';
import { AUTH_PERSISTENCE_COOKIE, hardenAuthCookieOptions } from '@/lib/security/cookies';

export const authBrowserCookies = {
  getAll() {
    if (typeof document === 'undefined') return [];
    return parseCookieHeader(document.cookie).map(({ name, value }) => ({ name, value: value ?? '' }));
  },
  setAll(cookies: { name: string; value: string; options: CookieOptions }[]) {
    if (typeof document === 'undefined') return;
    const persistence = authBrowserCookies.getAll().find(cookie => cookie.name === AUTH_PERSISTENCE_COOKIE)?.value;
    for (const { name, value, options } of cookies) {
      document.cookie = serializeCookieHeader(name, value, hardenAuthCookieOptions(options, persistence));
    }
  },
};
