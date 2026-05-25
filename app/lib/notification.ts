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
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { Notification } from '@/app/models/User';

export type NotificationCountListener = (count: number) => void;
const notificationCountListeners = new Map<string, Set<NotificationCountListener>>();

export const subscribeToNotificationCount = (userId: string, listener: NotificationCountListener): (() => void) => {
  if (!notificationCountListeners.has(userId)) {
    notificationCountListeners.set(userId, new Set());
  }
  
  notificationCountListeners.get(userId)?.add(listener);
  
  return () => {
    const listeners = notificationCountListeners.get(userId);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        notificationCountListeners.delete(userId);
      }
    }
  };
};

const notifyCountChange = async (userId: string) => {
  const listeners = notificationCountListeners.get(userId);
  if (!listeners || listeners.size === 0) return;
  
  try {
    const count = await getUnreadNotificationCount(userId);
    listeners.forEach(listener => listener(count));
  } catch (error) {
    console.error('Error updating notification count listeners:', error);
  }
};

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
export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    
    // Get the notification first to extract the user ID
    const notificationDoc = await getDoc(notificationRef);
    if (!notificationDoc.exists()) {
      return false;
    }
    
    const userId = notificationDoc.data().toUserId;
    
    // Update the notification
    await updateDoc(notificationRef, {
      isRead: true
    });
    
    // Notify listeners about the count change
    if (userId) {
      await notifyCountChange(userId);
    }
    
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

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
    await notifyCountChange(userId);
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
}

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId: string): Promise<boolean> => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    
    // Get the notification first to extract the user ID
    const notificationDoc = await getDoc(notificationRef);
    let userId = null;
    
    if (notificationDoc.exists()) {
      userId = notificationDoc.data().toUserId;
    }
    
    // Delete the notification
    await deleteDoc(notificationRef);
    
    // Notify listeners about the count change
    if (userId) {
      await notifyCountChange(userId);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
};

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
 * Create a gated friend request notification (sent to the Free-tier receiver).
 * The accept action is locked behind Pro; this persists as a nudge to upgrade.
 */
export async function createGatedFriendRequestNotification(
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
      type: 'friend_request_gated',
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
    console.error('Error creating gated friend request notification:', error);
    return null;
  }
}

/**
 * Create a pending notification for the Pro-tier sender, explaining that the
 * receiver needs to upgrade before the request can be accepted.
 */
export async function createFriendRequestPendingNotification(
  toUserId: string,
  receiverUserId: string,
  receiverName: string | null,
  receiverPhoto: string | null
): Promise<string | null> {
  try {
    const notificationsRef = collection(db, 'notifications');
    const notification = {
      userId: toUserId,
      type: 'friend_request_pending',
      fromUserId: receiverUserId,
      fromUserName: receiverName,
      fromUserPhoto: receiverPhoto,
      isRead: false,
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(notificationsRef, notification);
    return docRef.id;
  } catch (error) {
    console.error('Error creating friend request pending notification:', error);
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