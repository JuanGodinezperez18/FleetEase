import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, supabaseAdmin } from '@/lib/admin-api-auth';
import { internalError } from '@/lib/security/api-error';
import { emailSchema, parseJsonBody } from '@/lib/security/validation';

const sendPasswordResetSchema = z.object({
  email: emailSchema,
});

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, sendPasswordResetSchema);
    if (!parsed.ok) return parsed.response;
    const { email } = parsed.data;

    const { data: target } = await supabaseAdmin
      .from('users')
      .select('id, company_id, email')
      .eq('email', email)
      .maybeSingle();

    const auth = await requireAdmin(request, {
      targetCompanyId: target?.company_id ?? null,
    });
    if ('error' in auth) return auth.error;

    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/reset-password`,
      },
    });

    if (error) {
      return internalError('Send Password Reset API', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Link de restablecimiento enviado',
    });
  } catch (error) {
    console.error('[Send Password Reset API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
