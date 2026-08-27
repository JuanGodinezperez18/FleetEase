import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { logger } from '@/lib/logger';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Permitir APIs y archivos estáticos
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. Páginas públicas
  const publicPaths = ['/login', '/register', '/forgot-password', '/registro', '/'];
  const isPublicPath = publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'));

  // 3. Crear cliente de Supabase para el servidor
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // 4. Verificar sesión
  const { data: { session }, error } = await supabase.auth.getSession();

  // 5. Si es ruta pública
  if (isPublicPath) {
    // Si ya tiene sesión válida y está en login/register, redirigir al dashboard
    if (session?.user && (pathname === '/login' || pathname === '/register' || pathname === '/registro')) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return res;
  }

  // 6. Es ruta protegida, verificar sesión
  if (!session?.user) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 7. Obtener perfil del usuario para verificar roles
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('role, company_id')
    .eq('id', session.user.id)
    .eq('is_deleted', false)
    .single();

  if (profileError || !userProfile) {
    logger.error('[Middleware] Error obteniendo perfil:', profileError);
    const response = NextResponse.redirect(new URL('/login', req.url));
    response.cookies.delete('sb-access-token');
    response.cookies.delete('sb-refresh-token');
    return response;
  }

  const userRole = userProfile.role;

  // 8. Protección por rol
  if (pathname.startsWith('/dashboard') && !['admin', 'editor', 'super_admin'].includes(userRole)) {
    logger.warn('[Middleware] Acceso denegado a dashboard', { role: userRole });
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (pathname.startsWith('/partner') && userRole !== 'partner') {
    logger.warn('[Middleware] Acceso denegado a partner', { role: userRole });
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (pathname.startsWith('/client') && userRole !== 'client') {
    logger.warn('[Middleware] Acceso denegado a client', { role: userRole });
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
