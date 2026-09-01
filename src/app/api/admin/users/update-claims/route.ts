import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, supabaseAdmin } from '@/lib/admin-api-auth';

interface UpdateClaimsRequest {
  userId: string;
  role: string;
  companyId?: string;
  partnerAccess?: string[];
}

const ALLOWED_ROLES = new Set(['super_admin', 'admin', 'user', 'editor', 'viewer']);

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

    const roleMap: Record<string, string> = {
      superAdmin: 'super_admin',
      super_admin: 'super_admin',
      admin: 'admin',
      editor: 'editor',
      viewer: 'viewer',
      user: 'user',
      partner: 'partner',
      client: 'client',
    };
    const normalizedRole = roleMap[role] ?? role;

    if (!ALLOWED_ROLES.has(normalizedRole)) {
      return NextResponse.json(
        { success: false, message: 'Rol no permitido.' },
        { status: 400 },
      );
    }

    const auth = await requireAdmin(request, {
      targetCompanyId: companyId ?? null,
    });
    if ('error' in auth) return auth.error;

    // Company admins cannot escalate to super_admin or change company arbitrarily
    if (auth.profile.role !== 'super_admin') {
      if (normalizedRole === 'super_admin') {
        return NextResponse.json(
          { success: false, message: 'No puedes asignar rol super_admin.' },
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

    const { error: profileError } = await supabaseAdmin
      .from('users')
      .update({
        role: normalizedRole,
        company_id: normalizedRole === 'super_admin' ? null : companyId ?? auth.profile.company_id,
        partner_access: normalizedRole === 'viewer' ? partnerAccess || [] : [],
      })
      .eq('id', userId);

    if (profileError) {
      console.error('[Update Claims API] Profile error:', profileError);
      return NextResponse.json(
        { success: false, message: profileError.message },
        { status: 500 },
      );
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
