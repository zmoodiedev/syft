import { db, auth } from '@/lib/firebase';
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
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

async function createNotificationViaAPI(payload: {
  userId: string;
  type: string;
  fromUserId: string;
  fromUserName: string | null;
  fromUserPhoto: string | null;
  relatedItemId?: string;
  relatedItemName?: string;
  recipeId?: string;
}): Promise<string | null> {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return null;

    const res = await fetch('/api/notifications/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.id ?? null;
  } catch (error) {
    console.error('Error creating notification via API:', error);
    return null;
  }
}

export async function getUserNotifications(
  userId: string,
  limitCount: number = 20,
  onlyUnread: boolean = false
): Promise<Notification[]> {
  try {
    const notificationsRef = collection(db, 'notifications');

    let notificationsQuery = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    if (onlyUnread) {
      notificationsQuery = query(
        notificationsRef,
        where('userId', '==', userId),
        where('isRead', '==', false),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    }

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

export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);

    const notificationDoc = await getDoc(notificationRef);
    if (!notificationDoc.exists()) {
      return false;
    }

    const userId = notificationDoc.data().toUserId;

    await updateDoc(notificationRef, { isRead: true });

    if (userId) {
      await notifyCountChange(userId);
    }

    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    const notificationsRef = collection(db, 'notifications');
    const unreadQuery = query(
      notificationsRef,
      where('userId', '==', userId),
      where('isRead', '==', false)
    );

    const querySnapshot = await getDocs(unreadQuery);

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

export const deleteNotification = async (notificationId: string): Promise<boolean> => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);

    const notificationDoc = await getDoc(notificationRef);
    let userId = null;

    if (notificationDoc.exists()) {
      userId = notificationDoc.data().toUserId;
    }

    await deleteDoc(notificationRef);

    if (userId) {
      await notifyCountChange(userId);
    }

    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
};

export async function createFollowNotification(
  toUserId: string,
  fromUserId: string,
  fromUserName: string | null,
  fromUserPhoto: string | null
): Promise<string | null> {
  return createNotificationViaAPI({ userId: toUserId, type: 'follow', fromUserId, fromUserName, fromUserPhoto });
}

export async function createFriendRequestNotification(
  toUserId: string,
  fromUserId: string,
  fromUserName: string | null,
  fromUserPhoto: string | null,
  requestId: string
): Promise<string | null> {
  return createNotificationViaAPI({ userId: toUserId, type: 'friend_request', fromUserId, fromUserName, fromUserPhoto, relatedItemId: requestId });
}

export async function createFriendAcceptNotification(
  toUserId: string,
  fromUserId: string,
  fromUserName: string | null,
  fromUserPhoto: string | null
): Promise<string | null> {
  return createNotificationViaAPI({ userId: toUserId, type: 'friend_accept', fromUserId, fromUserName, fromUserPhoto });
}

export async function createGatedFriendRequestNotification(
  toUserId: string,
  fromUserId: string,
  fromUserName: string | null,
  fromUserPhoto: string | null,
  requestId: string
): Promise<string | null> {
  return createNotificationViaAPI({ userId: toUserId, type: 'friend_request_gated', fromUserId, fromUserName, fromUserPhoto, relatedItemId: requestId });
}

export async function createFriendRequestPendingNotification(
  toUserId: string,
  receiverUserId: string,
  receiverName: string | null,
  receiverPhoto: string | null
): Promise<string | null> {
  return createNotificationViaAPI({ userId: toUserId, type: 'friend_request_pending', fromUserId: receiverUserId, fromUserName: receiverName, fromUserPhoto: receiverPhoto });
}

export async function createRecipeShareNotification(
  toUserId: string,
  fromUserId: string,
  fromUserName: string | null,
  fromUserPhoto: string | null,
  recipeId: string,
  recipeName: string,
  sharedId: string
): Promise<string | null> {
  return createNotificationViaAPI({ userId: toUserId, type: 'recipe_share', fromUserId, fromUserName, fromUserPhoto, relatedItemId: sharedId, relatedItemName: recipeName, recipeId });
}
