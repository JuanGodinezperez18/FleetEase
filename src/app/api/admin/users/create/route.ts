import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, supabaseAdmin } from '@/lib/admin-api-auth';
import { authErrorMessage } from '@/lib/security/api-error';
import {
  emailSchema,
  idSchema,
  nameSchema,
  parseJsonBody,
  passwordSchema,
  phoneSchema,
} from '@/lib/security/validation';
import type { Database } from '@/lib/supabase';

const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  phone: phoneSchema,
  role: z.string().trim().min(1).max(32),
  companyId: idSchema.optional(),
  partnerAccess: z.array(z.string().max(120)).max(100).optional(),
});

const PLAN_DEFAULTS: Record<string, { maxUsers: number }> = {
  starter: { maxUsers: 1 },
  pro: { maxUsers: 3 },
  enterprise: { maxUsers: -1 },
};

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, createUserSchema);
    if (!parsed.ok) return parsed.response;
    const { email, password, name, phone, role, companyId, partnerAccess } = parsed.data;

    const auth = await requireAdmin(request, { targetCompanyId: companyId ?? null });
    if ('error' in auth) return auth.error;

    const roleMap: Record<string, Database['public']['Enums']['user_role']> = {
      superAdmin: 'super_admin',
      super_admin: 'super_admin',
      admin: 'admin',
      editor: 'editor',
      viewer: 'viewer',
      partner: 'partner',
      client: 'client',
    };
    const normalizedRole = roleMap[role];

    if (!normalizedRole) {
      return NextResponse.json({ success: false, message: 'Rol no permitido.' }, { status: 400 });
    }

    if (auth.profile.role !== 'super_admin') {
      if (normalizedRole === 'super_admin') {
        return NextResponse.json({ success: false, message: 'No puedes crear un super_admin.' }, { status: 403 });
      }
      if (!companyId || companyId !== auth.profile.company_id) {
        return NextResponse.json({ success: false, message: 'Solo puedes crear usuarios en tu empresa.' }, { status: 403 });
      }
    }

    // Enforce the plan limit on the server before touching Supabase Auth.
    // The UI also validates this, but client-side validation is never authoritative.
    if (normalizedRole !== 'super_admin' && companyId) {
      const { data: company, error: companyError } = await supabaseAdmin
        .from('companies')
        .select('plan, max_users')
        .eq('id', companyId)
        .single();

      if (companyError || !company) {
        return NextResponse.json({ success: false, message: 'Compañía no encontrada.' }, { status: 404 });
      }

      const plan = company.plan || 'starter';
      const configuredLimit = company.max_users;
      const maxUsers = configuredLimit ?? PLAN_DEFAULTS[plan]?.maxUsers ?? PLAN_DEFAULTS.starter.maxUsers;

      if (maxUsers !== -1) {
        const { count, error: countError } = await supabaseAdmin
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('is_deleted', false)
          .neq('role', 'super_admin');

        if (countError) {
          console.error('[Create User API] Count error:', countError);
          return NextResponse.json({ success: false, message: 'No se pudo validar el límite de usuarios.' }, { status: 500 });
        }

        if ((count ?? 0) >= maxUsers) {
          return NextResponse.json({
            success: false,
            code: 'PLAN_USER_LIMIT_REACHED',
            message: `Has alcanzado el límite de ${maxUsers} usuarios de tu plan ${plan}. Actualiza tu plan para agregar más usuarios.`,
          }, { status: 409 });
        }
      }
    }

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone },
    });

    if (authError) {
      console.error('[Create User API] Auth error:', authError);
      return NextResponse.json(
        {
          success: false,
          message: authErrorMessage(authError, 'No se pudo crear el usuario.'),
        },
        { status: 400 },
      );
    }

    if (!authData.user) {
      return NextResponse.json({ success: false, message: 'No se pudo crear el usuario' }, { status: 500 });
    }

    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        name,
        phone,
        role: normalizedRole,
        company_id: normalizedRole === 'super_admin' ? null : companyId,
        partner_access: normalizedRole === 'viewer' ? (partnerAccess || []) : [],
        is_deleted: false,
      });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      console.error('[Create User API] Profile error:', profileError);
      return NextResponse.json({ success: false, message: 'Error al crear el perfil de usuario' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Usuario ${name} creado exitosamente`,
      userId: authData.user.id,
    });
  } catch (error) {
    console.error('[Create User API] Unexpected error:', error);
    return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 });
  }
}
