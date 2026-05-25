import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import webpush from 'web-push';
import { FieldValue } from 'firebase-admin/firestore';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.split('Bearer ')[1];
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await auth.verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { toUserId, type, senderName, recipeName } = await req.json();
  if (!toUserId || !type) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const userDoc = await db.collection('users').doc(toUserId).get();
  if (!userDoc.exists) return NextResponse.json({ ok: true });

  const userData = userDoc.data()!;
  if (!userData.pushNotificationsEnabled || !userData.pushSubscription) {
    return NextResponse.json({ ok: true });
  }

  let subscription: webpush.PushSubscription;
  try {
    subscription = JSON.parse(userData.pushSubscription);
  } catch {
    return NextResponse.json({ ok: true });
  }

  const messages: Record<string, { title: string; body: string; url: string }> = {
    friend_request: {
      title: 'New friend request',
      body: `${senderName || 'Someone'} wants to be your friend on Syft.`,
      url: `/profile/${toUserId}?tab=friends`,
    },
    recipe_share: {
      title: 'Recipe shared with you',
      body: `${senderName || 'A friend'} shared "${recipeName || 'a recipe'}" with you.`,
      url: '/recipes',
    },
  };

  const payload = messages[type];
  if (!payload) return NextResponse.json({ error: 'Unknown type' }, { status: 400 });

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err: unknown) {
    // Expired or invalid subscription — clean up so we don't keep trying
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 410 || statusCode === 404) {
      await db.collection('users').doc(toUserId).update({
        pushSubscription: FieldValue.delete(),
        pushNotificationsEnabled: false,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
