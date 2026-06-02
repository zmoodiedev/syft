import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const userDoc = await db.collection('users').doc(id).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const data = userDoc.data()!;
    return NextResponse.json({
      id: userDoc.id,
      displayName: data.displayName ?? null,
      photoURL: data.photoURL ?? null,
      bio: data.bio ?? null,
      tier: data.tier ?? 'Free',
      profileVisibility: data.profileVisibility ?? 'public',
      friendsVisibility: data.friendsVisibility ?? 'public',
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
