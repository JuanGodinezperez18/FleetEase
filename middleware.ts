import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/registro', '/'];
  const isPublicPath = publicPaths.some(
    path => pathname === path || pathname.startsWith(path + '/')
  );

  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // getUser() valida/renueva la sesión correctamente en SSR. getSession()
  // puede devolver una sesión que el servidor todavía no tiene sincronizada
  // en cookies y provocaba el falso retorno a /login?callbackUrl=/dashboard.
  const { data: { user }, error } = await supabase.auth.getUser();

  if (isPublicPath) {
    // Las páginas públicas siempre deben poder abrirse. En particular,
    // /reset-password necesita recibir el callback de recuperación de Auth.
    return response;
  }

  if (error || !user) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // La autenticación de ruta queda separada de la autorización de datos.
  // No consultamos `users` desde middleware porque esa consulta está sujeta
  // a RLS y podía fallar aunque la sesión de Auth fuera válida, provocando un
  // redirect loop. Las tablas/RLS siguen siendo la barrera de seguridad real;
  // el Dashboard valida el rol del perfil antes de mostrar funciones sensibles.
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
