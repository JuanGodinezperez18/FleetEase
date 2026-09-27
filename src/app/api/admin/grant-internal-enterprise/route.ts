import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const INTERNAL_COMPANY_ID = 'cca57015-9633-42a2-870e-72e713d8e17b';
const INTERNAL_COMPANY_NAME = 'Mi Empresa';
const CONFIRMATION = 'MI_EMPRESA_ENTERPRISE_NO_BILLING';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autenticado. Token faltante.' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado. Token inválido.' }, { status: 401 });
    }

    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, name, role, company_id')
      .eq('id', user.id)
      .eq('is_deleted', false)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'Perfil de usuario no encontrado.' }, { status: 404 });
    }

    if (userProfile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Solo un superadmin puede ejecutar esta operación.' }, { status: 403 });
    }

    if (userProfile.company_id !== INTERNAL_COMPANY_ID) {
      return NextResponse.json({ error: 'La cuenta actual no pertenece a la empresa interna autorizada.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    if (body.confirmation !== CONFIRMATION) {
      return NextResponse.json({ error: 'Confirmación administrativa inválida.' }, { status: 400 });
    }

    const { data: company, error: companyReadError } = await supabaseAdmin
      .from('companies')
      .select('id, name, plan, max_vehicles, max_users, subscription_status, stripe_customer_id, stripe_subscription_id, trial_ends_at')
      .eq('id', INTERNAL_COMPANY_ID)
      .single();

    if (companyReadError || !company) {
      return NextResponse.json({ error: 'Mi Empresa no fue encontrada.' }, { status: 404 });
    }

    if (company.name !== INTERNAL_COMPANY_NAME) {
      return NextResponse.json({ error: 'La empresa autorizada no coincide con Mi Empresa.' }, { status: 409 });
    }

    const previous = {
      plan: company.plan,
      max_vehicles: company.max_vehicles,
      max_users: company.max_users,
      subscription_status: company.subscription_status,
      stripe_customer_id: company.stripe_customer_id,
      stripe_subscription_id: company.stripe_subscription_id,
      trial_ends_at: company.trial_ends_at,
    };

    const { data: updatedCompany, error: updateError } = await supabaseAdmin
      .from('companies')
      .update({
        plan: 'enterprise',
        max_vehicles: 50,
        max_users: 10,
        subscription_status: 'active',
        stripe_customer_id: null,
        stripe_subscription_id: null,
        trial_ends_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', INTERNAL_COMPANY_ID)
      .select('id, name, plan, max_vehicles, max_users, subscription_status, stripe_customer_id, stripe_subscription_id, trial_ends_at')
      .single();

    if (updateError || !updatedCompany) {
      console.error('Error actualizando plan interno:', updateError);
      return NextResponse.json({ error: 'No se pudo actualizar el plan de Mi Empresa.' }, { status: 500 });
    }

    const description = 'Asignación administrativa de Enterprise a Mi Empresa sin suscripción recurrente de Stripe.';

    const { error: changeLogError } = await supabaseAdmin
      .from('company_change_logs')
      .insert({
        company_id: INTERNAL_COMPANY_ID,
        change_type: 'limit_changed',
        changed_by: user.id,
        changed_by_name: userProfile.name || user.email || 'Superadmin',
        changed_at: new Date().toISOString(),
        description,
        field_changed: 'plan,max_vehicles,max_users,subscription_status,stripe_customer_id,stripe_subscription_id',
        previous_value: previous,
        new_value: {
          plan: 'enterprise',
          max_vehicles: 50,
          max_users: 10,
          subscription_status: 'active',
          stripe_customer_id: null,
          stripe_subscription_id: null,
          trial_ends_at: null,
        },
      });

    if (changeLogError) {
      console.error('Error registrando company_change_logs:', changeLogError);
    }

    const { error: auditError } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'update',
        entity_type: 'company',
        entity_id: INTERNAL_COMPANY_ID,
        entity_name: INTERNAL_COMPANY_NAME,
        user_id: user.id,
        user_name: userProfile.name || user.email || 'Superadmin',
        timestamp: new Date().toISOString(),
        changes: {
          reason: 'internal_enterprise_non_billing',
          previous,
          new: {
            plan: 'enterprise',
            max_vehicles: 50,
            max_users: 10,
            subscription_status: 'active',
            stripe_customer_id: null,
            stripe_subscription_id: null,
            trial_ends_at: null,
          },
        },
        company_id: INTERNAL_COMPANY_ID,
      });

    if (auditError) {
      console.error('Error registrando audit_logs:', auditError);
    }

    return NextResponse.json({
      success: true,
      message: 'Mi Empresa quedó configurada como Enterprise interno sin suscripción recurrente.',
      company: updatedCompany,
      auditLogged: !auditError,
      changeLogged: !changeLogError,
    });
  } catch (error) {
    console.error('Error en /api/admin/grant-internal-enterprise:', error);
    return NextResponse.json({ error: 'Error interno al actualizar la empresa.' }, { status: 500 });
  }
}
