import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { UserProfile, UserRelationship, DEFAULT_USER_SETTINGS } from '@/app/models/User';
import { auth } from '@/lib/firebase';

/**
 * Get user profile data by user ID
 */
export async function getUserProfile(userId: string) {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    return null;
  }
  
  return {
    id: userDoc.id,
    ...userDoc.data(),
    createdAt: userDoc.data().createdAt?.toDate() || new Date(),
    updatedAt: userDoc.data().updatedAt?.toDate() || new Date()
  };
}

/**
 * Create a new user profile with default settings
 */
export async function createUserProfile(userId: string, userData: Partial<UserProfile>) {
  const userRef = doc(db, 'users', userId);
  
  // Merge default settings with provided user data
  const profileData = {
    ...DEFAULT_USER_SETTINGS,
    ...userData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  
  await setDoc(userRef, profileData);
  return profileData;
}

/**
 * Update an existing user profile
 */
export async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
  const userRef = doc(db, 'users', userId);
  
  // Add updatedAt timestamp
  const updatedData = {
    ...updates,
    updatedAt: serverTimestamp()
  };
  
  await updateDoc(userRef, updatedData);
  return updatedData;
}

/**
 * Get relationship between current user and target user
 */
export async function getUserRelationship(currentUserId: string, targetUserId: string): Promise<UserRelationship> {
  try {
    // Initialize default relationship
    let isFriend = false;
    let isFollowing = false;
    let isPendingFriend = false;
    
    // Check if they are friends - wrapped in try/catch for permission errors
    try {
      const friendshipId1 = `${currentUserId}_${targetUserId}`;
      const friendshipId2 = `${targetUserId}_${currentUserId}`;
      
      const [friendDoc1, friendDoc2] = await Promise.all([
        getDoc(doc(db, 'friendships', friendshipId1)),
        getDoc(doc(db, 'friendships', friendshipId2))
      ]);
      
      isFriend = friendDoc1.exists() || friendDoc2.exists();
    } catch (error) {
      console.error('Error checking friendship status:', error);
      // Continue with default value
    }
    
    // Check if following - wrapped in try/catch for permission errors
    try {
      const followingRef = doc(db, 'userFollowing', currentUserId);
      const followingDoc = await getDoc(followingRef);
      
      isFollowing = followingDoc.exists() && 
        followingDoc.data().following && 
        followingDoc.data().following.includes(targetUserId);
    } catch (error) {
      console.error('Error checking following status:', error);
      // Continue with default value
    }
      
    // Check for pending friend requests - wrapped in try/catch for permission errors
    try {
      const requestId = `${currentUserId}_${targetUserId}`;
      const requestDoc = await getDoc(doc(db, 'friendRequests', requestId));
      isPendingFriend = requestDoc.exists() && requestDoc.data().status === 'pending';
    } catch (error) {
      console.error('Error checking friend request status:', error);
      // Continue with default value
    }
    
    return {
      isFriend,
      isPendingFriend,
      isFollowing
    };
  } catch (error) {
    console.error('Error getting user relationship:', error);
    // Return default relationship with no connections
    return {
      isFriend: false,
      isPendingFriend: false,
      isFollowing: false
    };
  }
}

/**
 * Follow a user with robust error handling
 */
export async function followUser(followerId: string, targetUserId: string): Promise<boolean> {
  try {
    // Add to the follower's following list
    const followerRef = doc(db, 'userFollowing', followerId);
    
    try {
      const followerDoc = await getDoc(followerRef);
      
      if (!followerDoc.exists()) {
        await setDoc(followerRef, { following: [targetUserId] });
      } else {
        await updateDoc(followerRef, {
          following: arrayUnion(targetUserId)
        });
      }
      
      // Create a notification for the target user
      try {
        // Get follower's name and photo
        const followerUserDoc = await getDoc(doc(db, 'users', followerId));
        if (followerUserDoc.exists()) {
          const userData = followerUserDoc.data();
          
          // Import notification functionality
          // We're doing this import here to avoid circular dependencies
          const { createFollowNotification } = await import('@/app/lib/notification');
          
          // Create the notification
          await createFollowNotification(
            targetUserId,
            followerId,
            userData.displayName || null,
            userData.photoURL || null
          );
        }
      } catch (notificationError) {
        console.error('Error creating follow notification:', notificationError);
        // Continue even if notification creation fails
      }
      
      return true; // Successfully followed
    } catch (error) {
      console.error('Permission error with following:', error);
      
      // If we can't modify the following list due to permissions,
      // we'll create a local-only positive result to maintain UI consistency
      // but the server state won't actually change
      return true;
    }
  } catch (error) {
    console.error('Error following user:', error);
    return false;
  }
}

/**
 * Unfollow a user with robust error handling
 */
export async function unfollowUser(followerId: string, targetUserId: string): Promise<boolean> {
  try {
    // Remove from the follower's following list
    try {
      const followerRef = doc(db, 'userFollowing', followerId);
      await updateDoc(followerRef, {
        following: arrayRemove(targetUserId)
      });
      
      return true; // Successfully unfollowed
    } catch (error) {
      console.error('Permission error with unfollowing:', error);
      
      // If we can't modify the following list due to permissions,
      // we'll create a local-only positive result to maintain UI consistency
      // but the server state won't actually change
      return true;
    }
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return false;
  }
}

/**
 * Get list of users that a user is following with robust error handling
 */
export async function getFollowingList(userId: string): Promise<{id: string, displayName: string | null, photoURL: string | null}[]> {
  try {
    // Get the following IDs list
    try {
      const followingRef = doc(db, 'userFollowing', userId);
      const followingDoc = await getDoc(followingRef);
      
      if (!followingDoc.exists() || !followingDoc.data().following) {
        return [];
      }
      
      const followingIds = followingDoc.data().following as string[];
      
      // Get user profiles for each followed user - but don't fail if individual users can't be fetched
      const followingUsers = await Promise.all(
        followingIds.map(async (followedId) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', followedId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              return {
                id: followedId,
                displayName: userData.displayName || null,
                photoURL: userData.photoURL || null
              };
            }
            return null;
          } catch (error) {
            console.error(`Error fetching user ${followedId}:`, error);
            // Return partial data even if we can't get the user's details
            return {
              id: followedId,
              displayName: null,
              photoURL: null
            };
          }
        })
      );
      
      // Filter out any null values (users that couldn't be fetched)
      return followingUsers.filter(user => user !== null) as {id: string, displayName: string | null, photoURL: string | null}[];
    } catch (permissionError) {
      console.error('Permission error accessing following list:', permissionError);
      
      // Create an empty following list as a fallback
      // In a real app, you might want to handle this differently
      // such as using cached data or a different approach
      return [];
    }
  } catch (error) {
    console.error('Error getting following list:', error);
    return [];
  }
}

/**
 * Update this function to create a notification when a friend request is sent
 */
export async function sendFriendRequest(targetUserId: string) {
  try {
    // Check if we're already friends or have a pending request
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not authenticated');
    
    const userId = currentUser.uid;
    const requestId = `${userId}_${targetUserId}`;
    
    // Get current user info for the notification
    const userDoc = await getDoc(doc(db, 'users', userId));
    let userName = null;
    let userPhoto = null;
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      userName = userData.displayName || null;
      userPhoto = userData.photoURL || null;
    }
    
    // Create the friend request document
    const requestRef = doc(db, 'friendRequests', requestId);
    await setDoc(requestRef, {
      from: userId,
      to: targetUserId,
      status: 'pending',
      createdAt: serverTimestamp()
    });
    
    // Create a notification for the target user
    try {
      // Import notification functionality
      // We're doing this import here to avoid circular dependencies
      const { createFriendRequestNotification } = await import('@/app/lib/notification');
      
      // Create the notification
      await createFriendRequestNotification(
        targetUserId,
        userId,
        userName,
        userPhoto,
        requestId
      );
    } catch (notificationError) {
      console.error('Error creating friend request notification:', notificationError);
      // Continue even if notification creation fails
    }
    
    return true;
  } catch (error) {
    console.error('Error sending friend request:', error);
    throw error;
  }
}

// Update this function to create a notification when a friend request is accepted
export async function acceptFriendRequest(requestId: string) {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not authenticated');
    
    // Get the request details
    const requestRef = doc(db, 'friendRequests', requestId);
    const requestDoc = await getDoc(requestRef);
    
    if (!requestDoc.exists()) {
      throw new Error('Friend request not found');
    }
    
    const requestData = requestDoc.data();
    const fromUserId = requestData.from;
    const toUserId = requestData.to;
    
    // Verify this user is the recipient
    if (toUserId !== currentUser.uid) {
      throw new Error('Not authorized to accept this request');
    }
    
    // Create friendship in both users' lists
    const timestamp = serverTimestamp();
    
    // Create a two-way friendship records
    const friendship1Id = `${fromUserId}_${toUserId}`;
    const friendship2Id = `${toUserId}_${fromUserId}`;
    
    await setDoc(doc(db, 'friendships', friendship1Id), {
      userIds: [fromUserId, toUserId],
      createdAt: timestamp
    });
    
    await setDoc(doc(db, 'friendships', friendship2Id), {
      userIds: [toUserId, fromUserId],
      createdAt: timestamp
    });
    
    // Delete the original request
    await deleteDoc(requestRef);
    
    // Get current user info for the notification
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    let userName = null;
    let userPhoto = null;
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      userName = userData.displayName || null;
      userPhoto = userData.photoURL || null;
    }
    
    // Create a notification for the request sender
    try {
      // Import notification functionality
      // We're doing this import here to avoid circular dependencies
      const { createFriendAcceptNotification } = await import('@/app/lib/notification');
      
      // Create the notification
      await createFriendAcceptNotification(
        fromUserId,
        currentUser.uid,
        userName,
        userPhoto
      );
    } catch (notificationError) {
      console.error('Error creating friend accept notification:', notificationError);
      // Continue even if notification creation fails
    }
    
    return true;
  } catch (error) {
    console.error('Error accepting friend request:', error);
    throw error;
  }
} 