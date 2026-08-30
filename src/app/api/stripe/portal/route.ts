import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripe } from '@/lib/stripe';

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

    // Obtener customer de Stripe
    const { data: stripeCustomer, error: customerError } = await supabaseAdmin
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('company_id', userProfile.company_id)
      .single();

    if (customerError || !stripeCustomer?.stripe_customer_id) {
      return NextResponse.json({ error: 'No hay suscripción activa' }, { status: 404 });
    }

    // Crear sesión del portal de facturación
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomer.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/subscription`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Error al abrir portal de facturación' },
      { status: 500 }
    );
  }
}