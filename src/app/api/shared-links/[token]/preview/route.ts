import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, sharedLinkLimiter, sharedLinkTokenLimiter } from '@/lib/rate-limit';
import { internalError } from '@/lib/security/api-error';
import { getSafeStoragePath } from '@/lib/security/safe-storage-path';
import {
  getLinkState, getSupabaseAdmin, hashShareToken, isValidShareToken, sharedLinkSecurityHeaders,
} from '@/lib/shared-links';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function unavailable() {
  return new NextResponse('Este archivo compartido no está disponible.', {
    status: 404,
    headers: { ...sharedLinkSecurityHeaders(), 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

function rateLimitUnavailable() {
  return (process.env.VERCEL_ENV === 'production' || (!process.env.VERCEL_ENV && process.env.NODE_ENV === 'production')) &&
    (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN);
}

/**
 * Public, token-authorized inline preview. Does not consume single-use links;
 * only the explicit download endpoint consumes them.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  try {
    if (rateLimitUnavailable()) {
      return new NextResponse('Servicio temporalmente no disponible.', {
        status: 503,
        headers: { ...sharedLinkSecurityHeaders(), 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
    const limited = await checkRateLimit(request, sharedLinkLimiter);
    if (limited) return limited;

    const { token } = await context.params;
    if (!isValidShareToken(token)) return unavailable();
    const tokenHash = hashShareToken(token);
    const tokenLimit = await sharedLinkTokenLimiter.check(tokenHash);
    if (tokenLimit.limited) {
      return new NextResponse('Demasiadas solicitudes. Intenta más tarde.', {
        status: 429,
        headers: {
          ...sharedLinkSecurityHeaders(),
          'Content-Type': 'text/plain; charset=utf-8',
          'Retry-After': String(Math.max(1, Math.ceil((tokenLimit.resetAt - Date.now()) / 1000))),
        },
      });
    }

    const admin = getSupabaseAdmin();
    const { data: link, error } = await admin
      .from('shared_links')
      .select('company_id, vehicle_id, bucket_name, object_path, expires_at, revoked_at, single_use, used_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (error) return internalError('Shared link preview lookup', error);
    if (!link || getLinkState(link) !== 'active') return unavailable();

    const safePath = getSafeStoragePath(link.object_path);
    if (!safePath || safePath !== link.object_path) return unavailable();
    const segments = safePath.split('/');
    if (
      !['vehicle-documents', 'vehicle-images'].includes(link.bucket_name) ||
      segments[0] !== 'companies' ||
      segments[1] !== link.company_id ||
      segments[2] !== 'vehicles' ||
      segments[3] !== link.vehicle_id ||
      !['documents', 'images'].includes(segments[4]) ||
      (link.bucket_name === 'vehicle-documents' && segments[4] !== 'documents') ||
      (link.bucket_name === 'vehicle-images' && segments[4] !== 'images') ||
      segments.length !== 6
    ) return unavailable();

    const { data: vehicle, error: vehicleError } = await admin
      .from('vehicles')
      .select('id, company_id, is_deleted')
      .eq('id', link.vehicle_id)
      .maybeSingle();
    if (vehicleError || !vehicle || vehicle.company_id !== link.company_id || vehicle.is_deleted) return unavailable();

    const { data: blob, error: storageError } = await admin.storage
      .from(link.bucket_name)
      .download(link.object_path);
    if (storageError || !blob || blob.size <= 0 || blob.size > 10 * 1024 * 1024) return unavailable();

    const allowedPreviewTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const contentType = blob.type?.toLowerCase();
    if (!contentType || !allowedPreviewTypes.has(contentType)) {
      return new NextResponse('La vista previa está disponible para imágenes JPG, PNG o WebP. Usa Descargar documento para los demás formatos.', {
        status: 415,
        headers: { ...sharedLinkSecurityHeaders(), 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const bytes = new Uint8Array(await blob.arrayBuffer());
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        ...sharedLinkSecurityHeaders(),
        'Content-Type': contentType,
        'Content-Length': String(bytes.byteLength),
        'Content-Disposition': 'inline',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    return internalError('Shared link preview endpoint', error);
  }
}
