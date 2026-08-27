import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export class StripeNotConfiguredError extends Error {
  constructor() {
    super('STRIPE_SECRET_KEY is not configured');
    this.name = 'StripeNotConfiguredError';
  }
}

export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new StripeNotConfiguredError();
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2025-10-29.clover',
    });
  }

  return stripeClient;
}
