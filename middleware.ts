import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { hardenAuthCookieOptions } from '@/lib/security/cookies';

const SECURITY_HEADERS = [
  ['Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload'],
  ['X-Content-Type-Options', 'nosniff'],
  ['X-Frame-Options', 'SAMEORIGIN'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
] as const;

const STAFF_ROLES = new Set(['admin', 'editor', 'viewer', 'super_admin']);

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

  // Ocultar APKs / instaladores: nunca servir binarios de app por la web.
  if (/\\.(apk|xapk|aab|ipa)$/i.test(pathname)) {
    return new Response('Not found', { status: 404 });
  }

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

  const redirectWithSecurityHeaders = (url: URL) =>
    applySecurityHeaders(NextResponse.redirect(url), contentSecurityPolicy);

  // Public static assets need security headers but must not create a
  // pathname.includes('.') authentication bypass for protected app routes.
  const isPublicStaticAsset =
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/fonts/') ||
    /^\\/[^/]+\\.(?:css|js|mjs|map|png|jpe?g|webp|avif|svg|ico|woff2?|ttf|otf)$/i.test(pathname);

  if (pathname.startsWith('/api/') || isPublicStaticAsset) {
    return createResponse();
  }

  const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/registro', '/'];
  const isPublicPath = publicPaths.some(
    path => pathname === path || (path !== '/' && pathname.startsWith(path + '/'))
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
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = createResponse();
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, hardenAuthCookieOptions(options));
          });
        },
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const loginUrl = () => {
    const url = new URL('/login', req.url);
    url.searchParams.set('callbackUrl', pathname);
    return url;
  };

  if (authError || !user) {
    return redirectWithSecurityHeaders(loginUrl());
  }

  // Authentication alone is not sufficient: these layouts intentionally
  // rely on middleware to authorize their role-specific route namespaces.
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role,is_deleted')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile || profile.is_deleted) {
    return redirectWithSecurityHeaders(loginUrl());
  }

  const role = typeof profile.role === 'string' ? profile.role.toLowerCase() : '';
  const isPartnerPath = pathname === '/partner' || pathname.startsWith('/partner/');
  const isClientPath = pathname === '/client' || pathname.startsWith('/client/');
  const isDashboardPath = pathname === '/dashboard' || pathname.startsWith('/dashboard/');

  const homeForRole =
    role === 'partner' ? '/partner' :
    role === 'client' ? '/client' :
    STAFF_ROLES.has(role) ? '/dashboard' :
    '/login';

  if (!homeForRole || homeForRole === '/login') {
    return redirectWithSecurityHeaders(loginUrl());
  }

  // Partner/client accounts are confined to their own portal namespace.
  // This is deny-by-default for other protected page routes, not just /dashboard.
  if (role === 'partner' && !isPartnerPath) {
    return redirectWithSecurityHeaders(new URL('/partner', req.url));
  }

  if (role === 'client' && !isClientPath) {
    return redirectWithSecurityHeaders(new URL('/client', req.url));
  }

  if (isPartnerPath && role !== 'partner') {
    return redirectWithSecurityHeaders(new URL(homeForRole, req.url));
  }

  if (isClientPath && role !== 'client') {
    return redirectWithSecurityHeaders(new URL(homeForRole, req.url));
  }

  if (isDashboardPath && !STAFF_ROLES.has(role)) {
    return redirectWithSecurityHeaders(new URL(homeForRole, req.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!api).*)'],
};
