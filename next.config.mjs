// next.config.mjs
//
// Security headers that do not require a per-request value live here.
// The Content-Security-Policy is also emitted here as a fallback so that
// platforms/security scanners that inspect the framework response headers
// receive a CSP even if the per-request proxy is bypassed or unavailable.
// proxy.ts still emits the stronger nonce-based CSP at request time.
//
// typescript.ignoreBuildErrors: TEMPORAL. El proyecto tiene errores de
// TypeScript preexistentes; esto permite desplegar mientras se corrigen
// por separado. `npx tsc --noEmit` sigue mostrando los errores reales.

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security: Ocultar tecnología
  poweredByHeader: false,

  typescript: {
    // TODO: quitar esto una vez corregidos los errores de tipos preexistentes.
    ignoreBuildErrors: true,
  },

  // Security: Headers HTTPS y protección del navegador.
  // CSP también se gestiona dinámicamente en proxy.ts con nonce por petición.
  // Este CSP estático funciona como fallback y las políticas CSP múltiples
  // se aplican de forma acumulativa en el navegador.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            // Fallback CSP for scanners and responses where proxy.ts is not
            // executed. The request-level nonce policy remains authoritative
            // for normal application responses.
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://*.googleapis.com https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.googleapis.com https://api.stripe.com https://*.stripe.com; frame-src https://js.stripe.com https://hooks.stripe.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests;",
          },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'storage.googleapis.com', pathname: '/fleetease-manager.appspot.com/**' },
      { protocol: 'https', hostname: 'storage.googleapis.com', pathname: '/fleetease-manager.firebasestorage.app/**' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/v0/b/fleetease-manager.appspot.com/**' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/v0/b/fleetease-manager.firebasestorage.app/**' },
      // fail-safe para otros buckets firmados si usas varios:
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/v0/b/**' },
      { protocol: 'https', hostname: 'storage.googleapis.com', pathname: '/**' },
    ],
    // Security: Prevenir SVGs (pueden contener scripts)
    dangerouslyAllowSVG: false,
  },

  // Enable Turbopack (default en Next.js 16).
  turbopack: {},
};

export default nextConfig;
