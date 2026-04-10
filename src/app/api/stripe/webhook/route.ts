import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const planLimits: Record<string, { max_vehicles: number | null; max_users: number | null }> = {
  starter: { max_vehicles: 5, max_users: 1 },
  pro: { max_vehicles: 15, max_users: 3 },
  enterprise: { max_vehicles: null, max_users: null },
};

// Mapping from Stripe price IDs to internal plan IDs
const priceIdToPlan: Record<string, string> = {
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER || '']: 'starter',
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO || '']: 'pro',
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE || '']: 'enterprise',
};

/**
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events for subscription lifecycle management.
 * This endpoint does NOT require authentication — Stripe signs the requests instead.
 */
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 },
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err instanceof Error ? err.message : 'unknown error'}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        // Acknowledge but ignore unhandled event types
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[Stripe Webhook] Error processing event:', err);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 },
    );
  }
}

/**
 * Handle checkout.session.completed
 *
 * Fired when a customer completes the Stripe Checkout flow.
 * Extracts metadata (companyId, planId, userId) and activates the subscription.
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const { companyId, planId, userId } = extractMetadata(session);

  if (!companyId) {
    console.error('[Stripe Webhook] checkout.session.completed: missing companyId in metadata');
    return;
  }

  // Get the subscription ID from the session
  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : (session.subscription as { id?: string } | null)?.id;

  if (!subscriptionId) {
    console.error('[Stripe Webhook] checkout.session.completed: no subscription ID in session');
    return;
  }

  // Determine plan limits
  const limits = planLimits[planId || 'starter'];

  // Update the company record in Supabase
  const { error } = await supabaseAdmin
    .from('companies')
    .update({
      stripe_subscription_id: subscriptionId,
      subscription_status: 'active',
      plan: planId || 'starter',
      max_vehicles: limits.max_vehicles,
      max_users: limits.max_users,
    })
    .eq('id', companyId);

  if (error) {
    console.error('[Stripe Webhook] Error updating company after checkout:', {
      companyId,
      error,
    });
    throw error;
  }

  console.log(`[Stripe Webhook] Subscription activated for company ${companyId}, plan: ${planId}, subscription: ${subscriptionId}`);
}

/**
 * Handle customer.subscription.updated
 *
 * Fired when a subscription is modified (plan change, renewal, etc.).
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Find the company by stripe_subscription_id
  const { data: company, error: fetchError } = await supabaseAdmin
    .from('companies')
    .select('id, stripe_subscription_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (fetchError || !company) {
    console.error('[Stripe Webhook] subscription.updated: company not found for subscription', subscription.id);
    return;
  }

  // Determine the new plan from the subscription's price ID
  let newPlanId: string | null = null;
  const priceId = subscription.items.data[0]?.price.id;
  if (priceId) {
    newPlanId = priceIdToPlan[priceId] || null;
  }

  // Map Stripe subscription status to our internal status
  const statusMap: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    trialing: 'trialing',
    paused: 'paused',
  };
  const internalStatus = statusMap[subscription.status] || subscription.status;

  const updateData: Record<string, unknown> = {
    subscription_status: internalStatus,
  };

  // Update plan if it changed
  if (newPlanId && planLimits[newPlanId]) {
    updateData.plan = newPlanId;
    const limits = planLimits[newPlanId];
    updateData.max_vehicles = limits.max_vehicles;
    updateData.max_users = limits.max_users;
  }

  const { error } = await supabaseAdmin
    .from('companies')
    .update(updateData)
    .eq('id', company.id);

  if (error) {
    console.error('[Stripe Webhook] Error updating company on subscription update:', {
      companyId: company.id,
      error,
    });
    throw error;
  }

  console.log(`[Stripe Webhook] Subscription updated for company ${company.id}, status: ${internalStatus}${newPlanId ? `, plan: ${newPlanId}` : ''}`);
}

/**
 * Handle customer.subscription.deleted
 *
 * Fired when a subscription is cancelled.
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { data: company, error: fetchError } = await supabaseAdmin
    .from('companies')
    .select('id, stripe_subscription_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (fetchError || !company) {
    console.error('[Stripe Webhook] subscription.deleted: company not found for subscription', subscription.id);
    return;
  }

  const starterLimits = planLimits.starter;

  const { error } = await supabaseAdmin
    .from('companies')
    .update({
      subscription_status: 'cancelled',
      plan: 'starter',
      max_vehicles: starterLimits.max_vehicles,
      max_users: starterLimits.max_users,
    })
    .eq('id', company.id);

  if (error) {
    console.error('[Stripe Webhook] Error updating company on subscription deletion:', {
      companyId: company.id,
      error,
    });
    throw error;
  }

  console.log(`[Stripe Webhook] Subscription cancelled for company ${company.id}, downgraded to starter`);
}

/**
 * Handle invoice.payment_failed
 *
 * Fired when a subscription invoice payment fails.
 * Logs the failure for later notification/recovery.
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : (invoice.subscription as { id?: string } | null)?.id;

  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : (invoice.customer as { id?: string } | null)?.id;

  const amountDue = invoice.amount_due ?? 0;
  const currency = invoice.currency ?? 'usd';
  const hostedInvoiceUrl = invoice.hosted_invoice_url ?? null;

  console.error('[Stripe Webhook] Payment failed:', {
    invoiceId: invoice.id,
    subscriptionId,
    customerId,
    amountDue: `${amountDue / 100} ${currency}`,
    hostedInvoiceUrl,
    attemptCount: invoice.attempt_count,
  });

  // Optionally find and update the company record
  if (subscriptionId) {
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (company) {
      console.error(`[Stripe Webhook] Payment failed for company ${company.id}, invoice ${invoice.id}`);
      // Future: trigger email notification, schedule retry, or set a payment_failed flag
    }
  }
}

/**
 * Extract typed metadata from a Stripe session or subscription object.
 */
function extractMetadata(
  session: Stripe.Checkout.Session | Stripe.Subscription,
): { companyId: string | null; planId: string | null; userId: string | null } {
  const metadata = session.metadata || {};
  return {
    companyId: metadata.companyId || null,
    planId: metadata.planId || null,
    userId: metadata.userId || null,
  };
}
