'use client';

import { supabase } from '@/lib/supabase-browser';

const SIGNED_URL_TTL_MS = 55 * 60 * 1000;
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Resolves many persisted Supabase Storage URLs in one authenticated request.
 * Original URLs remain the database references; signed URLs are presentation-only.
 */
export async function resolvePrivateStorageUrls(
  values: Array<string | null | undefined>,
): Promise<Array<string | null | undefined>> {
  const output = [...values];
  const unresolved = new Map<string, number[]>();
  const now = Date.now();

  values.forEach((value, index) => {
    if (!value || !value.includes('/storage/v1/object/')) return;
    const cached = signedUrlCache.get(value);
    if (cached && cached.expiresAt > now) {
      output[index] = cached.url;
      return;
    }
    const indexes = unresolved.get(value) ?? [];
    indexes.push(index);
    unresolved.set(value, indexes);
  });

  if (unresolved.size === 0) return output;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (sessionError || !token) {
    unresolved.forEach((indexes) => indexes.forEach((index) => { output[index] = null; }));
    return output;
  }

  const response = await fetch('/api/storage/signed-url', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileUrls: [...unresolved.keys()] }),
    cache: 'no-store',
  });

  if (!response.ok) {
    if (response.status === 403 || response.status === 404) {
      unresolved.forEach((indexes) => indexes.forEach((index) => { output[index] = null; }));
      return output;
    }
    throw new Error('No se pudo obtener acceso temporal a los archivos privados.');
  }

  const payload = await response.json() as { signedUrls?: Record<string, string> };
  unresolved.forEach((indexes, originalUrl) => {
    const signedUrl = payload.signedUrls?.[originalUrl];
    indexes.forEach((index) => { output[index] = signedUrl ?? null; });
    if (signedUrl) {
      signedUrlCache.set(originalUrl, { url: signedUrl, expiresAt: Date.now() + SIGNED_URL_TTL_MS });
    }
  });

  return output;
}

export async function resolvePrivateStorageUrl(
  value: string | null | undefined,
): Promise<string | null | undefined> {
  return (await resolvePrivateStorageUrls([value]))[0];
}
