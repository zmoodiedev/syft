import { NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';
import { TIER_FEATURES } from '@/app/lib/tiers';
import { FieldValue } from 'firebase-admin/firestore';
import { logEvent } from '@/lib/analytics-server';

export async function POST(request: Request) {
  // Verify auth token
  const token = request.headers.get('Authorization')?.split('Bearer ')[1];
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let userId: string;
  try {
    const decoded = await auth.verifyIdToken(token);
    userId = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    // Fetch user tier from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    const tier = (userDoc.data()?.tier as keyof typeof TIER_FEATURES) ?? 'Free';
    const limit = TIER_FEATURES[tier]?.maxRecipes ?? 15;

    // Count existing recipes (server-side, no client bypass possible)
    const countSnap = await db.collection('recipes')
      .where('userId', '==', userId)
      .select()
      .get();
    const count = countSnap.size;

    if (count >= limit) {
      await logEvent(userId, 'recipe_limit_reached', { count, limit, tier });
      return NextResponse.json(
        { error: 'limit_reached', limit, count },
        { status: 403 }
      );
    }

    // Strip any client-supplied userId and write with the verified one
    const body = await request.json();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { userId: _ignored, id: _id, ...recipeFields } = body;

    const docRef = await db.collection('recipes').add({
      ...recipeFields,
      userId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ id: docRef.id, count: count + 1, limit });
  } catch (error) {
    console.error('Error creating recipe:', error);
    return NextResponse.json({ error: 'Failed to create recipe' }, { status: 500 });
  }
}
