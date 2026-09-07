import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Allow Next.js to collect API route data during builds where runtime secrets
// are intentionally unavailable. Production requests still use the real env vars.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://build-placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'build-placeholder-service-role-key';

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export type AdminProfile = {
  id: string;
  role: string;
  company_id: string | null;
};

/**
 * Validates Bearer token and ensures caller is admin or super_admin.
 * Optionally restricts non-super_admins to a target company_id.
 */
export async function requireAdmin(
  request: NextRequest,
  options?: { allowedRoles?: string[]; targetCompanyId?: string | null },
): Promise<{ profile: AdminProfile } | { error: NextResponse }> {
  const allowedRoles = options?.allowedRoles ?? ['admin', 'super_admin'];

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      error: NextResponse.json(
        { success: false, message: 'No autenticado. Token faltante.' },
        { status: 401 },
      ),
    };
  }

  const token = authHeader.substring(7);
  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return {
      error: NextResponse.json(
        { success: false, message: 'No autenticado. Token inválido.' },
        { status: 401 },
      ),
    };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id, role, company_id')
    .eq('id', user.id)
    .eq('is_deleted', false)
    .single();

  if (profileError || !profile) {
    return {
      error: NextResponse.json(
        { success: false, message: 'Usuario no encontrado.' },
        { status: 404 },
      ),
    };
  }

  if (!allowedRoles.includes(profile.role)) {
    return {
      error: NextResponse.json(
        { success: false, message: 'No tienes permisos para esta operación.' },
        { status: 403 },
      ),
    };
  }

  // Tenant isolation: company admin cannot act on another company.
  if (
    profile.role !== 'super_admin' &&
    options?.targetCompanyId &&
    profile.company_id &&
    options.targetCompanyId !== profile.company_id
  ) {
    return {
      error: NextResponse.json(
        { success: false, message: 'No puedes operar sobre otra empresa.' },
        { status: 403 },
      ),
    };
  }

  return {
    profile: {
      id: profile.id,
      role: profile.role,
      company_id: profile.company_id,
    },
  };
}
