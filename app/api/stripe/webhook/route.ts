import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logEvent } from '@/lib/analytics-server';

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

/**
 * Auto-accept any friend requests that were blocked because the receiver was
 * on the Free tier. Called when a user upgrades to Pro.
 */
async function autoAcceptGatedFriendRequests(userId: string) {
  const snap = await db.collection('friendRequests')
    .where('receiverId', '==', userId)
    .where('blockedByTier', '==', true)
    .get();

  if (snap.empty) return;

  const batch = db.batch();

  for (const requestDoc of snap.docs) {
    const req = requestDoc.data();

    // Create the friendship
    const friendshipRef = db.collection('friendships').doc(`${req.senderId}_${userId}`);
    batch.set(friendshipRef, {
      userIds: [req.senderId, userId],
      createdAt: new Date(),
    });

    // Delete the friend request
    batch.delete(requestDoc.ref);
  }

  await batch.commit();

  // Send notifications outside the batch (addDoc can't be batched)
  for (const requestDoc of snap.docs) {
    const req = requestDoc.data();

    // Notify the original sender that the request was accepted
    await db.collection('notifications').add({
      userId: req.senderId,
      type: 'friend_accept',
      fromUserId: userId,
      fromUserName: req.receiverName || null,
      fromUserPhoto: req.receiverPhotoURL || null,
      isRead: false,
      createdAt: new Date(),
    });

    // Clean up the gated notification from the newly upgraded user's inbox
    const gatedNotifSnap = await db.collection('notifications')
      .where('userId', '==', userId)
      .where('type', '==', 'friend_request_gated')
      .where('fromUserId', '==', req.senderId)
      .get();

    for (const notifDoc of gatedNotifSnap.docs) {
      await notifDoc.ref.delete();
    }
  }
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
          subscriptionLapsedAt: FieldValue.delete(),
          updatedAt: new Date(),
        });

        // Unlock any recipes locked during a previous downgrade
        await unlockAllRecipes(userId);
        // Auto-accept any friend requests that were pending due to the free tier
        await autoAcceptGatedFriendRequests(userId);
        await logEvent(userId, 'subscription_activated', {
          billingCycle: interval === 'year' ? 'yearly' : 'monthly',
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (!userId) break;

        const status = subscription.status;
        const updSubItem = subscription.items.data[0];
        const interval = updSubItem?.plan?.interval;
        const updPeriodEnd: number =
          (updSubItem as unknown as { current_period_end?: number }).current_period_end ??
          (subscription as unknown as { current_period_end?: number }).current_period_end ??
          0;

        // Keep tier as Pro while Stripe is still retrying (past_due / trialing).
        // Only fully downgrade on terminal non-active states — those are handled
        // by subscription.deleted anyway, so this path just records the status.
        const shouldBePro = status === 'active' || status === 'past_due' || status === 'trialing';

        const prevUserSnap = await db.collection('users').doc(userId).get();
        const prevTier = prevUserSnap.data()?.tier;

        await db.collection('users').doc(userId).update({
          tier: shouldBePro ? 'Pro' : 'Free',
          subscriptionStatus: status,
          billingCycle: interval === 'year' ? 'yearly' : 'monthly',
          currentPeriodEnd: updPeriodEnd ? new Date(updPeriodEnd * 1000) : null,
          updatedAt: new Date(),
        });

        if (status === 'active' && prevTier !== 'Pro') {
          // Genuine reactivation from a lapsed state — unlock recipes and
          // accept any friend requests that were pending during the lapse.
          await unlockAllRecipes(userId);
          await autoAcceptGatedFriendRequests(userId);
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
          subscriptionLapsedAt: new Date(),
          updatedAt: new Date(),
        });

        // Lock recipes beyond the free-tier limit
        await lockOverflowRecipes(userId);
        await logEvent(userId, 'subscription_cancelled');
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
