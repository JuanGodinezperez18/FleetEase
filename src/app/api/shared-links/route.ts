import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, sharedLinkCreateLimiter, sharedLinkLimiter } from '@/lib/rate-limit';
import { internalError } from '@/lib/security/api-error';
import { parseJsonBody } from '@/lib/security/validation';
import {
  canCreateSharedLink, canManageSharedLinks, generateShareToken, getAuthenticatedProfile,
  getLinkState, getShortLink, hashShareToken, parseVehicleStorageReference,
  sanitizeDocumentLabel, sharedLinkSecurityHeaders, isSuperAdmin,
} from '@/lib/shared-links';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  fileUrl: z.string().url().max(4096),
  vehicleId: z.string().uuid(),
  documentLabel: z.string().trim().min(1).max(80).transform(sanitizeDocumentLabel),
  expiresInHours: z.union([z.literal(1), z.literal(24), z.literal(168)]).default(24),
  singleUse: z.boolean().default(false),
}).strict();

function rateLimitUnavailable() {
  return (process.env.VERCEL_ENV === 'production' || (!process.env.VERCEL_ENV && process.env.NODE_ENV === 'production')) &&
    (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN);
}

export async function POST(request: NextRequest) {
  try {
    if (rateLimitUnavailable()) {
      return NextResponse.json({ success: false, message: 'Servicio temporalmente no disponible.' }, { status: 503 });
    }
    const limited = await checkRateLimit(request, sharedLinkCreateLimiter);
    if (limited) return limited;

    const auth = await getAuthenticatedProfile(request);
    if (!auth) return NextResponse.json({ success: false, message: 'No autenticado.' }, { status: 401 });
    if (!canCreateSharedLink(auth.profile.role)) {
      return NextResponse.json({ success: false, message: 'No tienes permisos para compartir documentos.' }, { status: 403 });
    }

    const parsed = await parseJsonBody(request, createSchema);
    if (!parsed.ok) return parsed.response;
    const reference = parseVehicleStorageReference(parsed.data.fileUrl);
    if (!reference) return NextResponse.json({ success: false, message: 'Documento no disponible para compartir.' }, { status: 400 });

    const { data: vehicle, error: vehicleError } = await auth.admin
      .from('vehicles')
      .select('id, company_id, make, model, plate, is_deleted')
      .eq('id', parsed.data.vehicleId)
      .maybeSingle();
    if (vehicleError) return internalError('Shared link vehicle lookup', vehicleError);
    if (!vehicle || vehicle.is_deleted || !vehicle.company_id) {
      return NextResponse.json({ success: false, message: 'Documento no disponible para compartir.' }, { status: 404 });
    }
    if (!isSuperAdmin(auth.profile.role) && auth.profile.company_id !== vehicle.company_id) {
      return NextResponse.json({ success: false, message: 'Documento no disponible para compartir.' }, { status: 404 });
    }

    const expectedPrefix = `companies/${vehicle.company_id}/vehicles/${vehicle.id}/`;
    if (!reference.path.startsWith(expectedPrefix)) {
      return NextResponse.json({ success: false, message: 'Documento no disponible para compartir.' }, { status: 404 });
    }

    const token = generateShareToken();
    const shortUrl = getShortLink(token);
    const expiresAt = new Date(Date.now() + parsed.data.expiresInHours * 60 * 60 * 1000).toISOString();
    const plate = typeof vehicle.plate === 'string' ? vehicle.plate.replace(/\s/g, '') : '';
    const maskedPlate = plate ? `***-${plate.slice(-3)}` : 'Placas no disponibles';
    const vehicleLabel = [vehicle.make, vehicle.model].filter(Boolean).join(' ').slice(0, 70) + ` · ${maskedPlate}`;

    const { data: row, error } = await auth.admin
      .from('shared_links')
      .insert({
        token_hash: hashShareToken(token),
        company_id: vehicle.company_id,
        vehicle_id: vehicle.id,
        created_by: auth.user.id,
        bucket_name: reference.bucket,
        object_path: reference.path,
        document_label: parsed.data.documentLabel,
        vehicle_label: vehicleLabel.slice(0, 120),
        expires_at: expiresAt,
        single_use: parsed.data.singleUse,
      })
      .select('id, expires_at, single_use')
      .single();
    if (error || !row) return internalError('Shared link create', error || new Error('Missing link row'));

    return NextResponse.json(
      { success: true, id: row.id, shortUrl, expiresAt: row.expires_at, singleUse: row.single_use },
      { status: 201, headers: sharedLinkSecurityHeaders() },
    );
  } catch (error) {
    return internalError('Shared link create endpoint', error);
  }
}

export async function GET(request: NextRequest) {
  try {
    if (rateLimitUnavailable()) {
      return NextResponse.json({ success: false, message: 'Servicio temporalmente no disponible.' }, { status: 503 });
    }
    const limited = await checkRateLimit(request, sharedLinkLimiter);
    if (limited) return limited;
    const auth = await getAuthenticatedProfile(request);
    if (!auth) return NextResponse.json({ success: false, message: 'No autenticado.' }, { status: 401 });
    if (!canManageSharedLinks(auth.profile.role)) {
      return NextResponse.json({ success: false, message: 'No tienes permisos para administrar enlaces.' }, { status: 403 });
    }

    let query = auth.admin.from('shared_links')
      .select('id, company_id, vehicle_id, created_by, document_label, vehicle_label, created_at, expires_at, single_use, use_count, used_at, revoked_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (isSuperAdmin(auth.profile.role)) {
      query = query.eq('created_by', auth.user.id);
    } else if (auth.profile.company_id) {
      query = query.eq('company_id', auth.profile.company_id);
    } else {
      return NextResponse.json({ success: true, links: [] }, { headers: sharedLinkSecurityHeaders() });
    }
    const { data, error } = await query;
    if (error) return internalError('Shared link list', error);
    const links = (data || []).map((link: any) => ({ ...link, state: getLinkState(link) }));
    return NextResponse.json({ success: true, links }, { headers: sharedLinkSecurityHeaders() });
  } catch (error) {
    return internalError('Shared link list endpoint', error);
  }
}
