import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { NextResponse } from 'next/server';
import { UserTier, DEFAULT_TIER } from '@/app/lib/tiers';

export async function PUT(request: Request) {
  try {
    const { userId, tier } = await request.json() as { userId: string; tier: UserTier };
    
    // Validation
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Make sure the tier is valid
    if (tier && !['Free', 'Pro', 'Beta Tester'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }
    
    // Check if user exists
    const userRef = doc(db, 'users', userId);
    const userSnapshot = await getDoc(userRef);
    
    if (!userSnapshot.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Update the user's tier
    await updateDoc(userRef, {
      tier: tier || DEFAULT_TIER
    });
    
    return NextResponse.json({ 
      success: true, 
      message: `User tier updated to ${tier || DEFAULT_TIER}` 
    });
  } catch (error) {
    console.error('Error updating user tier:', error);
    return NextResponse.json({ error: 'Failed to update user tier' }, { status: 500 });
  }
} 