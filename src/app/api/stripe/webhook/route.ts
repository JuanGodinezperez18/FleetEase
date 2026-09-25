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
          const subscription = await stripe.subscriptions.retrieve(
            typeof session.subscription === 'string' ? session.subscription : session.subscription.id
          );
          const companyId = session.metadata?.company_id;
          const planId = session.metadata?.plan_id;

          if (companyId) {
            await supabaseAdmin
              .from('companies')
              .update({
                plan: planId || undefined,
                stripe_subscription_id: subscription.id,
                stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
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
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

        const { data: companyBySubscription } = await supabaseAdmin
          .from('companies')
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .maybeSingle();

        let companyId = companyBySubscription?.id;
        if (!companyId) {
          const { data: companyByCustomer } = await supabaseAdmin
            .from('companies')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .maybeSingle();
          companyId = companyByCustomer?.id;
        }

        if (companyId) {
          await supabaseAdmin
            .from('companies')
            .update({
              subscription_status: subscription.status,
              stripe_subscription_id: subscription.id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', companyId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

        const { data: company } = await supabaseAdmin
          .from('companies')
          .select('id')
          .or(`stripe_subscription_id.eq.${subscription.id},stripe_customer_id.eq.${customerId}`)
          .maybeSingle();

        if (company) {
          await supabaseAdmin
            .from('companies')
            .update({
              plan: 'starter',
              stripe_subscription_id: null,
              subscription_status: 'canceled',
              updated_at: new Date().toISOString(),
            })
            .eq('id', company.id);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = getInvoiceSubscriptionId(invoice);
        if (subscriptionId) {
          await supabaseAdmin
            .from('companies')
            .update({ subscription_status: 'past_due', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', subscriptionId);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = getInvoiceSubscriptionId(invoice);
        if (subscriptionId) {
          await supabaseAdmin
            .from('companies')
            .update({ subscription_status: 'active', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', subscriptionId);
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