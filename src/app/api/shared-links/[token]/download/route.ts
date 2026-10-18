import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, sharedLinkLimiter, sharedLinkTokenLimiter } from '@/lib/rate-limit';
import { internalError } from '@/lib/security/api-error';
import {
  getLinkState, getSupabaseAdmin, hashShareToken, isValidShareToken, safeFileName, sharedLinkSecurityHeaders,
} from '@/lib/shared-links';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function rateLimitUnavailable() {
  return process.env.NODE_ENV === 'production' &&
    (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN);
}

function unavailable() {
  return NextResponse.json(
    { success: false, message: 'Este enlace no está disponible.' },
    { status: 404, headers: sharedLinkSecurityHeaders() },
  );
}

export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  try {
    if (rateLimitUnavailable()) {
      return NextResponse.json({ success: false, message: 'Servicio temporalmente no disponible.' }, { status: 503, headers: sharedLinkSecurityHeaders() });
    }
    const limited = await checkRateLimit(request, sharedLinkLimiter);
    if (limited) return limited;
    const { token } = await context.params;
    if (!isValidShareToken(token)) return unavailable();
    const tokenHash = hashShareToken(token);
    const tokenLimit = await sharedLinkTokenLimiter.check(tokenHash);
    if (tokenLimit.limited) {
      return NextResponse.json({ success: false, message: 'Demasiadas solicitudes. Intenta más tarde.' }, { status: 429, headers: { ...sharedLinkSecurityHeaders(), 'Retry-After': String(Math.max(1, Math.ceil((tokenLimit.resetAt - Date.now()) / 1000))) } });
    }

    const admin = getSupabaseAdmin();
    const { data: link, error } = await admin
      .from('shared_links')
      .select('id, company_id, vehicle_id, bucket_name, object_path, document_label, expires_at, revoked_at, single_use, used_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();
    if (error) return internalError('Shared link download lookup', error);
    if (!link || getLinkState(link) !== 'active') return unavailable();

    const segments = String(link.object_path).split('/');
    if (
      !['vehicle-documents', 'vehicle-images'].includes(link.bucket_name) ||
      segments[0] !== 'companies' ||
      segments[1] !== link.company_id ||
      segments[2] !== 'vehicles' ||
      segments[3] !== link.vehicle_id ||
      !['documents', 'images'].includes(segments[4]) ||
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
    if (storageError || !blob) return unavailable();

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const extension = link.object_path.match(/\.([a-zA-Z0-9]{1,8})$/)?.[1]?.toLowerCase() || 'bin';
    const fileName = safeFileName(`${link.document_label}.${extension}`);
    const asciiName = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
    const allowedMime = new Set([
      'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic',
      'image/jpg', 'application/octet-stream',
    ]);
    const contentType = blob.type && allowedMime.has(blob.type) ? blob.type : 'application/octet-stream';

    const { data: consumed, error: consumeError } = await admin.rpc('consume_shared_link', {
      p_link_id: link.id,
      p_now: new Date().toISOString(),
      p_single_use: link.single_use,
    });
    if (consumeError) return internalError('Shared link atomic consume', consumeError);
    if (consumed !== true) return unavailable();

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        ...sharedLinkSecurityHeaders(),
        'Content-Type': contentType,
        'Content-Length': String(bytes.byteLength),
        'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (error) {
    return internalError('Shared link download endpoint', error);
  }
}
