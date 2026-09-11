// next.config.mjs
//
// Security headers that do not require a per-request value live here.
// The Content-Security-Policy is intentionally generated in proxy.ts so
// production can use a unique nonce and reject unsafe inline JavaScript.
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
  // CSP se gestiona dinámicamente en proxy.ts para poder usar nonces.
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
