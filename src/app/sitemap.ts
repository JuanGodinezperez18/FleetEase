import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const base = 'https://www.fleetease.com.mx';

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/software-para-flotillas`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/software-para-renta-de-vehiculos`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/control-de-mantenimiento-de-flotillas`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/funciones`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/soluciones`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/contacto-ventas`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/registro`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/privacidad`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/terminos`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/cookies`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/cancelaciones`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
