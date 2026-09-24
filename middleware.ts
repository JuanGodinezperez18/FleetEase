import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const SECURITY_HEADERS = [
  ['Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload'],
  ['X-Content-Type-Options', 'nosniff'],
  ['X-Frame-Options', 'SAMEORIGIN'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
] as const;

function applySecurityHeaders(response: NextResponse) {
  for (const [key, value] of SECURITY_HEADERS) {
    response.headers.set(key, value);
  }
  return response;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Security headers must also reach Next.js static assets such as
  // /_next/static/media/*.woff2. The previous matcher excluded these paths,
  // so a CDN/static response could miss HSTS even though vercel.json and
  // next.config.mjs declared it.
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return applySecurityHeaders(NextResponse.next());
  }

  const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/registro', '/'];
  const isPublicPath = publicPaths.some(
    path => pathname === path || pathname.startsWith(path + '/')
  );

  // Public pages must never wait for a Supabase network round-trip. This is
  // especially important for the PWA start route, where a slow auth service
  // must not leave Android showing only the native splash screen.
  if (isPublicPath) {
    return applySecurityHeaders(NextResponse.next());
  }

  let response = applySecurityHeaders(NextResponse.next({ request: req }));

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
          response = applySecurityHeaders(NextResponse.next({ request: req }));
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
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  return applySecurityHeaders(response);
}

export const config = {
  // Include static assets so the middleware can enforce security headers on
  // files served from /_next/static as well as application routes.
  matcher: ['/((?!api).*)'],
};
