import { createServerClient, type CookieOptions } from '@supabase/ssr';
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
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    },
  );
}

export async function GET() {
  try {
    const stripe = getStripe();
    const supabase = await createClient();

    // 1. Verify Supabase Auth session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 },
      );
    }

    const userId = session.user.id;

    // 2. Look up user from Supabase, get their company_id
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', userId)
      .single();

    if (userError || !userRecord) {
      console.error('Error fetching user:', userError);
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 },
      );
    }

    const companyId = userRecord.company_id;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Usuario sin compania asignada' },
        { status: 400 },
      );
    }

    // 3. Look up company from Supabase
    const { data: companyRecord, error: companyError } = await supabase
      .from('companies')
      .select(
        'plan, max_vehicles, max_users, stripe_customer_id, stripe_subscription_id, subscription_status',
      )
      .eq('id', companyId)
      .single();

    if (companyError || !companyRecord) {
      console.error('Error fetching company:', companyError);
      return NextResponse.json(
        { success: false, error: 'Compania no encontrada' },
        { status: 404 },
      );
    }

    // 4. Count current vehicles for the company
    const { count: vehicleCount, error: countError } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('is_deleted', false);

    if (countError) {
      console.error('Error counting vehicles:', countError);
    }

    // 5. Build base plan data from database
    const plan = companyRecord.plan ?? 'starter';
    const maxVehicles = companyRecord.max_vehicles ?? 5;
    const maxUsers = companyRecord.max_users ?? 1;
    const currentVehicleCount = vehicleCount ?? 0;

    // 6. Fetch live subscription details from Stripe if available
    let subscriptionDetails = null;

    if (companyRecord.stripe_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          companyRecord.stripe_subscription_id,
        );

        subscriptionDetails = {
          status: subscription.status,
          currentPeriodEnd: subscription.items.data[0]?.current_period_end
            ? new Date(subscription.items.data[0]!.current_period_end * 1000).toISOString()
            : null,
          cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
        };
      } catch (error) {
        // Non-fatal: still return plan data from database
        console.error('Error fetching live subscription from Stripe:', error);
      }
    }

    return NextResponse.json({
      success: true,
      plan,
      maxVehicles,
      maxUsers,
      vehicleCount: currentVehicleCount,
      subscription: subscriptionDetails,
    });
  } catch (error) {
    console.error('Subscription status error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      console.error('Stripe API error:', {
        type: error.type,
        code: error.code,
        requestId: error.requestId,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener estado de suscripcion. Intente de nuevo mas tarde.',
      },
      { status: 500 },
    );
  }
}
