import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { hardenAuthCookieOptions } from '@/lib/security/cookies';
import { NextResponse } from 'next/server';

export async function POST() {
  const cookieStore = await cookies();
  let response = NextResponse.json({ status: 'success', message: 'Sesión cerrada exitosamente' });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll().map(({ name, value }) => ({ name, value }));
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set({ name, value, ...hardenAuthCookieOptions(options) });
          }
        },
      },
    }
  );

  try {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      const errorResponse = NextResponse.json({ error: 'Error al cerrar sesión' }, { status: 500 });
      response.cookies.getAll().forEach((cookie) => errorResponse.cookies.set(cookie));
      return errorResponse;
    }
    return response;
  } catch (error) {
    console.error('[Auth] Error en logout:', error);
    const errorResponse = NextResponse.json({ error: 'Error al cerrar sesión' }, { status: 500 });
    response.cookies.getAll().forEach((cookie) => errorResponse.cookies.set(cookie));
    return errorResponse;
  }
}
