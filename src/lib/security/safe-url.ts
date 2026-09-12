/**
 * Validates URLs before they are used for client-side navigation.
 * Only HTTPS URLs on FleetEase's own domain or trusted service domains are allowed.
 */
const TRUSTED_HOSTS = [
  'fleetease.com.mx',
  'www.fleetease.com.mx',
  'supabase.co',
  'storage.googleapis.com',
  'firebasestorage.googleapis.com',
  'stripe.com',
];

function isTrustedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return TRUSTED_HOSTS.some((trusted) => host === trusted || host.endsWith(`.${trusted}`));
}

export function getSafeExternalUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:') return null;
    if (!isTrustedHostname(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function openSafeUrl(value: unknown): boolean {
  const safeUrl = getSafeExternalUrl(value);
  if (!safeUrl) return false;

  const opened = window.open(safeUrl, '_blank', 'noopener,noreferrer');
  if (opened) opened.opener = null;
  return Boolean(opened);
}
