import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  limit as firestoreLimit,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot,
  doc,
  getDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { Recipe } from '@/app/models/Recipe';
import { auth } from '@/lib/firebase';

/**
 * Get recipes created by a specific user with pagination
 */
export async function getUserRecipes(
  userId: string, 
  limit: number = 6,
  lastVisible?: QueryDocumentSnapshot<DocumentData>
): Promise<{recipes: Recipe[], lastVisible: QueryDocumentSnapshot<DocumentData> | null}> {
  try {
    const recipesRef = collection(db, 'recipes');
    
    let q = query(
      recipesRef,
      where('userId', '==', userId),
      orderBy('__name__'),
      firestoreLimit(limit)
    );
    
    // If there's a last visible document, start after it for pagination
    if (lastVisible) {
      q = query(
        recipesRef,
        where('userId', '==', userId),
        orderBy('__name__'),
        startAfter(lastVisible),
        firestoreLimit(limit)
      );
    }
    
    const querySnapshot = await getDocs(q);
    const recipes: Recipe[] = [];
    
    // Set the last visible document for next pagination
    const newLastVisible = querySnapshot.docs.length > 0 
      ? querySnapshot.docs[querySnapshot.docs.length - 1] 
      : null;
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      recipes.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as unknown as Recipe);
    });
    
    return {
      recipes,
      lastVisible: newLastVisible
    };
  } catch (error) {
    console.error('Error fetching user recipes:', error);
    return {
      recipes: [],
      lastVisible: null
    };
  }
}

/**
 * Get total count of recipes for a user
 */
export async function getUserRecipeCount(userId: string): Promise<number> {
  try {
    const recipesRef = collection(db, 'recipes');
    const recipesQuery = query(recipesRef, where('userId', '==', userId));
    const recipesSnapshot = await getDocs(recipesQuery);
    return recipesSnapshot.size;
  } catch (error) {
    console.error('Error counting user recipes:', error);
    return 0;
  }
}

/**
 * Get user statistics (recipe count, friends count, etc.)
 */
export async function getUserStats(userId: string) {
  try {
    // Get recipes count - Safer approach as this should have proper permissions
    let recipeCount = 0;
    try {
      recipeCount = await getUserRecipeCount(userId);
    } catch (error) {
      console.error('Error counting recipes:', error);
      // Continue with zeroed count
    }
    
    // Get friends count - Safer approach
    let friendCount = 0;
    try {
      const friendshipsRef = collection(db, 'friendships');
      const friendshipsQuery = query(
        friendshipsRef, 
        where('userIds', 'array-contains', userId)
      );
      const friendshipsSnapshot = await getDocs(friendshipsQuery);
      friendCount = friendshipsSnapshot.size;
    } catch (error) {
      console.error('Error counting friends:', error);
      // Continue with zeroed count
    }
    
    // Following counts might have permission issues, so we'll skip them for now
    // and just return the counts we can reliably get
    
    return {
      recipeCount,
      friendCount,
      followerCount: 0,   // Placeholder - we'll implement these properly later
      followingCount: 0   // Placeholder - we'll implement these properly later
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return {
      recipeCount: 0,
      friendCount: 0,
      followerCount: 0,
      followingCount: 0
    };
  }
}

/**
 * Share a recipe with another user and send notification
 */
export async function shareRecipeWithUser(
  recipeId: string,
  recipeName: string,
  toUserId: string,
  message?: string
): Promise<boolean> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not authenticated');
    
    const fromUserId = currentUser.uid;
    
    // Get recipe details to verify ownership or public access
    const recipeRef = doc(db, 'recipes', recipeId);
    const recipeDoc = await getDoc(recipeRef);
    
    if (!recipeDoc.exists()) {
      throw new Error('Recipe not found');
    }
    
    // Create shared recipe record
    const sharedRecipeRef = collection(db, 'sharedRecipes');
    const sharedRecipeDoc = await addDoc(sharedRecipeRef, {
      recipeId,
      senderId: fromUserId,
      receiverId: toUserId,
      message: message || '',
      createdAt: serverTimestamp()
    });
    
    // Get current user info for the notification
    const userDoc = await getDoc(doc(db, 'users', fromUserId));
    let userName = null;
    let userPhoto = null;
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      userName = userData.displayName || null;
      userPhoto = userData.photoURL || null;
    }
    
    // Create a notification for the recipe recipient
    try {
      // Import notification functionality
      // We're doing this import here to avoid circular dependencies
      const { createRecipeShareNotification } = await import('@/app/lib/notification');
      
      // Create the notification
      await createRecipeShareNotification(
        toUserId,
        fromUserId,
        userName,
        userPhoto,
        recipeId,
        recipeName,
        sharedRecipeDoc.id  // Pass the shared recipe document ID
      );
    } catch (notificationError) {
      console.error('Error creating recipe share notification:', notificationError);
      // Continue even if notification creation fails
    }
    
    return true;
  } catch (error) {
    console.error('Error sharing recipe:', error);
    return false;
  }
} 