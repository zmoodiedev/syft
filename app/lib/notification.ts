import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp
} from 'firebase/firestore';
import { Notification } from '@/app/models/User';

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  limitCount: number = 20,
  onlyUnread: boolean = false
): Promise<Notification[]> {
  try {
    const notificationsRef = collection(db, 'notifications');
    
    // Create query with proper filters
    let notificationsQuery = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    // Add unread filter if required
    if (onlyUnread) {
      notificationsQuery = query(
        notificationsRef,
        where('userId', '==', userId),
        where('isRead', '==', false),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    }
    
    // Execute query
    const querySnapshot = await getDocs(notificationsQuery);
    const notifications: Notification[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as Notification);
    });
    
    return notifications;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const notificationsRef = collection(db, 'notifications');
    const unreadQuery = query(
      notificationsRef,
      where('userId', '==', userId),
      where('isRead', '==', false)
    );
    
    const querySnapshot = await getDocs(unreadQuery);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error counting unread notifications:', error);
    return 0;
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      isRead: true
    });
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

/**
 * Mark all notifications for a user as read
 */
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    const notificationsRef = collection(db, 'notifications');
    const unreadQuery = query(
      notificationsRef,
      where('userId', '==', userId),
      where('isRead', '==', false)
    );
    
    const querySnapshot = await getDocs(unreadQuery);
    
    // Use Promise.all to batch update all notifications
    const updatePromises = querySnapshot.docs.map(doc => 
      updateDoc(doc.ref, { isRead: true })
    );
    
    await Promise.all(updatePromises);
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await deleteDoc(notificationRef);
    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
}

/**
 * Create a follow notification
 */
export async function createFollowNotification(
  toUserId: string,
  fromUserId: string,
  fromUserName: string | null,
  fromUserPhoto: string | null
): Promise<string | null> {
  try {
    const notificationsRef = collection(db, 'notifications');
    const notification = {
      userId: toUserId,
      type: 'follow',
      fromUserId,
      fromUserName,
      fromUserPhoto,
      isRead: false,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(notificationsRef, notification);
    return docRef.id;
  } catch (error) {
    console.error('Error creating follow notification:', error);
    return null;
  }
}

/**
 * Create a friend request notification
 */
export async function createFriendRequestNotification(
  toUserId: string,
  fromUserId: string,
  fromUserName: string | null,
  fromUserPhoto: string | null,
  requestId: string
): Promise<string | null> {
  try {
    const notificationsRef = collection(db, 'notifications');
    const notification = {
      userId: toUserId,
      type: 'friend_request',
      fromUserId,
      fromUserName,
      fromUserPhoto,
      relatedItemId: requestId,
      isRead: false,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(notificationsRef, notification);
    return docRef.id;
  } catch (error) {
    console.error('Error creating friend request notification:', error);
    return null;
  }
}

/**
 * Create a friend accept notification
 */
export async function createFriendAcceptNotification(
  toUserId: string,
  fromUserId: string,
  fromUserName: string | null,
  fromUserPhoto: string | null
): Promise<string | null> {
  try {
    const notificationsRef = collection(db, 'notifications');
    const notification = {
      userId: toUserId,
      type: 'friend_accept',
      fromUserId,
      fromUserName,
      fromUserPhoto,
      isRead: false,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(notificationsRef, notification);
    return docRef.id;
  } catch (error) {
    console.error('Error creating friend accept notification:', error);
    return null;
  }
}

/**
 * Create a recipe share notification
 */
export async function createRecipeShareNotification(
  toUserId: string,
  fromUserId: string,
  fromUserName: string | null,
  fromUserPhoto: string | null,
  recipeId: string,
  recipeName: string,
  sharedId: string
): Promise<string | null> {
  try {
    const notificationsRef = collection(db, 'notifications');
    const notification = {
      userId: toUserId,
      type: 'recipe_share',
      fromUserId,
      fromUserName,
      fromUserPhoto,
      relatedItemId: sharedId,
      relatedItemName: recipeName,
      recipeId: recipeId,
      isRead: false,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(notificationsRef, notification);
    return docRef.id;
  } catch (error) {
    console.error('Error creating recipe share notification:', error);
    return null;
  }
} 