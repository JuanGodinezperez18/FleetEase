import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { plans, type PlanType } from '@/config/plans';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone: string;
  companyName: string;
  plan: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();
    const { email, password, name, phone, companyName, plan } = body;
    const selectedPlan = plan as PlanType;
    const planConfig = plans[selectedPlan];

    if (!email || !password || !name || !companyName) {
      return NextResponse.json(
        { success: false, message: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    if (!planConfig) {
      return NextResponse.json(
        { success: false, message: 'Plan de suscripción no válido' },
        { status: 400 }
      );
    }

    const trialEndsAt = planConfig.trialDays
      ? new Date(Date.now() + planConfig.trialDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone },
    });

    if (authError) {
      console.error('[Register API] Auth error:', authError);
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

    // 2. Crear compañía con límites reales del plan.
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name: companyName,
        email,
        plan: selectedPlan,
        is_deleted: false,
        max_vehicles: planConfig.maxVehicles === -1 ? null : planConfig.maxVehicles,
        max_users: planConfig.maxUsers === -1 ? null : planConfig.maxUsers,
        ...(selectedPlan === 'free'
          ? { subscription_status: 'trialing', trial_ends_at: trialEndsAt }
          : { subscription_status: 'active' }),
      })
      .select()
      .single();

    if (companyError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      console.error('[Register API] Company error:', companyError);
      return NextResponse.json(
        { success: false, message: 'Error al crear la empresa' },
        { status: 500 }
      );
    }

    // 3. Crear perfil de usuario
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        name,
        phone,
        role: 'admin',
        company_id: company.id,
        is_deleted: false,
      });

    if (profileError) {
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      console.error('[Register API] Profile error:', profileError);
      return NextResponse.json(
        { success: false, message: 'Error al crear el perfil de usuario' },
        { status: 500 }
      );
    }

    // 4. Insertar categorías financieras por defecto.
    const defaultCategories = [
      { name: 'Pago de Cliente', type: 'income', affects: 'client_balance', is_default: true, category: 'Pago', company_id: company.id },
      { name: 'Gasto Operativo', type: 'expense', affects: 'none', is_default: true, category: 'Operativo', company_id: company.id },
      { name: 'Mantenimiento', type: 'expense', affects: 'none', is_default: true, category: 'Mantenimiento', company_id: company.id },
      { name: 'Comisión Socio', type: 'payment', affects: 'partner_balance', is_default: true, category: 'Pago Socio', company_id: company.id },
      { name: 'Renta Semanal', type: 'income', affects: 'client_balance', is_default: true, category: 'Renta', company_id: company.id },
    ];

    await supabaseAdmin.from('financial_categories').insert(defaultCategories);

    return NextResponse.json({
      success: true,
      message: selectedPlan === 'free'
        ? 'Cuenta creada. Tu prueba gratuita de 14 días ha comenzado.'
        : 'Cuenta creada exitosamente',
      userId: authData.user.id,
      companyId: company.id,
      plan: selectedPlan,
      trialEndsAt,
      requiresPaymentMethod: planConfig.requiresPaymentMethod !== false,
    });
  } catch (error) {
    console.error('[Register API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}