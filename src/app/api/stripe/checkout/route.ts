import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

const priceIds: Record<string, string | undefined> = {
  starter: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER,
  pro: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO,
  enterprise: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE,
};

const requestSchema = z.object({
  planId: z.enum(['starter', 'pro', 'enterprise'], {
    errorMap: () => ({ message: 'Plan debe ser starter, pro o enterprise' }),
  }),
  companyId: z.string().uuid('Company ID debe ser un UUID valido'),
});

function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    // 1. Verify Supabase Auth session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Cuerpo de la peticion invalido' },
        { status: 400 }
      );
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { planId, companyId } = parsed.data;

    // 3. Look up user and company from Supabase
    const [{ data: userRecord, error: userError }, { data: companyRecord, error: companyError }] =
      await Promise.all([
        supabase.from('users').select('*').eq('id', userId).single(),
        supabase.from('companies').select('*').eq('id', companyId).single(),
      ]);

    if (userError || !userRecord) {
      console.error('Error fetching user:', userError);
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    if (companyError || !companyRecord) {
      console.error('Error fetching company:', companyError);
      return NextResponse.json(
        { success: false, error: 'Compania no encontrada' },
        { status: 404 }
      );
    }

    const userEmail = userRecord.email ?? session.user.email ?? '';
    const userName = userRecord.name ?? session.user.user_metadata?.full_name ?? '';

    // 4. Get or create Stripe customer
    let customerId = companyRecord.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        name: userName,
        metadata: {
          companyId,
          userId,
        },
      });

      customerId = customer.id;

      const { error: updateError } = await supabase
        .from('companies')
        .update({ stripe_customer_id: customerId })
        .eq('id', companyId);

      if (updateError) {
        console.error('Error saving stripe_customer_id:', updateError);
        // Non-fatal: customer was created, just failed to store ID
      }
    }

    // 5. Validate price ID exists
    const priceId = priceIds[planId];
    if (!priceId) {
      return NextResponse.json(
        { success: false, error: 'Plan no valido' },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // 6. Create Stripe Checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard/settings/subscription?success=true&sessionId={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard/settings/subscription?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      metadata: {
        companyId,
        planId,
        userId,
      },
    });

    return NextResponse.json({
      success: true,
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);

    // Log internally but return safe message to client
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
        error: 'Error al procesar la solicitud. Intente de nuevo mas tarde.',
      },
      { status: 500 }
    );
  }
}
