import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, supabaseAdmin } from '@/lib/admin-api-auth';
import { internalError } from '@/lib/security/api-error';
import { sendEmail } from '@/lib/resend';
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
      .select('id, company_id, email, is_deleted')
      .eq('email', email)
      .maybeSingle();

    if (!target || target.is_deleted) {
      return NextResponse.json(
        { success: false, message: 'Usuario no encontrado o inactivo.' },
        { status: 404 },
      );
    }

    const auth = await requireAdmin(request, {
      targetCompanyId: target.company_id,
    });
    if ('error' in auth) return auth.error;

    const { data: linkData, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.fleetease.com.mx'}/dashboard/reset-password`,
      },
    });

    if (error) {
      return internalError('Send Password Reset API', error);
    }

    const actionLink = linkData.properties?.action_link;
    if (!actionLink) {
      return NextResponse.json({ success: false, message: 'No se pudo generar el enlace.' }, { status: 500 });
    }

    const safeLink = actionLink.replace(/&/g, '&amp;').replace(/\"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const emailResult = await sendEmail({
      to: email,
      subject: 'Restablece tu contraseña de FleetEase',
      text: `Para restablecer tu contraseña de FleetEase, abre este enlace: ${actionLink}`,
      html: `<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta FleetEase.</p><p><a href="${safeLink}">Restablecer contraseña</a></p><p>Si no solicitaste este cambio, puedes ignorar este correo.</p>`,
    });
    if (!emailResult?.id) {
      return NextResponse.json({ success: false, message: 'No se pudo confirmar el envío del correo.' }, { status: 502 });
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
