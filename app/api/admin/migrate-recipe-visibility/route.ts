import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const secret = process.env.ADMIN_MIGRATION_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  // Accept secret via Authorization header to keep it out of server logs
  const provided = request.headers.get('Authorization')?.split('Bearer ')[1];
  if (!provided || provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const recipesSnap = await db.collection('recipes').get();

    if (recipesSnap.empty) {
      return NextResponse.json({ message: 'No recipes found to migrate', migratedCount: 0 });
    }

    const userVisibilityCache = new Map<string, string>();
    let batch = db.batch();
    let migratedCount = 0;
    let batchOps = 0;

    for (const recipeDoc of recipesSnap.docs) {
      const recipeData = recipeDoc.data();
      if (recipeData.visibility) continue;

      const userId = recipeData.userId as string | undefined;
      let userVisibility = 'public';

      if (userId) {
        if (userVisibilityCache.has(userId)) {
          userVisibility = userVisibilityCache.get(userId)!;
        } else {
          try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
              userVisibility = userDoc.data()?.recipeVisibility ?? 'public';
            }
            userVisibilityCache.set(userId, userVisibility);
          } catch (err) {
            console.error(`Error getting visibility for user ${userId}:`, err);
          }
        }
      }

      batch.update(recipeDoc.ref, {
        visibility: userVisibility,
        updatedAt: FieldValue.serverTimestamp(),
      });
      migratedCount++;
      batchOps++;

      if (batchOps === 400) {
        await batch.commit();
        batch = db.batch();
        batchOps = 0;
      }
    }

    if (batchOps > 0) await batch.commit();

    return NextResponse.json({
      message: 'Recipe visibility migration completed successfully',
      migratedCount,
    });
  } catch (error) {
    console.error('Error migrating recipe visibility:', error);
    return NextResponse.json({ error: 'Failed to migrate recipe visibility' }, { status: 500 });
  }
}
