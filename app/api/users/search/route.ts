import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.toLowerCase() || '';
    
    if (!q || q.length < 2) {
      return NextResponse.json([]);
    }

    // Simple approach: get all users and filter client-side
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    const users = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          email: data.email || null,
          displayName: data.displayName || null,
          photoURL: data.photoURL || null
        };
      })
      .filter(user => 
        (user.email && user.email.toLowerCase().includes(q)) ||
        (user.displayName && user.displayName.toLowerCase().includes(q))
      );

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json([], { status: 200 }); // Return empty results on error
  }
} 