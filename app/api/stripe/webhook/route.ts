import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// Raw body required for Stripe signature verification
export const runtime = 'nodejs';

const FREE_RECIPE_LIMIT = 15;

/** Mark recipes beyond the free-tier limit as locked (oldest 15 are safe). */
async function lockOverflowRecipes(userId: string) {
  const snap = await db.collection('recipes')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'asc')
    .get();

  if (snap.size <= FREE_RECIPE_LIMIT) return;

  const overflow = snap.docs.slice(FREE_RECIPE_LIMIT);
  const batch = db.batch();
  for (const d of overflow) {
    batch.update(d.ref, { locked: true });
  }
  await batch.commit();
}

/** Remove locked flag from all recipes belonging to this user. */
async function unlockAllRecipes(userId: string) {
  const snap = await db.collection('recipes')
    .where('userId', '==', userId)
    .where('locked', '==', true)
    .get();

  if (snap.empty) return;

  const batch = db.batch();
  for (const d of snap.docs) {
    batch.update(d.ref, { locked: FieldValue.delete() });
  }
  await batch.commit();
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription') break;

        const userId = session.metadata?.userId;
        if (!userId) break;

        // Fetch subscription details for billing cycle + renewal date
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        const subItem = subscription.items.data[0];
        const interval = subItem?.plan?.interval;
        // current_period_end lives on the subscription item in API ≥ 2026-03-25
        const periodEnd: number =
          (subItem as unknown as { current_period_end?: number }).current_period_end ??
          (subscription as unknown as { current_period_end?: number }).current_period_end ??
          0;

        await db.collection('users').doc(userId).update({
          tier: 'Pro',
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          subscriptionStatus: 'active',
          billingCycle: interval === 'year' ? 'yearly' : 'monthly',
          currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
          pendingTier: FieldValue.delete(),
          pendingBillingCycle: FieldValue.delete(),
          updatedAt: new Date(),
        });

        // Unlock any recipes locked during a previous downgrade
        await unlockAllRecipes(userId);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (!userId) break;

        const isActive = subscription.status === 'active';
        const updSubItem = subscription.items.data[0];
        const interval = updSubItem?.plan?.interval;
        const updPeriodEnd: number =
          (updSubItem as unknown as { current_period_end?: number }).current_period_end ??
          (subscription as unknown as { current_period_end?: number }).current_period_end ??
          0;

        const prevUserSnap = await db.collection('users').doc(userId).get();
        const prevTier = prevUserSnap.data()?.tier;

        await db.collection('users').doc(userId).update({
          tier: isActive ? 'Pro' : 'Free',
          subscriptionStatus: subscription.status,
          billingCycle: interval === 'year' ? 'yearly' : 'monthly',
          currentPeriodEnd: updPeriodEnd ? new Date(updPeriodEnd * 1000) : null,
          updatedAt: new Date(),
        });

        if (isActive && prevTier !== 'Pro') {
          // Re-activated — unlock any previously locked recipes
          await unlockAllRecipes(userId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (!userId) break;

        await db.collection('users').doc(userId).update({
          tier: 'Free',
          subscriptionStatus: 'canceled',
          stripeSubscriptionId: FieldValue.delete(),
          currentPeriodEnd: FieldValue.delete(),
          billingCycle: FieldValue.delete(),
          updatedAt: new Date(),
        });

        // Lock recipes beyond the free-tier limit
        await lockOverflowRecipes(userId);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        // Future: trigger email notification
        console.warn('Payment failed for Stripe customer:', invoice.customer);
        break;
      }
    }
  } catch (error) {
    console.error(`Error handling Stripe event "${event.type}":`, error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
