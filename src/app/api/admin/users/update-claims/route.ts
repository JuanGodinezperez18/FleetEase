import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface UpdateClaimsRequest {
  userId: string;
  role: string;
  companyId?: string;
  partnerAccess?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: UpdateClaimsRequest = await request.json();
    const { userId, role, companyId, partnerAccess } = body;

    // Actualizar perfil en tabla users
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .update({
        role,
        company_id: role === 'super_admin' ? null : companyId,
        partner_access: role === 'viewer' ? (partnerAccess || []) : [],
      })
      .eq('id', userId);

    if (profileError) {
      console.error('[Update Claims API] Profile error:', profileError);
      return NextResponse.json(
        { success: false, message: profileError.message },
        { status: 500 }
      );
    }

    // En Supabase, los roles se manejan via RLS y la tabla users
    // No hay "custom claims" como en Firebase, el middleware usa la tabla users directamente

    return NextResponse.json({
      success: true,
      message: 'Permisos actualizados. El usuario debe cerrar sesión e iniciar de nuevo.',
    });
  } catch (error) {
    console.error('[Update Claims API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}