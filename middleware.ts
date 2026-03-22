import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { admin } from '@/lib/server/firebase-admin';
import { logger } from '@/lib/logger';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isDev = process.env.NODE_ENV === 'development';

  // 🚧 MODO DESARROLLO: Bypass temporal del middleware
  const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_SESSION_COOKIE === 'true';

  if (bypassAuth) {
    if (isDev) logger.warn('[Middleware] MODO DESARROLLO: Bypass activado');
    return NextResponse.next();
  }

  // 1. Permitir APIs y archivos estáticos
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. Páginas públicas
  const publicPaths = ['/login', '/register', '/forgot-password'];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // 3. Obtener session cookie
  const sessionCookie = req.cookies.get('session')?.value;

  // 4. Si es ruta pública, permitir el paso
  if (isPublicPath) {
    // Si ya tiene sesión, redirigir al dashboard para evitar ver el login de nuevo
    if (sessionCookie) {
      try {
        const decodedToken = await admin.auth().verifySessionCookie(sessionCookie, true);
        if (decodedToken) {
          return NextResponse.redirect(new URL('/dashboard', req.url));
        }
      } catch (error) {
        // La cookie es inválida, limpiarla y dejar que continúe a la página pública
        const response = NextResponse.next();
        response.cookies.delete('session');
        return response;
      }
    }
    return NextResponse.next();
  }

  // 5. Es ruta protegida, verificar cookie
  if (!sessionCookie) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Verificar sesión directamente con Firebase Admin
    const decodedToken = await admin.auth().verifySessionCookie(sessionCookie, true);
    const userRole = decodedToken.role as string;

    // Protección por rol
    if (pathname.startsWith('/dashboard') && !['admin', 'editor', 'superAdmin'].includes(userRole)) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (pathname.startsWith('/partner') && userRole !== 'partner') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (pathname.startsWith('/client') && userRole !== 'client') {
      return NextResponse.redirect(new URL('/login', req.url));
    }

  } catch (error) {
    logger.error('[Middleware] Error en verificación', error as Error);
    const response = NextResponse.redirect(new URL('/login', req.url));
    response.cookies.delete('session');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
