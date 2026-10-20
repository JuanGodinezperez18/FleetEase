/**
 * Configuración de anuncios para el plan Free.
 * Valores leídos de variables de entorno en Vercel (NEXT_PUBLIC_*).
 */

export const adsConfig = {
  /** Master switch. Si false, no se renderiza ningún anuncio aunque el plan sea Free. */
  enabled: process.env.NEXT_PUBLIC_ADS_ENABLED !== 'false',

  /** Publisher ID de Google AdSense, ej. ca-pub-XXXXXXXXXXXXXXXX */
  clientId: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || '',

  /** Slot del banner superior */
  bannerSlot: process.env.NEXT_PUBLIC_ADSENSE_SLOT_BANNER || '',

  /** Slot del intersticial (modal entre páginas) */
  interstitialSlot: process.env.NEXT_PUBLIC_ADSENSE_SLOT_INTERSTITIAL || '',

  /**
   * Cada cuántos cambios de ruta se muestra el intersticial.
   * Default: 4 (cada 4 navegaciones dentro del dashboard).
   */
  interstitialEveryNRoutes: Math.max(
    2,
    Number(process.env.NEXT_PUBLIC_ADS_INTERSTITIAL_EVERY_N_ROUTES || '4') || 4,
  ),

  /**
   * Segundos mínimos entre intersticiales (anti-spam).
   * Default: 90.
   */
  interstitialMinSeconds: Math.max(
    30,
    Number(process.env.NEXT_PUBLIC_ADS_INTERSTITIAL_MIN_SECONDS || '90') || 90,
  ),

  /** Segundos antes de poder cerrar el intersticial. Default: 3. */
  interstitialClosableAfterSeconds: Math.max(
    0,
    Number(process.env.NEXT_PUBLIC_ADS_INTERSTITIAL_CLOSE_AFTER || '3') || 3,
  ),
};

export function isAdsNetworkConfigured(): boolean {
  return Boolean(adsConfig.clientId);
}
