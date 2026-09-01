import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, supabaseAdmin } from '@/lib/admin-api-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid } = body;

    if (!uid) {
      return NextResponse.json(
        { success: false, message: 'uid es obligatorio.' },
        { status: 400 },
      );
    }

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
      console.error('[Resend Welcome API] Error:', error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 },
      );
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
