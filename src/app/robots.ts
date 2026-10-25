import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // /registro es página de conversión indexable ("crear cuenta gratis")
      disallow: ['/dashboard/', '/api/', '/login', '/client/', '/partner/', '/oauth/'],
    },
    sitemap: 'https://www.fleetease.com.mx/sitemap.xml',
  };
}
