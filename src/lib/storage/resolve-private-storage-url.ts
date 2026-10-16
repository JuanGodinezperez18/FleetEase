'use client';

import { supabase } from '@/lib/supabase-browser';

const SIGNED_URL_TTL_MS = 55 * 60 * 1000;
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Converts a persisted Supabase Storage object URL into a short-lived signed URL.
 * The original URL stays in the database; only the presentation layer receives
 * the temporary URL. The API verifies the user's company before signing.
 */
export async function resolvePrivateStorageUrl(
  value: string | null | undefined,
): Promise<string | null | undefined> {
  if (!value || !value.includes('/storage/v1/object/')) return value;

  const cached = signedUrlCache.get(value);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (sessionError || !token) return null;

  const response = await fetch('/api/storage/signed-url', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileUrl: value }),
    cache: 'no-store',
  });

  if (!response.ok) {
    if (response.status === 403 || response.status === 404) return null;
    throw new Error('No se pudo obtener acceso temporal al archivo.');
  }

  const payload = await response.json() as { signedUrl?: string };
  if (!payload.signedUrl) throw new Error('La respuesta de almacenamiento no contiene una URL temporal.');

  signedUrlCache.set(value, { url: payload.signedUrl, expiresAt: Date.now() + SIGNED_URL_TTL_MS });
  return payload.signedUrl;
}
