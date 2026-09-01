import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, supabaseAdmin } from '@/lib/admin-api-auth';

interface SendPasswordResetRequest {
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SendPasswordResetRequest = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'email es obligatorio.' },
        { status: 400 },
      );
    }

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
      console.error('[Send Password Reset API] Error:', error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 },
      );
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
