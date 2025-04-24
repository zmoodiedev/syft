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
  lastVisible?: QueryDocumentSnapshot<DocumentData>,
  currentUserId?: string
): Promise<{recipes: Recipe[], lastVisible: QueryDocumentSnapshot<DocumentData> | null}> {
  try {
    const recipesRef = collection(db, 'recipes');
    const isOwnProfile = currentUserId === userId;
    
    let q;
    
    if (isOwnProfile) {
      // User viewing their own recipes - show all regardless of visibility
      q = query(
        recipesRef,
        where('userId', '==', userId),
        orderBy('__name__'),
        firestoreLimit(limit)
      );
    } else if (currentUserId) {
      // Another user viewing someone's recipes - check friend relationship
      // This is a simpler implementation that still relies on frontend filtering
      // A full implementation would check friendships in the database
      q = query(
        recipesRef,
        where('userId', '==', userId),
        orderBy('__name__'),
        firestoreLimit(limit)
      );
    } else {
      // Not logged in - only show public recipes
      q = query(
        recipesRef,
        where('userId', '==', userId),
        where('visibility', '==', 'public'),
        orderBy('__name__'),
        firestoreLimit(limit)
      );
    }
    
    // If there's a last visible document, start after it for pagination
    if (lastVisible) {
      if (isOwnProfile) {
        q = query(
          recipesRef,
          where('userId', '==', userId),
          orderBy('__name__'),
          startAfter(lastVisible),
          firestoreLimit(limit)
        );
      } else if (currentUserId) {
        q = query(
          recipesRef,
          where('userId', '==', userId),
          orderBy('__name__'),
          startAfter(lastVisible),
          firestoreLimit(limit)
        );
      } else {
        q = query(
          recipesRef,
          where('userId', '==', userId),
          where('visibility', '==', 'public'),
          orderBy('__name__'),
          startAfter(lastVisible),
          firestoreLimit(limit)
        );
      }
    }
    
    const querySnapshot = await getDocs(q);
    let recipes: Recipe[] = [];
    
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
    
    // If viewing someone else's recipes, filter based on visibility
    if (!isOwnProfile && currentUserId) {
      // For a complete implementation, you would check friendship status here
      // This simplified version just filters out private recipes
      recipes = recipes.filter(recipe => {
        const visibility = recipe.visibility?.toLowerCase() || 'public';
        return visibility !== 'private';
      });
    }
    
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
    // Get recipes count - Only count public recipes for non-authenticated users
    let recipeCount = 0;
    try {
      const recipesRef = collection(db, 'recipes');
      // Only query for public recipes unless we're authenticated
      const currentUser = auth.currentUser;
      let recipesQuery;
      
      if (currentUser) {
        if (currentUser.uid === userId) {
          // User viewing their own recipes - count all
          recipesQuery = query(recipesRef, where('userId', '==', userId));
        } else {
          // Another user viewing someone's recipes - count all non-private
          recipesQuery = query(
            recipesRef, 
            where('userId', '==', userId),
            where('visibility', 'in', ['public', 'friends'])
          );
        }
      } else {
        // Not authenticated - only count public recipes
        recipesQuery = query(
          recipesRef, 
          where('userId', '==', userId),
          where('visibility', '==', 'public')
        );
      }
      
      const recipesSnapshot = await getDocs(recipesQuery);
      recipeCount = recipesSnapshot.size;
    } catch (error) {
      console.error('Error counting recipes:', error);
      // Continue with zeroed count
    }
    
    // Get friends count - Only attempt if user is authenticated
    let friendCount = 0;
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        // We have permission to read friendships data when authenticated
        const friendshipsRef = collection(db, 'friendships');
        const friendshipsQuery = query(
          friendshipsRef, 
          where('userIds', 'array-contains', userId)
        );
        const friendshipsSnapshot = await getDocs(friendshipsQuery);
        friendCount = friendshipsSnapshot.size;
      }
    } catch (error) {
      console.error('Error counting friends:', error);
      // Continue with zeroed count
    }
    
    // Get follower/following counts only if authenticated
    let followerCount = 0;
    let followingCount = 0;
    
    try {
      // Try to get following count
      const followingRef = doc(db, 'userFollowing', userId);
      const followingDoc = await getDoc(followingRef);
      
      if (followingDoc.exists() && followingDoc.data().following) {
        followingCount = followingDoc.data().following.length;
      }
      
      // Count followers by checking who is following this user
      // Query all userFollowing documents
      const userFollowingRef = collection(db, 'userFollowing');
      const allFollowingDocs = await getDocs(userFollowingRef);
      
      // Check each document to see if it includes this user in its following array
      allFollowingDocs.forEach(doc => {
        const data = doc.data();
        if (data.following && Array.isArray(data.following) && data.following.includes(userId)) {
          followerCount++;
        }
      });
    } catch (error) {
      console.error('Error counting followers/following:', error);
      // Continue with zeroed counts
    }
    
    return {
      recipeCount,
      friendCount,
      followerCount,
      followingCount
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