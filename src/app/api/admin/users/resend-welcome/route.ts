import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface ResendWelcomeRequest {
  uid: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ResendWelcomeRequest = await request.json();
    const { uid } = body;

    // Obtener email del usuario
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(uid);

    if (userError || !user) {
      return NextResponse.json(
        { success: false, message: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Enviar email de recuperación de contraseña (funciona como welcome)
    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: user.user.email!,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
      },
    });

    if (error) {
      console.error('[Resend Welcome API] Error:', error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
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
      { status: 500 }
    );
  }
}