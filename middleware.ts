import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const SECURITY_HEADERS = [
  ['Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload'],
  ['X-Content-Type-Options', 'nosniff'],
  ['X-Frame-Options', 'SAMEORIGIN'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
] as const;

function applySecurityHeaders(response: NextResponse, contentSecurityPolicy: string) {
  for (const [key, value] of SECURITY_HEADERS) {
    response.headers.set(key, value);
  }
  response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  return response;
}

function buildCsp(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://*.googleapis.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://js.stripe.com${isDev ? " 'unsafe-eval'" : ''};
    script-src-attr 'none';
    script-src-elem 'self' 'nonce-${nonce}' https://*.googleapis.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://js.stripe.com;
    style-src 'self' 'unsafe-inline';
    style-src-attr 'unsafe-inline';
    style-src-elem 'self' 'unsafe-inline';
    img-src 'self' data: blob: https://*.supabase.co https://firebasestorage.googleapis.com https://storage.googleapis.com https://*.googleapis.com https://*.gstatic.com https://lh3.googleusercontent.com https://avatars.githubusercontent.com;
    media-src 'self' blob:;
    manifest-src 'self';
    font-src 'self' data:;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.googleapis.com https://www.google.com/recaptcha/ https://api.stripe.com https://*.stripe.com;
    frame-src 'self' https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/ https://js.stripe.com https://hooks.stripe.com;
    child-src 'self';
    worker-src 'self' blob:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'self';
    upgrade-insecure-requests;
  `;

  const contentSecurityPolicy = cspHeader.replace(/\\s{2,}/g, ' ').trim();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy);

  return { requestHeaders, contentSecurityPolicy };
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const { requestHeaders, contentSecurityPolicy } = buildCsp(req);

  const createResponse = () =>
    applySecurityHeaders(
      NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      }),
      contentSecurityPolicy
    );

  // Security headers must also reach Next.js static assets such as
  // /_next/static/media/*.woff2.
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return createResponse();
  }

  const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/registro', '/'];
  const isPublicPath = publicPaths.some(
    path => pathname === path || pathname.startsWith(path + '/')
  );

  // Public pages must never wait for a Supabase network round-trip.
  if (isPublicPath) {
    return createResponse();
  }

  let response = createResponse();

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
          response = createResponse();
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return applySecurityHeaders(
      NextResponse.redirect(loginUrl),
      contentSecurityPolicy
    );
  }

  return response;
}

export const config = {
  matcher: ['/((?!api).*)'],
};
