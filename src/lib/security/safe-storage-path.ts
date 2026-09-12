const SAFE_SEGMENT_PATTERN = /^[A-Za-z0-9._-]{1,200}$/;

/**
 * Validates a single user-controlled Storage path segment.
 * Rejects separators, traversal markers and control characters.
 */
export function getSafeStorageSegment(value: unknown, label = 'ruta'): string | null {
  if (typeof value !== 'string') return null;

  const segment = value.trim();
  if (!segment || segment === '.' || segment === '..') return null;
  if (segment.includes('..') || /[\\/\u0000-\u001F\u007F]/.test(segment)) return null;
  if (!SAFE_SEGMENT_PATTERN.test(segment)) return null;

  return segment;
}

/**
 * Validates a complete Storage path after URL decoding.
 * Every segment is checked independently so encoded traversal cannot reach
 * Supabase Storage operations.
 */
export function getSafeStoragePath(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(value).trim();
  } catch {
    return null;
  }

  if (!decoded || decoded.startsWith('/') || decoded.includes('\\')) return null;

  const segments = decoded.split('/');
  if (segments.some((segment) => !getSafeStorageSegment(segment))) return null;

  return segments.join('/');
}
