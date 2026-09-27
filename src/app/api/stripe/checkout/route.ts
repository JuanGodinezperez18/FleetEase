import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripe } from '@/lib/stripe';
import { getStripePriceId, type BillingCycle } from '@/config/stripe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
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
    const { planId, billingCycle = 'monthly' } = body as { planId: string; billingCycle?: BillingCycle };

    // Antes: se armaba un price_data inline con montos hardcodeados,
    // creando un producto nuevo en Stripe en CADA checkout en vez de
    // reusar el catálogo real (6 Price IDs ya creados: starter/pro/
    // enterprise x mensual/anual). Eso fragmentaba los reportes de
    // ingresos y ensuciaba el dashboard de Stripe con productos
    // duplicados. Ahora se usa el Price ID real.
    let priceId: string;
    try {
      priceId = getStripePriceId(planId, billingCycle);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Plan inválido' },
        { status: 400 }
      );
    }

    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, name, email, stripe_customer_id')
      .eq('id', userProfile.company_id)
      .single();

    if (companyError || !company) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    let stripeCustomerId = company.stripe_customer_id as string | null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: company.email || user.email,
        name: company.name,
        metadata: { company_id: company.id },
      });
      stripeCustomerId = customer.id;

      await supabaseAdmin
        .from('companies')
        .update({ stripe_customer_id: stripeCustomerId, updated_at: new Date().toISOString() })
        .eq('id', company.id);
    }

    // Crear sesión de checkout usando el Price ID real del catálogo
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
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
      subscription_data: {
        metadata: {
          company_id: userProfile.company_id,
          plan_id: planId,
          billing_cycle: billingCycle,
        },
      },
    });

    return NextResponse.json({ success: true, sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Error al crear sesión de pago' },
      { status: 500 }
    );
  }
}