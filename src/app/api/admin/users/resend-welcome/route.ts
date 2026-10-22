import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, supabaseAdmin } from '@/lib/admin-api-auth';
import { internalError } from '@/lib/security/api-error';
import { sendEmail } from '@/lib/resend';
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
      .select('id, company_id, is_deleted')
      .eq('id', uid)
      .single();

    if (targetError || !target || target.is_deleted) {
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

    const { data: linkData, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: user.user.email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.fleetease.com.mx'}/dashboard/reset-password`,
      },
    });

    if (error) {
      return internalError('Resend Welcome API', error);
    }

    const actionLink = linkData.properties?.action_link;
    if (!actionLink) {
      return NextResponse.json({ success: false, message: 'No se pudo generar el enlace de acceso.' }, { status: 500 });
    }

    const safeLink = actionLink.replace(/&/g, '&amp;').replace(/\"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const emailResult = await sendEmail({
      to: user.user.email,
      subject: 'Tu acceso a FleetEase',
      text: `Para establecer o actualizar la contraseña de tu cuenta FleetEase, abre este enlace: ${actionLink}`,
      html: `<p>Te compartimos un enlace para establecer o actualizar la contraseña de tu cuenta FleetEase.</p><p><a href="${safeLink}">Configurar contraseña y acceder</a></p><p>Si no esperabas este correo, puedes ignorarlo.</p>`,
    });
    if (!emailResult?.id) {
      return NextResponse.json({ success: false, message: 'No se pudo confirmar el envío del correo.' }, { status: 502 });
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
