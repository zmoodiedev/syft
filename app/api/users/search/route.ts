import { NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    // Require authentication
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = await auth.verifyIdToken(token);
    const requestingUserId = decoded.uid;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.toLowerCase().trim() || '';
    if (!q) return NextResponse.json([]);

    const snapshot = await db.collection('users').get();

    interface UserDoc {
      id: string;
      displayName?: string;
      email?: string;
      photoURL?: string;
      profileVisibility?: string;
    }

    const results = (snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserDoc[])
      .filter(user => {
        // Exclude the searching user
        if (user.id === requestingUserId) return false;
        // Exclude private profiles
        if (user.profileVisibility === 'private') return false;
        // Match on display name or email — results never expose the email field
        const nameMatch = user.displayName?.toLowerCase().includes(q) ?? false;
        const emailMatch = user.email?.toLowerCase().includes(q) ?? false;
        return nameMatch || emailMatch;
      })
      .slice(0, 20)
      .map(user => ({
        id: user.id,
        displayName: user.displayName ?? null,
        photoURL: user.photoURL ?? null,
      }));

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
  }
}
