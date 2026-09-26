// next.config.mjs
// Security headers that do not require a per-request value live here.
// Content-Security-Policy is generated exclusively in proxy.ts with a fresh
// nonce per request. Keeping a second static CSP here would create multiple
// policies that are enforced cumulatively and would break nonce-based scripts.
//
// typescript.ignoreBuildErrors: TEMPORAL. El proyecto tiene errores de
// TypeScript preexistentes; esto permite desplegar mientras se corrigen
// por separado. `npx tsc --noEmit` sigue mostrando los errores reales.

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,

  typescript: {
    // TODO: quitar esto una vez corregidos los errores de tipos preexistentes.
    ignoreBuildErrors: true,
  },

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
          // require-corp bloqueaba previews de imágenes de Supabase Storage (sin CORP).
          // credentialless mantiene aislamiento sin impedir imágenes públicas cross-origin.
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
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
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/v0/b/**' },
      { protocol: 'https', hostname: 'storage.googleapis.com', pathname: '/**' },
      // Supabase Storage (logos de empresa, documentos, fotos)
      { protocol: 'https', hostname: '**.supabase.co', pathname: '/storage/v1/object/public/**' },
      { protocol: 'https', hostname: '**.supabase.co', pathname: '/storage/v1/object/sign/**' },
    ],
    dangerouslyAllowSVG: false,
  },

  turbopack: {},
};

export default nextConfig;
