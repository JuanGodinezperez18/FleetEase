import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, supabaseAdmin } from '@/lib/admin-api-auth';
import { internalError } from '@/lib/security/api-error';
import { idSchema, parseJsonBody } from '@/lib/security/validation';

const resendWelcomeSchema = z.object({
  uid: idSchema,
});

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, resendWelcomeSchema);
    if (!parsed.ok) return parsed.response;
    const { uid } = parsed.data;

    const { data: target, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id, company_id')
      .eq('id', uid)
      .single();

    if (targetError || !target) {
      return NextResponse.json(
        { success: false, message: 'Usuario no encontrado' },
        { status: 404 },
      );
    }

    const auth = await requireAdmin(request, {
      targetCompanyId: target.company_id,
    });
    if ('error' in auth) return auth.error;

    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(uid);

    if (userError || !user?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Usuario no encontrado en Auth' },
        { status: 404 },
      );
    }

    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: user.user.email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
      },
    });

    if (error) {
      return internalError('Resend Welcome API', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Email de bienvenida enviado',
    });
  } catch (error) {
    console.error('[Resend Welcome API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
