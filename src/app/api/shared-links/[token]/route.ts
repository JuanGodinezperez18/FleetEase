import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, sharedLinkLimiter, sharedLinkTokenLimiter } from '@/lib/rate-limit';
import { internalError } from '@/lib/security/api-error';
import {
  getLinkState, getSupabaseAdmin, hashShareToken, isValidShareToken, sharedLinkSecurityHeaders,
} from '@/lib/shared-links';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function rateLimitUnavailable() {
  return process.env.NODE_ENV === 'production' &&
    (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN);
}

function unavailable() {
  return NextResponse.json(
    { success: false, status: 'unavailable', message: 'Este enlace no está disponible.' },
    { status: 404, headers: sharedLinkSecurityHeaders() },
  );
}

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  try {
    if (rateLimitUnavailable()) {
      return NextResponse.json({ success: false, status: 'unavailable', message: 'Servicio temporalmente no disponible.' }, { status: 503, headers: sharedLinkSecurityHeaders() });
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
      .select('id, vehicle_id, company_id, document_label, vehicle_label, expires_at, revoked_at, single_use, used_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();
    if (error) return internalError('Shared link metadata lookup', error);
    if (!link) return unavailable();

    const status = getLinkState(link);
    if (status === 'active') {
      const { data: vehicle, error: vehicleError } = await admin
        .from('vehicles')
        .select('id, company_id, is_deleted')
        .eq('id', link.vehicle_id)
        .maybeSingle();
      if (vehicleError || !vehicle || vehicle.company_id !== link.company_id || vehicle.is_deleted) return unavailable();
    }

    if (status !== 'active') {
      return NextResponse.json({ success: true, status }, { headers: sharedLinkSecurityHeaders() });
    }
    return NextResponse.json({
      success: true,
      status,
      documentLabel: link.document_label,
      vehicleLabel: link.vehicle_label,
      expiresAt: link.expires_at,
      singleUse: link.single_use,
    }, { headers: sharedLinkSecurityHeaders() });
  } catch (error) {
    return internalError('Shared link metadata endpoint', error);
  }
}
