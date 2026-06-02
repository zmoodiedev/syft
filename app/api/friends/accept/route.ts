import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.split('Bearer ')[1];
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let userId: string;
  try {
    const decoded = await auth.verifyIdToken(token);
    userId = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { requestId } = await req.json();
  if (!requestId) return NextResponse.json({ error: 'Missing requestId' }, { status: 400 });

  try {
    const requestDoc = await db.collection('friendRequests').doc(requestId).get();
    if (!requestDoc.exists) {
      return NextResponse.json({ error: 'Friend request not found' }, { status: 404 });
    }

    const requestData = requestDoc.data()!;
    if (requestData.receiverId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const friendshipId = `${requestData.senderId}_${userId}`;
    const batch = db.batch();

    batch.set(db.collection('friendships').doc(friendshipId), {
      userIds: [requestData.senderId, userId],
      createdAt: FieldValue.serverTimestamp(),
    });
    batch.delete(db.collection('friendRequests').doc(requestId));

    await batch.commit();

    await db.collection('notifications').add({
      userId: requestData.senderId,
      type: 'friend_accept',
      fromUserId: userId,
      fromUserName: requestData.receiverName ?? null,
      fromUserPhoto: requestData.receiverPhotoURL ?? null,
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, friendshipId });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
