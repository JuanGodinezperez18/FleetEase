import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface DeleteUserRequest {
  uid: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: DeleteUserRequest = await request.json();
    const { uid } = body;

    // 1. Soft delete en tabla users
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .update({ is_deleted: true })
      .eq('id', uid);

    if (profileError) {
      console.error('[Delete User API] Profile error:', profileError);
      return NextResponse.json(
        { success: false, message: profileError.message },
        { status: 500 }
      );
    }

    // 2. Deshabilitar usuario en Supabase Auth (no eliminar, para mantener historial)
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(uid, {
      user_metadata: { ...{ deleted: true } },
    });

    // Nota: No eliminamos el usuario de Auth para preservar integridad referencial
    // Solo lo marcamos como deleted en metadata

    return NextResponse.json({
      success: true,
      message: 'Usuario desactivado exitosamente',
    });
  } catch (error) {
    console.error('[Delete User API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}