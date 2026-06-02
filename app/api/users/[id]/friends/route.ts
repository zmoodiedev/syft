import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = await params;

  try {
    const targetUserDoc = await db.collection('users').doc(id).get();
    if (!targetUserDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const friendsVisibility = targetUserDoc.data()?.friendsVisibility ?? 'public';

    if (friendsVisibility === 'private') {
      const token = req.headers.get('Authorization')?.split('Bearer ')[1];
      if (!token) return NextResponse.json({ friends: [] });

      let callerId: string;
      try {
        const decoded = await auth.verifyIdToken(token);
        callerId = decoded.uid;
      } catch {
        return NextResponse.json({ friends: [] });
      }

      const [snap1, snap2] = await Promise.all([
        db.collection('friendships').doc(`${callerId}_${id}`).get(),
        db.collection('friendships').doc(`${id}_${callerId}`).get(),
      ]);
      if (!snap1.exists && !snap2.exists) {
        return NextResponse.json({ friends: [] });
      }
    }

    const snap = await db.collection('friendships').where('userIds', 'array-contains', id).get();
    const friends = await Promise.all(
      snap.docs.map(async (d) => {
        const friendId = (d.data().userIds as string[]).find((uid) => uid !== id);
        if (!friendId) return null;
        const userDoc = await db.collection('users').doc(friendId).get();
        if (!userDoc.exists) return null;
        const data = userDoc.data()!;
        return { id: friendId, displayName: data.displayName ?? null, photoURL: data.photoURL ?? null };
      })
    );

    return NextResponse.json({ friends: friends.filter(Boolean) });
  } catch (error) {
    console.error('Error fetching user friends:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
