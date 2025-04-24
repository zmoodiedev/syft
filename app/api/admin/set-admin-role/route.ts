import { NextResponse } from 'next/server';
import { db } from '@/app/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

// Secret key for authorization
const ADMIN_SECRET = process.env.ADMIN_MIGRATION_SECRET || 'default-secret-key-not-secure';

export async function POST(request: Request) {
  try {
    // Get request body
    const body = await request.json();
    const { userId, secret } = body;
    
    // Validate request
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    if (!secret || secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user exists
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Update user role to admin
    await updateDoc(userRef, { role: 'admin' });
    
    return NextResponse.json({
      success: true,
      message: `User ${userId} has been set as an admin`
    });
  } catch (error) {
    console.error('Error setting admin role:', error);
    return NextResponse.json({ error: 'Failed to set admin role' }, { status: 500 });
  }
} 