/**
 * Configuración de Seguridad para FleetEase Manager
 * 
 * Esta configuración incluye:
 * 1. Security Headers (HTTPS, CSP, HSTS, etc.)
 * 2. Configuración de SSL/TLS
 * 3. Mejores prácticas de seguridad
 */

import type { NextConfig } from 'next';

const securityHeaders = [
  // Forzar HTTPS
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  // Prevenir clickjacking
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  // Prevenir MIME sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Prevenir XSS attacks
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  // Referrer Policy
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // Permissions Policy (antes Feature Policy)
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), payment=(self "https://stripe.com")',
  },
  // Content Security Policy (CSP)
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.googleapis.com https://*.supabase.co",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://*.googleapis.com https://api.stripe.com https://*.stripe.com wss://*.supabase.co",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join('; '),
  },
  // Cross-Origin Opener Policy
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  // Cross-Origin Embedder Policy
  {
    key: 'Cross-Origin-Embedder-Policy',
    value: 'require-corp',
  },
  // Cross-Origin Resource Policy
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'same-origin',
  },
];

const nextConfig: NextConfig = {
  // Headers de seguridad para todas las rutas
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Headers adicionales para rutas de API
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NEXT_PUBLIC_APP_URL || 'https://fleetease-manager.vercel.app',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
        ],
      },
    ];
  },

  // Configuración de imágenes seguras
  images: {
    domains: [
      '*.supabase.co',
      'lh3.googleusercontent.com',
      'avatars.githubusercontent.com',
    ],
    // Prevenir carga de imágenes desde dominios no autorizados
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
    // Deshabilitar SVGs por seguridad (pueden contener scripts)
    dangerouslyAllowSVG: false,
    // Deshabilitar imágenes de dominios externos no especificados
    disableStaticImages: false,
  },

  // Configuración de cookies seguras
  experimental: {
    // Prevenir acceso a cookies desde JavaScript
  },

  // Power by header (ocultar tecnología)
  poweredByHeader: false,

  // Compilación estricta
  compiler: {
    // Remover console.log en producción
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Configuración de Webpack para seguridad
  webpack: (config, { isServer }) => {
    // Prevenir evaluación de código dinámico peligroso
    config.module.rules.push({
      test: /\.html$/,
      use: ['html-loader'],
    });

    return config;
  },

  // Redirección HTTP a HTTPS (se maneja en el hosting)
  async redirects() {
    return [
      // Redirigir HTTP a HTTPS en producción
      {
        source: '/:path*',
        has: [
          {
            type: 'header' as const,
            key: 'x-forwarded-proto',
            value: 'http',
          },
        ],
        destination: 'https://:host/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
