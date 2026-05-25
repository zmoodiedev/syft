import { NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  // Require a valid Firebase session in addition to the shared secret
  const token = request.headers.get('Authorization')?.split('Bearer ')[1];
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await auth.verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const secret = process.env.ADMIN_MIGRATION_SECRET;
  if (!secret) {
    console.error('ADMIN_MIGRATION_SECRET is not set');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { userId, secret: provided } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!provided || provided !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await userRef.update({ role: 'admin' });

    return NextResponse.json({ success: true, message: `User ${userId} is now an admin` });
  } catch (error) {
    console.error('Error setting admin role:', error);
    return NextResponse.json({ error: 'Failed to set admin role' }, { status: 500 });
  }
}
