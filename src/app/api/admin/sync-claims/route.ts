import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, supabaseAdmin } from '@/lib/admin-api-auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request, {
      allowedRoles: ['super_admin'],
    });
    if ('error' in auth) return auth.error;

    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, email, role, company_id, is_deleted')
      .eq('is_deleted', false);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Sincronización completada. ${users?.length || 0} usuarios verificados.`,
      users:
        users?.map((u) => ({
          id: u.id,
          email: u.email,
          role: u.role,
          companyId: u.company_id,
        })) || [],
    });
  } catch (error) {
    console.error('[Sync Claims API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
