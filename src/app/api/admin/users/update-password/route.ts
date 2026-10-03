import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, supabaseAdmin } from '@/lib/admin-api-auth';
import { authErrorMessage, internalError } from '@/lib/security/api-error';

interface UpdatePasswordRequest {
  userId: string;
  newPassword: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: UpdatePasswordRequest = await request.json();
    const { userId, newPassword } = body;

    if (!userId || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'userId y newPassword son obligatorios.' },
        { status: 400 },
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'La contraseña debe tener al menos 6 caracteres.' },
        { status: 400 },
      );
    }

    // Authenticated user may change only their own password, unless admin/super_admin.
    const auth = await requireAdmin(request, {
      allowedRoles: ['admin', 'super_admin', 'editor', 'viewer', 'user', 'partner', 'client'],
    });
    if ('error' in auth) return auth.error;

    if (auth.profile.id !== userId) {
      const { data: target } = await supabaseAdmin
        .from('users')
        .select('id, company_id, role')
        .eq('id', userId)
        .single();

      if (!target) {
        return NextResponse.json(
          { success: false, message: 'Usuario no encontrado.' },
          { status: 404 },
        );
      }

      if (!['admin', 'super_admin'].includes(auth.profile.role)) {
        return NextResponse.json(
          { success: false, message: 'No puedes cambiar la contraseña de otro usuario.' },
          { status: 403 },
        );
      }

      if (
        auth.profile.role !== 'super_admin' &&
        target.company_id &&
        target.company_id !== auth.profile.company_id
      ) {
        return NextResponse.json(
          { success: false, message: 'No puedes operar sobre otra empresa.' },
          { status: 403 },
        );
      }
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      // Solo se traducen códigos conocidos; nada de error.message crudo.
      const known = authErrorMessage(error, '');
      if (known) {
        return NextResponse.json({ success: false, message: known }, { status: 400 });
      }
      return internalError('Update Password API', error, { userId });
    }

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada exitosamente',
    });
  } catch (error) {
    console.error('[Update Password API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
