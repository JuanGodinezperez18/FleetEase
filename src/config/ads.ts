/**
 * Configuración de anuncios para el plan Free.
 * Emplazamiento: solo banner dentro del dashboard (usuarios Free autenticados).
 * No se muestran anuncios en la landing pública (revisión AdSense + UX).
 * Sin intersticiales a pantalla completa (políticas de emplazamiento de Google).
 */

export const adsConfig = {
  /** Master switch. Si false, no se renderiza ningún anuncio aunque el plan sea Free. */
  enabled: process.env.NEXT_PUBLIC_ADS_ENABLED !== 'false',

  /** Publisher ID de Google AdSense, ej. ca-pub-XXXXXXXXXXXXXXXX */
  clientId: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || '',

  /** Slot del banner superior en dashboard */
  bannerSlot: process.env.NEXT_PUBLIC_ADSENSE_SLOT_BANNER || '',

  /**
   * Intersticiales desactivados por defecto (política AdSense / Better Ads).
   * No usar modales a pantalla completa con unidades AdSense.
   */
  interstitialEnabled: process.env.NEXT_PUBLIC_ADS_INTERSTITIAL_ENABLED === 'true',
  interstitialSlot: process.env.NEXT_PUBLIC_ADSENSE_SLOT_INTERSTITIAL || '',
};

export function isAdsNetworkConfigured(): boolean {
  return Boolean(adsConfig.clientId);
}
