import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Extrae el timestamp de fin del periodo actual. Desde la API version
// 2025-03-31 este campo se movió del objeto Subscription al primer
// SubscriptionItem (antes: subscription.current_period_end).
function getCurrentPeriodEnd(subscription: Stripe.Subscription): string | null {
  const rawTimestamp = subscription.items.data[0]?.current_period_end;
  return rawTimestamp ? new Date(rawTimestamp * 1000).toISOString() : null;
}

// Extrae el subscription id de un Invoice. Desde la API version
// 2025-03-31 este campo se movió de invoice.subscription a
// invoice.parent.subscription_details.subscription.
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const subscriptionDetails = invoice.parent?.subscription_details;
  const subscription = subscriptionDetails?.subscription;
  if (!subscription) return null;
  return typeof subscription === 'string' ? subscription : subscription.id;
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          
          const companyId = session.metadata?.company_id;
          const planId = session.metadata?.plan_id;
          const billingCycle = session.metadata?.billing_cycle;

          if (companyId) {
            // Actualizar customer con subscription_id
            await supabaseAdmin
              .from('stripe_customers')
              .update({
                stripe_subscription_id: subscription.id,
                subscription_status: subscription.status,
                subscription_plan: planId,
                current_period_end: getCurrentPeriodEnd(subscription),
                updated_at: new Date().toISOString(),
              })
              .eq('company_id', companyId);

            // Actualizar company con plan
            await supabaseAdmin
              .from('companies')
              .update({
                plan: planId,
                stripe_subscription_id: subscription.id,
                stripe_customer_id: session.customer as string,
                subscription_status: subscription.status,
                updated_at: new Date().toISOString(),
              })
              .eq('id', companyId);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Buscar customer por stripe_subscription_id
        const { data: stripeCustomer } = await supabaseAdmin
          .from('stripe_customers')
          .select('company_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (stripeCustomer) {
          await supabaseAdmin
            .from('stripe_customers')
            .update({
              subscription_status: subscription.status,
              current_period_end: getCurrentPeriodEnd(subscription),
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscription.id);

          await supabaseAdmin
            .from('companies')
            .update({
              subscription_status: subscription.status,
              updated_at: new Date().toISOString(),
            })
            .eq('id', stripeCustomer.company_id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        const { data: stripeCustomer } = await supabaseAdmin
          .from('stripe_customers')
          .select('company_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (stripeCustomer) {
          await supabaseAdmin
            .from('stripe_customers')
            .update({
              stripe_subscription_id: null,
              subscription_status: 'canceled',
              subscription_plan: null,
              current_period_end: null,
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscription.id);

          await supabaseAdmin
            .from('companies')
            .update({
              plan: 'starter',
              stripe_subscription_id: null,
              subscription_status: 'canceled',
              updated_at: new Date().toISOString(),
            })
            .eq('id', stripeCustomer.company_id);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = getInvoiceSubscriptionId(invoice);

        if (subscriptionId) {
          const { data: stripeCustomer } = await supabaseAdmin
            .from('stripe_customers')
            .select('company_id')
            .eq('stripe_subscription_id', subscriptionId)
            .single();

          if (stripeCustomer) {
            await supabaseAdmin
              .from('stripe_customers')
              .update({
                subscription_status: 'past_due',
                updated_at: new Date().toISOString(),
              })
              .eq('stripe_subscription_id', subscriptionId);

            await supabaseAdmin
              .from('companies')
              .update({
                subscription_status: 'past_due',
                updated_at: new Date().toISOString(),
              })
              .eq('id', stripeCustomer.company_id);
          }
        }
        break;
      }

      // Antes no se manejaba este evento: cuando un pago fallido
      // (invoice.payment_failed, arriba) se corrige y el cobro de
      // reintento de Stripe SÍ pasa, no había una confirmación explícita
      // de que la cuenta salió de 'past_due'. En la práctica
      // 'customer.subscription.updated' también suele dispararse en ese
      // momento y ya corrige el status, pero este evento es la señal
      // directa e inequívoca del pago exitoso - útil además como punto
      // de enganche para enviar un recibo/confirmación al cliente.
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = getInvoiceSubscriptionId(invoice);

        if (subscriptionId) {
          const { data: stripeCustomer } = await supabaseAdmin
            .from('stripe_customers')
            .select('company_id')
            .eq('stripe_subscription_id', subscriptionId)
            .single();

          if (stripeCustomer) {
            await supabaseAdmin
              .from('stripe_customers')
              .update({
                subscription_status: 'active',
                updated_at: new Date().toISOString(),
              })
              .eq('stripe_subscription_id', subscriptionId);

            await supabaseAdmin
              .from('companies')
              .update({
                subscription_status: 'active',
                updated_at: new Date().toISOString(),
              })
              .eq('id', stripeCustomer.company_id);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}