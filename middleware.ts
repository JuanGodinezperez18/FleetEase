import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Assets and API routes are handled by Next.js/API handlers directly.
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Marketing, SEO and authentication routes are public. Keeping these routes
  // outside the auth check is critical for crawlers: sitemap URLs must return
  // their actual 200 content instead of a 307 redirect to /login.
  const publicPaths = [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/registro',
    '/soluciones',
    '/funciones',
    '/software-para-flotillas',
    '/software-para-renta-de-vehiculos',
    '/control-de-mantenimiento-de-flotillas',
  ];
  const isPublicPath = publicPaths.some(
    path => pathname === path || pathname.startsWith(path + '/')
  );

  // Public pages must never wait for a Supabase network round-trip. This is
  // especially important for the PWA start route, where a slow auth service
  // must not leave Android showing only the native splash screen.
  if (isPublicPath) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Protected routes validate the session server-side. A failure redirects to
  // login rather than failing open.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
