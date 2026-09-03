import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';

async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set() {},
        remove() {},
      },
    },
  );
}

export async function GET() {
  try {
    const stripe = getStripe();
    const supabase = await createClient();

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    const { data: userRecord, error: userError } = await supabase
      .from('users').select('company_id').eq('id', session.user.id).single();
    if (userError || !userRecord) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    const companyId = userRecord.company_id;
    if (!companyId) {
      return NextResponse.json({ success: false, error: 'Usuario sin compania asignada' }, { status: 400 });
    }

    const { data: companyRecord, error: companyError } = await supabase
      .from('companies')
      .select('plan, max_vehicles, max_users, stripe_customer_id, stripe_subscription_id, subscription_status, trial_ends_at')
      .eq('id', companyId)
      .single();
    if (companyError || !companyRecord) {
      return NextResponse.json({ success: false, error: 'Compania no encontrada' }, { status: 404 });
    }

    const { count: vehicleCount } = await supabase
      .from('vehicles').select('*', { count: 'exact', head: true })
      .eq('company_id', companyId).eq('is_deleted', false);

    const plan = companyRecord.plan ?? 'starter';
    const maxVehicles = companyRecord.max_vehicles ?? (plan === 'free' ? 2 : 5);
    const maxUsers = companyRecord.max_users ?? 1;
    const currentVehicleCount = vehicleCount ?? 0;

    let subscriptionDetails: { status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean } | null = null;

    if (companyRecord.stripe_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(companyRecord.stripe_subscription_id);
        subscriptionDetails = {
          status: subscription.status,
          currentPeriodEnd: subscription.items.data[0]?.current_period_end
            ? new Date(subscription.items.data[0]!.current_period_end * 1000).toISOString()
            : null,
          cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
        };
      } catch (error) {
        console.error('Error fetching live subscription from Stripe:', error);
      }
    }

    if (plan === 'free') {
      subscriptionDetails = {
        status: companyRecord.trial_ends_at && new Date(companyRecord.trial_ends_at).getTime() > Date.now()
          ? 'trialing'
          : 'expired',
        currentPeriodEnd: companyRecord.trial_ends_at,
        cancelAtPeriodEnd: false,
      };
    }

    return NextResponse.json({
      success: true,
      plan,
      maxVehicles,
      maxUsers,
      vehicleCount: currentVehicleCount,
      trialEndsAt: companyRecord.trial_ends_at,
      subscription: subscriptionDetails,
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    if (error instanceof Stripe.errors.StripeError) {
      console.error('Stripe API error:', { type: error.type, code: error.code, requestId: error.requestId });
    }
    return NextResponse.json({ success: false, error: 'Error al obtener estado de suscripcion. Intente de nuevo mas tarde.' }, { status: 500 });
  }
}
