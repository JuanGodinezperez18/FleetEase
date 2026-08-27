import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-04-10',
});

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

    // Verificar que sea admin o super_admin
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role, company_id')
      .eq('id', user.id)
      .single();
    
    if (profileError || !userProfile || !['admin', 'super_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const body = await request.json();
    const { planId, billingCycle = 'monthly' } = body;

    const plans: Record<string, { monthly: number; yearly: number }> = {
      starter: { monthly: 29900, yearly: 299900 },
      pro: { monthly: 59900, yearly: 599900 },
      enterprise: { monthly: 99900, yearly: 999900 },
    };

    const plan = plans[planId];
    if (!plan) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });
    }

    const amount = billingCycle === 'yearly' ? plan.yearly : plan.monthly;

    // Obtener o crear customer de Stripe
    let { data: stripeCustomer, error: customerError } = await supabaseAdmin
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('company_id', userProfile.company_id)
      .single();

    let stripeCustomerId: string;

    if (customerError || !stripeCustomer?.stripe_customer_id) {
      // Crear customer en Stripe
      const { data: company } = await supabaseAdmin
        .from('companies')
        .select('name, email')
        .eq('id', userProfile.company_id)
        .single();

      const customer = await stripe.customers.create({
        email: company?.email || user.email,
        name: company?.name,
        metadata: {
          company_id: userProfile.company_id,
        },
      });

      stripeCustomerId = customer.id;

      // Guardar en BD
      await supabaseAdmin.from('stripe_customers').insert({
        company_id: userProfile.company_id,
        stripe_customer_id: stripeCustomerId,
      });
    } else {
      stripeCustomerId = stripeCustomer.stripe_customer_id;
    }

    // Crear sesión de checkout
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: `Plan ${planId.charAt(0).toUpperCase() + planId.slice(1)}`,
              description: `Suscripción ${billingCycle === 'yearly' ? 'anual' : 'mensual'}`,
            },
            unit_amount: amount,
            recurring: {
              interval: billingCycle === 'yearly' ? 'year' : 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/subscription?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/subscription?canceled=true`,
      metadata: {
        company_id: userProfile.company_id,
        plan_id: planId,
        billing_cycle: billingCycle,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Error al crear sesión de pago' },
      { status: 500 }
    );
  }
}