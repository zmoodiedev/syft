import { NextResponse } from 'next/server';
import { stripe, PRICE_IDS } from '@/lib/stripe';
import { db, auth } from '@/lib/firebase-admin';
import { logEvent } from '@/lib/analytics-server';

export async function POST(request: Request) {
  try {
    // Verify Firebase auth token
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const decoded = await auth.verifyIdToken(token);
    const userId = decoded.uid;

    const { planId, currency = 'USD' } = await request.json() as {
      planId: 'monthly' | 'yearly';
      currency?: 'USD' | 'CAD';
    };

    const priceId = PRICE_IDS[planId]?.[currency];
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan or currency' }, { status: 400 });
    }

    // Get or create Stripe customer
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let customerId: string = userData.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.email,
        name: userData.displayName ?? undefined,
        metadata: { userId },
      });
      customerId = customer.id;
      await db.collection('users').doc(userId).update({ stripeCustomerId: customerId });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing?success=true`,
      cancel_url: `${appUrl}/signup`,
      metadata: { userId },
      subscription_data: {
        metadata: { userId }, // copied to subscription for webhook events
      },
    });

    await logEvent(userId, 'checkout_started', { planId, currency });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout session error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
