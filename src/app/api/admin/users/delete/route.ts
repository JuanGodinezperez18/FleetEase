import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, supabaseAdmin } from '@/lib/admin-api-auth';
import { internalError } from '@/lib/security/api-error';
import { idSchema, parseJsonBody } from '@/lib/security/validation';
import { canAdministerTargetUser } from '@/lib/security/admin-target-scope';

const deleteUserSchema = z.object({
  uid: idSchema,
});

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, deleteUserSchema);
    if (!parsed.ok) return parsed.response;
    const { uid } = parsed.data;

    // Authenticate and authorize the actor before looking up the target.
    // This prevents unauthenticated callers from probing whether user IDs exist.
    const auth = await requireAdmin(request);
    if ('error' in auth) return auth.error;

    const { data: target, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id, company_id, role, is_deleted')
      .eq('id', uid)
      .single();

    if (targetError || !target || target.is_deleted) {
      return NextResponse.json(
        { success: false, message: 'Usuario objetivo no encontrado.' },
        { status: 404 },
      );
    }

    // Reuse the shared fail-closed policy for tenant boundaries, privileged
    // accounts and self-targeting after the actor has been authenticated.
    if (!canAdministerTargetUser(auth.profile, target)) {
      return NextResponse.json(
        { success: false, message: 'No puedes desactivar este usuario.' },
        { status: 403 },
      );
    }

    let deactivateQuery = supabaseAdmin
      .from('users')
      .update({ is_deleted: true })
      .eq('id', uid)
      .eq('is_deleted', false);
    deactivateQuery = target.company_id === null
      ? deactivateQuery.is('company_id', null)
      : deactivateQuery.eq('company_id', target.company_id);

    const { data: deactivated, error: profileError } = await deactivateQuery
      .select('id')
      .maybeSingle();

    if (profileError) {
      // No exponer el mensaje interno de Postgres/Supabase al cliente.
      return internalError('Delete User API', profileError, { uid });
    }
    if (!deactivated) {
      return NextResponse.json(
        { success: false, message: 'El usuario cambió de estado; vuelve a cargar e inténtalo de nuevo.' },
        { status: 409 },
      );
    }

    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(uid, {
      user_metadata: { deleted: true },
    });
    if (authUpdateError) {
      console.error('[Delete User API] Profile deactivated but Auth metadata update failed:', authUpdateError);
      return NextResponse.json(
        { success: false, message: 'El usuario se desactivó, pero no se pudo sincronizar su estado de autenticación.' },
        { status: 500 },
      );
    }

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
