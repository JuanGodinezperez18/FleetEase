import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: string;
  companyId?: string;
  partnerAccess?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateUserRequest = await request.json();
    const { email, password, name, phone, role, companyId, partnerAccess } = body;

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone },
    });

    if (authError) {
      console.error('[Create User API] Auth error:', authError);
      return NextResponse.json(
        { success: false, message: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { success: false, message: 'No se pudo crear el usuario' },
        { status: 500 }
      );
    }

    // 2. Crear perfil en tabla users
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        name,
        phone,
        role,
        company_id: role === 'super_admin' ? null : companyId,
        partner_access: role === 'viewer' ? (partnerAccess || []) : [],
        is_deleted: false,
      });

    if (profileError) {
      // Rollback: eliminar usuario auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      console.error('[Create User API] Profile error:', profileError);
      return NextResponse.json(
        { success: false, message: 'Error al crear el perfil de usuario' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Usuario ${name} creado exitosamente`,
      userId: authData.user.id,
    });
  } catch (error) {
    console.error('[Create User API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}