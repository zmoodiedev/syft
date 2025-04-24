import { NextResponse } from 'next/server';
import { db } from '@/app/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Simple API to check a recipe without auth
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const recipeId = url.searchParams.get('id');
    
    if (!recipeId) {
      return NextResponse.json({ error: 'Recipe ID is required' }, { status: 400 });
    }
    
    const recipeRef = doc(db, 'recipes', recipeId);
    
    try {
      const recipeSnap = await getDoc(recipeRef);
      
      if (!recipeSnap.exists()) {
        return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
      }
      
      // Get basic recipe data including visibility
      const recipeData = recipeSnap.data();
      
      return NextResponse.json({
        id: recipeSnap.id,
        visibility: recipeData.visibility,
        visibilityType: typeof recipeData.visibility,
        publicChecks: {
          exactEqual: recipeData.visibility === 'public',
          lowerEqual: String(recipeData.visibility).toLowerCase() === 'public',
          contained: String(recipeData.visibility).toLowerCase().includes('public')
        },
        userId: recipeData.userId,
        name: recipeData.name,
      });
    } catch (error) {
      console.error('Error getting recipe:', error);
      return NextResponse.json({ error: 'Access denied or error getting recipe' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 