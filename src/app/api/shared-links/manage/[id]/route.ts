import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, adminLimiter } from '@/lib/rate-limit';
import { internalError } from '@/lib/security/api-error';
import { canManageSharedLinks, getAuthenticatedProfile, isSuperAdmin, sharedLinkSecurityHeaders } from '@/lib/shared-links';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const idSchema = z.string().uuid();

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if ((process.env.VERCEL_ENV === 'production' || (!process.env.VERCEL_ENV && process.env.NODE_ENV === 'production')) && (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN)) {
      return NextResponse.json({ success: false, message: 'Servicio temporalmente no disponible.' }, { status: 503, headers: sharedLinkSecurityHeaders() });
    }
    const limited = await checkRateLimit(request, adminLimiter);
    if (limited) return limited;
    const auth = await getAuthenticatedProfile(request);
    if (!auth) return NextResponse.json({ success: false, message: 'No autenticado.' }, { status: 401 });
    if (!canManageSharedLinks(auth.profile.role)) {
      return NextResponse.json({ success: false, message: 'No tienes permisos para administrar enlaces.' }, { status: 403 });
    }
    const { id } = await context.params;
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json({ success: false, message: 'Enlace no disponible.' }, { status: 404 });
    }

    let query = auth.admin.from('shared_links')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .is('revoked_at', null);
    if (isSuperAdmin(auth.profile.role)) query = query.eq('created_by', auth.user.id);
    else if (auth.profile.company_id) query = query.eq('company_id', auth.profile.company_id);
    else return NextResponse.json({ success: false, message: 'Enlace no disponible.' }, { status: 404 });

    const { data, error } = await query.select('id').maybeSingle();
    if (error) return internalError('Shared link revoke', error);
    if (!data) return NextResponse.json({ success: false, message: 'Enlace no disponible.' }, { status: 404, headers: sharedLinkSecurityHeaders() });
    return NextResponse.json({ success: true }, { headers: sharedLinkSecurityHeaders() });
  } catch (error) {
    return internalError('Shared link revoke endpoint', error);
  }
}
