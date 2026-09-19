import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/api/', '/login', '/registro/'],
    },
    sitemap: 'https://www.fleetease.com.mx/sitemap.xml',
  };
}
