import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: 'https://fleetease.com.mx/', lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: 'https://fleetease.com.mx/soluciones', lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: 'https://fleetease.com.mx/funciones', lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: 'https://fleetease.com.mx/software-para-flotillas', lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: 'https://fleetease.com.mx/software-para-renta-de-vehiculos', lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: 'https://fleetease.com.mx/control-de-mantenimiento-de-flotillas', lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://fleetease.com.mx/precios', lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
  ];
}
