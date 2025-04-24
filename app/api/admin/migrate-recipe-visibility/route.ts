import { NextResponse } from 'next/server';
import { db } from '@/app/lib/firebase';
import { collection, getDocs, doc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';

// Since we don't have admin auth on the client, let's provide a basic security check using a secret key
const ADMIN_SECRET = process.env.ADMIN_MIGRATION_SECRET || 'default-secret-key-not-secure';

export async function GET(request: Request) {
  try {
    // Get the URL parameters
    const url = new URL(request.url);
    const secretKey = url.searchParams.get('secret');
    
    // Verify the secret key
    if (!secretKey || secretKey !== ADMIN_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid or missing secret key.' },
        { status: 401 }
      );
    }

    // Get all recipes
    const recipesRef = collection(db, 'recipes');
    const recipesSnapshot = await getDocs(recipesRef);
    
    if (recipesSnapshot.empty) {
      return NextResponse.json({ 
        message: 'No recipes found to migrate',
        migratedCount: 0 
      });
    }

    // Create a batch to make updates more efficient
    let batch = writeBatch(db);
    let migratedCount = 0;
    const userVisibilitySettings = new Map();

    // Process each recipe
    for (const recipeDoc of recipesSnapshot.docs) {
      const recipeData = recipeDoc.data();
      const userId = recipeData.userId;
      
      // Skip if recipe already has visibility field
      if (recipeData.visibility) continue;
      
      // Get user's visibility settings (cached to reduce database reads)
      let userVisibility = 'public'; // Default to public
      
      if (userId) {
        if (userVisibilitySettings.has(userId)) {
          // Use cached settings
          userVisibility = userVisibilitySettings.get(userId);
        } else {
          // Get settings from database
          try {
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              userVisibility = userData.recipeVisibility || 'public';
              // Cache for future recipes by same user
              userVisibilitySettings.set(userId, userVisibility);
            }
          } catch (error) {
            console.error(`Error getting visibility for user ${userId}:`, error);
            // Continue with default visibility
          }
        }
      }
      
      // Update the recipe with visibility field
      batch.update(recipeDoc.ref, {
        visibility: userVisibility,
        updatedAt: serverTimestamp()
      });
      
      migratedCount++;
      
      // Firestore has a limit of 500 operations per batch
      if (migratedCount % 400 === 0) {
        await batch.commit();
        // Create a new batch
        batch = writeBatch(db);
      }
    }
    
    // Commit any remaining updates
    if (migratedCount % 400 !== 0) {
      await batch.commit();
    }
    
    return NextResponse.json({
      message: 'Recipe visibility migration completed successfully',
      migratedCount
    });
  } catch (error) {
    console.error('Error migrating recipe visibility:', error);
    return NextResponse.json(
      { error: 'Failed to migrate recipe visibility' },
      { status: 500 }
    );
  }
} 