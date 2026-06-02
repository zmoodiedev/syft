import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.split('Bearer ')[1];
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let fromUserId: string;
  try {
    const decoded = await auth.verifyIdToken(token);
    fromUserId = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const body = await req.json();
  const { userId, type, fromUserName, fromUserPhoto, relatedItemId, relatedItemName, recipeId } = body;

  if (!userId || !type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (body.fromUserId !== fromUserId) {
    return NextResponse.json({ error: 'fromUserId mismatch' }, { status: 403 });
  }

  try {
    const notification: Record<string, unknown> = {
      userId,
      type,
      fromUserId,
      fromUserName: fromUserName ?? null,
      fromUserPhoto: fromUserPhoto ?? null,
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
    };
    if (relatedItemId !== undefined) notification.relatedItemId = relatedItemId;
    if (relatedItemName !== undefined) notification.relatedItemName = relatedItemName;
    if (recipeId !== undefined) notification.recipeId = recipeId;

    const ref = await db.collection('notifications').add(notification);
    return NextResponse.json({ id: ref.id });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
