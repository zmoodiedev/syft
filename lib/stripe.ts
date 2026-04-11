import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-03-25.dahlia',
});

/** Map planId + currency to a Stripe Price ID */
export const PRICE_IDS: Record<string, Record<string, string>> = {
  monthly: {
    USD: process.env.STRIPE_PRO_MONTHLY_PRICE_ID_USD ?? '',
    CAD: process.env.STRIPE_PRO_MONTHLY_PRICE_ID_CAD ?? '',
  },
  yearly: {
    USD: process.env.STRIPE_PRO_YEARLY_PRICE_ID_USD ?? '',
    CAD: process.env.STRIPE_PRO_YEARLY_PRICE_ID_CAD ?? '',
  },
};
