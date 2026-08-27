import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function POST() {
  try {
    // En Supabase, los claims/roles se sincronizan automáticamente
    // porque el middleware lee directamente de la tabla users
    // Esta API existe por compatibilidad

    // Podríamos verificar que todos los usuarios tengan perfiles
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, email, role, company_id, is_deleted')
      .eq('is_deleted', false);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Sincronización completada. ${users?.length || 0} usuarios verificados.`,
      users: users?.map(u => ({ id: u.id, email: u.email, role: u.role, companyId: u.company_id })) || [],
    });
  } catch (error) {
    console.error('[Sync Claims API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}