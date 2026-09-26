import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { getStripePriceId } from '@/config/stripe';
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
    const selectedPlanConfig = plans[selectedPlan];

    if (!email || !password || !name || !companyName) {
      return NextResponse.json({ success: false, message: 'Faltan campos requeridos' }, { status: 400 });
    }
    if (!selectedPlanConfig) {
      return NextResponse.json({ success: false, message: 'Plan de suscripción no válido' }, { status: 400 });
    }

    // La cuenta se crea siempre con Free hasta que Stripe confirme el pago.
    // Así abandonar/cancelar Checkout nunca concede capacidades de un plan pagado.
    const initialPlan: PlanType = 'free';
    const initialPlanConfig = plans.free;
    const trialEndsAt = initialPlanConfig.trialDays
      ? new Date(Date.now() + initialPlanConfig.trialDays * 24 * 60 * 60 * 1000).toISOString()
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
      return NextResponse.json({ success: false, message: authError.message }, { status: 400 });
    }
    if (!authData.user) {
      return NextResponse.json({ success: false, message: 'No se pudo crear el usuario' }, { status: 500 });
    }

    // 2. Crear compañía inicialmente como Free.
    // El plan seleccionado se conserva únicamente en Stripe metadata hasta confirmar el pago.
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name: companyName,
        email,
        plan: initialPlan,
        is_deleted: false,
        max_vehicles: initialPlanConfig.maxVehicles === -1 ? null : initialPlanConfig.maxVehicles,
        max_users: initialPlanConfig.maxUsers === -1 ? null : initialPlanConfig.maxUsers,
        subscription_status: 'trialing',
        trial_ends_at: trialEndsAt,
      })
      .select()
      .single();

    if (companyError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      console.error('[Register API] Company error:', companyError);
      return NextResponse.json({ success: false, message: 'Error al crear la empresa' }, { status: 500 });
    }

    // 3. Completar el perfil creado automáticamente por el trigger on_auth_user_created.
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .update({
        email,
        name,
        phone,
        role: 'admin',
        company_id: company.id,
        is_deleted: false,
      })
      .eq('id', authData.user.id);

    if (profileError) {
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      console.error('[Register API] Profile error:', profileError);
      return NextResponse.json({ success: false, message: 'Error al crear el perfil de usuario' }, { status: 500 });
    }

    // 4. Categorías iniciales separadas por flujo.
    const defaultCategories = [
      { name: 'Renta Semanal', type: 'income', affects: 'client_balance', is_default: true, category: 'Renta', company_id: company.id },
      { name: 'Depósito en Garantía', type: 'income', affects: 'security_deposit', is_default: true, category: 'Depósito', company_id: company.id },
      { name: 'Crédito Otorgado', type: 'income', affects: 'credit_granted', is_default: true, category: 'Crédito', company_id: company.id },
      { name: 'Otros Ingresos', type: 'income', affects: 'none', is_default: true, category: 'Otros', company_id: company.id },
      { name: 'Pago de Cliente', type: 'payment', affects: 'client_balance', is_default: true, category: 'Pago', company_id: company.id },
      { name: 'Pago a Socio', type: 'payment', affects: 'partner_balance', is_default: true, category: 'Pago Socio', company_id: company.id },
      { name: 'Pago a Proveedor', type: 'payment', affects: 'none', is_default: true, category: 'Pago Proveedor', company_id: company.id },
      { name: 'Pago de Crédito', type: 'payment', affects: 'credit_payment', is_default: true, category: 'Pago Crédito', company_id: company.id },
    ];

    const { error: categoriesError } = await supabaseAdmin
      .from('financial_categories')
      .insert(defaultCategories);

    if (categoriesError) {
      await supabaseAdmin.from('users').delete().eq('id', authData.user.id);
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      console.error('[Register API] Categories error:', categoriesError);
      return NextResponse.json({ success: false, message: 'Error al configurar las categorías financieras' }, { status: 500 });
    }

    if (selectedPlan === 'free') {
      return NextResponse.json({
        success: true,
        message: 'Cuenta creada. Tu prueba gratuita de 14 días ha comenzado.',
        userId: authData.user.id,
        companyId: company.id,
        plan: initialPlan,
        trialEndsAt,
        requiresPaymentMethod: false,
      });
    }

    // 5. Crear customer y Checkout con el Price ID canónico de Stripe.
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY no está configurada.');
    const stripe = new Stripe(secretKey, { apiVersion: '2025-10-29.clover' });
    const billingCycle = 'monthly';
    const priceId = getStripePriceId(selectedPlan, billingCycle);
    const customer = await stripe.customers.create({
      email,
      name: companyName,
      phone: phone || undefined,
      metadata: { company_id: company.id, plan_id: selectedPlan },
    });

    await supabaseAdmin
      .from('companies')
      .update({
        stripe_customer_id: customer.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', company.id);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${appUrl}/dashboard/settings/subscription?success=true&checkout=completed`,
      cancel_url: `${appUrl}/registro?plan=${selectedPlan}&canceled=true`,
      metadata: {
        company_id: company.id,
        plan_id: selectedPlan,
        billing_cycle: billingCycle,
      },
      subscription_data: {
        metadata: {
          company_id: company.id,
          plan_id: selectedPlan,
          billing_cycle: billingCycle,
        },
      },
    });

    if (!session.url) throw new Error('Stripe no devolvió una URL de checkout.');

    return NextResponse.json({
      success: true,
      message: 'Cuenta creada. Continúa con el pago para activar tu suscripción.',
      userId: authData.user.id,
      companyId: company.id,
      plan: initialPlan,
      selectedPlan,
      trialEndsAt,
      requiresPaymentMethod: true,
      checkoutUrl: session.url,
    });
  } catch (error) {
    console.error('[Register API] Unexpected error:', error);
    return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 });
  }
}
