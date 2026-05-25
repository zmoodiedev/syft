import { NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';
import { UserTier, DEFAULT_TIER } from '@/app/lib/tiers';

export async function PUT(request: Request) {
  // Verify the caller is authenticated
  const token = request.headers.get('Authorization')?.split('Bearer ')[1];
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let callerId: string;
  try {
    const decoded = await auth.verifyIdToken(token);
    callerId = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userId, tier } = await request.json() as { userId: string; tier: UserTier };

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Only allow users to update their own tier (Stripe webhook uses Admin SDK directly)
    if (callerId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (tier && !['Free', 'Pro', 'Beta Tester'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await userRef.update({ tier: tier || DEFAULT_TIER });

    return NextResponse.json({ success: true, message: `Tier updated to ${tier || DEFAULT_TIER}` });
  } catch (error) {
    console.error('Error updating user tier:', error);
    return NextResponse.json({ error: 'Failed to update user tier' }, { status: 500 });
  }
}
