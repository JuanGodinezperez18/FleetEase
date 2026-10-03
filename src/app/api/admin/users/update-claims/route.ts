import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, supabaseAdmin } from '@/lib/admin-api-auth';
import { internalError } from '@/lib/security/api-error';
import type { Database } from '@/lib/supabase';

interface UpdateClaimsRequest {
  userId: string;
  role: string;
  companyId?: string;
  partnerAccess?: string[];
}

type UserRole = Database['public']['Enums']['user_role'];

const ALLOWED_ROLES = new Set<UserRole>(['super_admin', 'admin', 'editor', 'viewer']);

export async function POST(request: NextRequest) {
  try {
    const body: UpdateClaimsRequest = await request.json();
    const { userId, role, companyId, partnerAccess } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { success: false, message: 'userId y role son obligatorios.' },
        { status: 400 },
      );
    }

    const roleMap: Record<string, UserRole> = {
      superAdmin: 'super_admin',
      super_admin: 'super_admin',
      admin: 'admin',
      editor: 'editor',
      viewer: 'viewer',
      partner: 'partner',
      client: 'client',
    };
    const normalizedRole = roleMap[role];

    if (!ALLOWED_ROLES.has(normalizedRole)) {
      return NextResponse.json(
        { success: false, message: 'Rol no permitido.' },
        { status: 400 },
      );
    }

    // Authenticate the caller first. Do not trust companyId from the request
    // as proof that the target user belongs to that tenant.
    const auth = await requireAdmin(request);
    if ('error' in auth) return auth.error;

    const { data: target, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id, company_id, role, is_deleted')
      .eq('id', userId)
      .maybeSingle();

    if (targetError) {
      console.error('[Update Claims API] Target lookup error:', targetError);
      return NextResponse.json(
        { success: false, message: 'No se pudo validar el usuario objetivo.' },
        { status: 500 },
      );
    }

    if (!target || target.is_deleted) {
      return NextResponse.json(
        { success: false, message: 'Usuario objetivo no encontrado.' },
        { status: 404 },
      );
    }

    // Company admins may only modify users that already belong to their own
    // company. The requested companyId can never override the target's tenant.
    if (auth.profile.role !== 'super_admin') {
      if (normalizedRole === 'super_admin') {
        return NextResponse.json(
          { success: false, message: 'No puedes asignar rol super_admin.' },
          { status: 403 },
        );
      }
      if (!auth.profile.company_id || target.company_id !== auth.profile.company_id) {
        return NextResponse.json(
          { success: false, message: 'No puedes modificar usuarios de otra empresa.' },
          { status: 403 },
        );
      }
      if (companyId && companyId !== auth.profile.company_id) {
        return NextResponse.json(
          { success: false, message: 'No puedes mover usuarios a otra empresa.' },
          { status: 403 },
        );
      }
    }

    // A super_admin may explicitly assign a company; otherwise preserve the
    // target's existing tenant instead of trusting an omitted/malformed value.
    const nextCompanyId = normalizedRole === 'super_admin'
      ? null
      : auth.profile.role === 'super_admin'
        ? companyId ?? target.company_id
        : auth.profile.company_id;

    const { error: profileError } = await supabaseAdmin
      .from('users')
      .update({
        role: normalizedRole,
        company_id: nextCompanyId,
        partner_access: normalizedRole === 'viewer' ? partnerAccess || [] : [],
      })
      .eq('id', userId);

    if (profileError) {
      return internalError('Update Claims API', profileError, { userId });
    }

    return NextResponse.json({
      success: true,
      message: 'Permisos actualizados. El usuario debe cerrar sesión e iniciar de nuevo.',
    });
  } catch (error) {
    console.error('[Update Claims API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
