import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { plans, type PlanType } from '@/config/plans';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PAID_PLANS: PlanType[] = ['starter', 'pro', 'enterprise'];

function getCurrentPeriodEnd(subscription: Stripe.Subscription): string | null {
  const rawTimestamp = subscription.items.data[0]?.current_period_end;
  return rawTimestamp ? new Date(rawTimestamp * 1000).toISOString() : null;
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const subscriptionDetails = invoice.parent?.subscription_details;
  const subscription = subscriptionDetails?.subscription;
  if (!subscription) return null;
  return typeof subscription === 'string' ? subscription : subscription.id;
}

function getPaidPlan(value: string | null | undefined): PlanType | null {
  return value && PAID_PLANS.includes(value as PlanType) ? value as PlanType : null;
}

async function applyCompanyPlan(
  companyId: string,
  plan: PlanType,
  subscriptionStatus: string,
  stripeSubscriptionId: string | null,
  stripeCustomerId?: string | null,
) {
  const config = plans[plan];
  await supabaseAdmin
    .from('companies')
    .update({
      plan,
      max_vehicles: config.maxVehicles === -1 ? null : config.maxVehicles,
      max_users: config.maxUsers === -1 ? null : config.maxUsers,
      subscription_status: subscriptionStatus,
      stripe_subscription_id: stripeSubscriptionId,
      ...(stripeCustomerId !== undefined ? { stripe_customer_id: stripeCustomerId } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', companyId);
}

async function findCompanyId(subscriptionId: string | null, customerId: string | null): Promise<string | null> {
  if (subscriptionId) {
    const { data } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  if (customerId) {
    const { data } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  return null;
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
          const requestedPlan = getPaidPlan(session.metadata?.plan_id);

          if (companyId) {
            const paid = session.payment_status === 'paid' && ['active', 'trialing'].includes(subscription.status);
            await applyCompanyPlan(
              companyId,
              paid && requestedPlan ? requestedPlan : 'free',
              paid ? subscription.status : 'trialing',
              subscription.id,
              typeof session.customer === 'string' ? session.customer : session.customer?.id,
            );
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
        const companyId = await findCompanyId(subscription.id, customerId);

        if (companyId) {
          const paidPlan = getPaidPlan(subscription.metadata?.plan_id);
          const paid = ['active', 'trialing'].includes(subscription.status) && !!paidPlan;

          await applyCompanyPlan(
            companyId,
            paid ? paidPlan! : 'free',
            subscription.status,
            subscription.id,
            customerId,
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
        const companyId = await findCompanyId(subscription.id, customerId);

        if (companyId) {
          await applyCompanyPlan(companyId, 'free', 'canceled', null, customerId);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = getInvoiceSubscriptionId(invoice);

        if (subscriptionId) {
          const { data: subscription } = await stripe.subscriptions.retrieve(subscriptionId).then(data => ({ data })).catch(() => ({ data: null }));
          const customerId = subscription
            ? (typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id)
            : null;
          const companyId = await findCompanyId(subscriptionId, customerId);

          if (companyId) {
            await applyCompanyPlan(companyId, 'free', 'past_due', subscriptionId, customerId);
          }
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = getInvoiceSubscriptionId(invoice);

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
          const companyId = await findCompanyId(subscriptionId, customerId);
          const paidPlan = getPaidPlan(subscription.metadata?.plan_id);

          if (companyId && paidPlan) {
            await applyCompanyPlan(companyId, paidPlan, 'active', subscriptionId, customerId);
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
