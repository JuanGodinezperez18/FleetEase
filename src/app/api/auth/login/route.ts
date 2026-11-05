import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { z } from 'zod';
import { authLimiter, checkRateLimit } from '@/lib/rate-limit';
import { hardenAuthCookieOptions } from '@/lib/security/cookies';

const credentialsSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(1024),
  rememberMe: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }
  const limited = await checkRateLimit(request, authLimiter, 'ip');
  if (limited) return limited;

  let input: z.infer<typeof credentialsSchema>;
  try {
    input = credentialsSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Correo y contraseña son requeridos.' }, { status: 400 });
  }

  const pendingCookies = new Map<string, { name: string; value: string; options?: CookieOptions }>();
  const respond = (body: unknown, status: number) => {
    const response = NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
    for (const { name, value, options } of pendingCookies.values()) {
      const hardened = hardenAuthCookieOptions(options);
      if (!input.rememberMe && hardened.maxAge !== 0) {
        delete hardened.maxAge;
        delete hardened.expires;
      }
      response.cookies.set({ name, value, ...hardened });
    }
    return response;
  };

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies: { name: string; value: string; options?: CookieOptions }[]) => {
          cookies.forEach(cookie => pendingCookies.set(cookie.name, cookie));
        },
      } },
    );
    const { data, error } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
    if (error || !data.user || !data.session) {
      return respond({ error: 'Email o contraseña inválidos.' }, 401);
    }
    const { data: profile, error: profileError } = await supabase.from('users')
      .select('*').eq('id', data.user.id).eq('is_deleted', false).single();
    if (profileError || !profile || profile.is_deleted) {
      await supabase.auth.signOut({ scope: 'local' });
      return respond({ error: 'Perfil de usuario no disponible.' }, 403);
    }
    return respond({ session: data.session, profile }, 200);
  } catch {
    pendingCookies.clear();
    return respond({ error: 'No se pudo iniciar sesión. Intenta de nuevo.' }, 503);
  }
}
