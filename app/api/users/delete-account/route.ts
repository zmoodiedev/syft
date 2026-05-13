import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { auth, db } from '@/lib/firebase-admin';
import { stripe } from '@/lib/stripe';
import { logEvent } from '@/lib/analytics-server';

export const runtime = 'nodejs';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

function extractCloudinaryPublicId(url: string): string | null {
  try {
    if (!url.includes('cloudinary.com')) return null;
    const segments = new URL(url).pathname.split('/');
    const uploadIdx = segments.findIndex(s => s === 'upload');
    if (uploadIdx === -1) return null;
    const afterUpload = segments.slice(uploadIdx + 1).filter(s => !/^v\d+$/.test(s));
    return afterUpload.join('/') || null;
  } catch {
    return null;
  }
}

async function destroyCloudinaryImage(url: string) {
  const publicId = extractCloudinaryPublicId(url);
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}

export async function DELETE(request: Request) {
  try {
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = await auth.verifyIdToken(token);
    const userId = decoded.uid;

    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    // Delete Firestore user document first so the profile is immediately inaccessible
    await db.collection('users').doc(userId).delete();

    // Delete Firebase Auth user so they can't log back in
    await auth.deleteUser(userId);

    // Remaining steps are best-effort cleanup — errors are logged but don't fail the request
    try {
      // Cancel active Stripe subscription
      if (userData?.stripeCustomerId) {
        const subscriptions = await stripe.subscriptions.list({
          customer: userData.stripeCustomerId,
          status: 'active',
          limit: 5,
        });
        await Promise.all(subscriptions.data.map(sub => stripe.subscriptions.cancel(sub.id)));
      }
    } catch (err) {
      console.error('Error cancelling subscription during account deletion:', err);
    }

    try {
      // Delete all recipes + their Cloudinary images
      const recipesSnap = await db.collection('recipes').where('userId', '==', userId).get();
      const recipeBatch = db.batch();
      for (const d of recipesSnap.docs) {
        const imageUrl = d.data().imageUrl;
        if (imageUrl) {
          try { await destroyCloudinaryImage(imageUrl); } catch {}
        }
        recipeBatch.delete(d.ref);
      }
      if (!recipesSnap.empty) await recipeBatch.commit();
    } catch (err) {
      console.error('Error deleting recipes during account deletion:', err);
    }

    try {
      // Delete shared recipe links
      const sharedSnap = await db.collection('sharedRecipes').where('userId', '==', userId).get();
      if (!sharedSnap.empty) {
        const sharedBatch = db.batch();
        for (const d of sharedSnap.docs) sharedBatch.delete(d.ref);
        await sharedBatch.commit();
      }
    } catch (err) {
      console.error('Error deleting shared recipes during account deletion:', err);
    }

    try {
      // Delete friendships
      const friendshipsSnap = await db.collection('friendships')
        .where('userIds', 'array-contains', userId)
        .get();
      if (!friendshipsSnap.empty) {
        const friendBatch = db.batch();
        for (const d of friendshipsSnap.docs) friendBatch.delete(d.ref);
        await friendBatch.commit();
      }

      // Delete friend requests (sent and received)
      const [sentSnap, recvSnap] = await Promise.all([
        db.collection('friendRequests').where('senderId', '==', userId).get(),
        db.collection('friendRequests').where('receiverId', '==', userId).get(),
      ]);
      const allReqs = [...sentSnap.docs, ...recvSnap.docs];
      if (allReqs.length > 0) {
        const reqBatch = db.batch();
        for (const d of allReqs) reqBatch.delete(d.ref);
        await reqBatch.commit();
      }
    } catch (err) {
      console.error('Error deleting friendships/requests during account deletion:', err);
    }

    try {
      // Delete notifications
      const notifSnap = await db.collection('notifications').where('userId', '==', userId).get();
      if (!notifSnap.empty) {
        const notifBatch = db.batch();
        for (const d of notifSnap.docs) notifBatch.delete(d.ref);
        await notifBatch.commit();
      }
    } catch (err) {
      console.error('Error deleting notifications during account deletion:', err);
    }

    try {
      // Delete profile photo from Cloudinary
      if (userData?.photoURL) {
        await destroyCloudinaryImage(userData.photoURL);
      }
    } catch (err) {
      console.error('Error deleting profile photo during account deletion:', err);
    }

    await logEvent(userId, 'account_deleted');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
