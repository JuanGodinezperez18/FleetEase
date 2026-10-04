import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, supabaseAdmin } from '@/lib/admin-api-auth';
import { internalError } from '@/lib/security/api-error';
import { idSchema, parseJsonBody } from '@/lib/security/validation';

const deleteUserSchema = z.object({
  uid: idSchema,
});

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, deleteUserSchema);
    if (!parsed.ok) return parsed.response;
    const { uid } = parsed.data;

    const { data: target, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id, company_id, role')
      .eq('id', uid)
      .single();

    if (targetError || !target) {
      return NextResponse.json(
        { success: false, message: 'Usuario objetivo no encontrado.' },
        { status: 404 },
      );
    }

    const auth = await requireAdmin(request, {
      targetCompanyId: target.company_id,
    });
    if ('error' in auth) return auth.error;

    // Only super_admin may delete another super_admin
    if (target.role === 'super_admin' && auth.profile.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, message: 'No puedes desactivar un super_admin.' },
        { status: 403 },
      );
    }

    if (uid === auth.profile.id) {
      return NextResponse.json(
        { success: false, message: 'No puedes desactivar tu propia cuenta.' },
        { status: 400 },
      );
    }

    const { error: profileError } = await supabaseAdmin
      .from('users')
      .update({ is_deleted: true })
      .eq('id', uid);

    if (profileError) {
      // No exponer el mensaje interno de Postgres/Supabase al cliente.
      return internalError('Delete User API', profileError, { uid });
    }

    await supabaseAdmin.auth.admin.updateUserById(uid, {
      user_metadata: { deleted: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Usuario desactivado exitosamente',
    });
  } catch (error) {
    console.error('[Delete User API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
