import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { NextResponse } from 'next/server';

interface User {
  id: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.toLowerCase() || '';
    if (!q) {
      return NextResponse.json([], { status: 200 });
    }

    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    const users = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as User))
      .filter(user =>
        (user.email && user.email.toLowerCase().includes(q)) ||
        (user.displayName && user.displayName.toLowerCase().includes(q))
      )
      .map(user => ({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL || null
      }));

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
  }
} 