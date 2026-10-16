import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, supabaseAdmin } from '@/lib/admin-api-auth';
import { internalError } from '@/lib/security/api-error';

const PAGE_SIZE = 1000;

const roleMap: Record<string, string> = {
  super_admin: 'superAdmin',
  admin: 'admin',
  editor: 'editor',
  viewer: 'viewer',
  partner: 'partner',
  client: 'client',
};

/**
 * Lista perfiles de usuario solo para administradores autenticados.
 * SuperAdmin puede ver todas las empresas; los administradores normales
 * quedan limitados a su propia empresa.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) return auth.error;

    if (auth.profile.role !== 'super_admin' && !auth.profile.company_id) {
      return NextResponse.json({ success: true, users: [] });
    }

    const records: any[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      let query = supabaseAdmin
        .from('users')
        .select('id,email,name,phone,street,city,state,zip_code,country,role,company_id,partner_access,notification_settings,is_deleted,created_at,updated_at,push_subscriptions')
        .order('created_at', { ascending: false });
      if (auth.profile.role !== 'super_admin') {
        query = query.eq('company_id', auth.profile.company_id!);
      }
      const { data, error } = await query.range(offset, offset + PAGE_SIZE - 1);
      if (error) return internalError('Admin Users List API', error);
      const page = data || [];
      records.push(...page);
      if (page.length < PAGE_SIZE) break;
    }

    const users = records.map(user => ({
      uid: user.id,
      name: user.name || user.email || 'Usuario',
      email: user.email || '',
      phone: user.phone || undefined,
      street: user.street || undefined,
      city: user.city || undefined,
      state: user.state || undefined,
      zipCode: user.zip_code || undefined,
      country: user.country || undefined,
      role: roleMap[user.role] || user.role,
      companyId: user.company_id,
      partnerAccess: user.partner_access || [],
      notificationSettings: user.notification_settings || undefined,
      isDeleted: Boolean(user.is_deleted),
      createdAt: user.created_at || undefined,
      updatedAt: user.updated_at || undefined,
      pushSubscriptions: user.push_subscriptions || [],
    }));

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('[Admin Users List API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, message: 'No se pudo cargar la lista de usuarios.' },
      { status: 500 },
    );
  }
}
