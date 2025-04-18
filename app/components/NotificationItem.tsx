import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Notification } from '@/app/models/User';
import { FiUser, FiUserPlus, FiUserCheck, FiBook, FiX, FiCheck, FiThumbsUp, FiThumbsDown } from 'react-icons/fi';
import { markNotificationAsRead, deleteNotification } from '@/app/lib/notification';
import { useFriends } from '@/app/context/FriendsContext';

interface NotificationItemProps {
  notification: Notification;
  onDelete: (id: string) => void;
}

export default function NotificationItem({ notification, onDelete }: NotificationItemProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { acceptFriendRequest, rejectFriendRequest, acceptSharedRecipe, rejectSharedRecipe } = useFriends();
  
  const handleMarkAsRead = async () => {
    setIsLoading(true);
    try {
      await markNotificationAsRead(notification.id);
      // We're not setting the notification as read in state because
      // this component assumes the parent will handle that
    } catch (error) {
      console.error('Error marking notification as read:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteNotification(notification.id);
      onDelete(notification.id);
    } catch (error) {
      console.error('Error deleting notification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!notification.relatedItemId) {
      console.error('Cannot accept friend request: Missing request ID');
      return;
    }

    setIsLoading(true);
    try {
      await acceptFriendRequest(notification.relatedItemId);
      await deleteNotification(notification.id);
      onDelete(notification.id);
    } catch (error) {
      console.error('Error accepting friend request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectFriendRequest = async () => {
    if (!notification.relatedItemId) {
      console.error('Cannot reject friend request: Missing request ID');
      return;
    }

    setIsLoading(true);
    try {
      await rejectFriendRequest(notification.relatedItemId);
      await deleteNotification(notification.id);
      onDelete(notification.id);
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptRecipe = async () => {
    if (!notification.relatedItemId) {
      console.error('Cannot accept shared recipe: Missing shared recipe ID');
      return;
    }

    setIsLoading(true);
    try {
      await acceptSharedRecipe(notification.relatedItemId);
      await deleteNotification(notification.id);
      onDelete(notification.id);
    } catch (error) {
      console.error('Error accepting shared recipe:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectRecipe = async () => {
    if (!notification.relatedItemId) {
      console.error('Cannot reject shared recipe: Missing shared recipe ID');
      return;
    }

    setIsLoading(true);
    try {
      await rejectSharedRecipe(notification.relatedItemId);
      await deleteNotification(notification.id);
      onDelete(notification.id);
    } catch (error) {
      console.error('Error rejecting shared recipe:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderIcon = () => {
    switch (notification.type) {
      case 'follow':
        return <FiUser className="text-basil" />;
      case 'friend_request':
        return <FiUserPlus className="text-basil" />;
      case 'friend_accept':
        return <FiUserCheck className="text-basil" />;
      case 'recipe_share':
        return <FiBook className="text-basil" />;
      default:
        return <FiUser className="text-basil" />;
    }
  };
  
  // Format time relative to now
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'just now';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
    }
    
    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
  };
  
  const renderContent = () => {
    const userName = notification.fromUserName || 'Someone';
    
    switch (notification.type) {
      case 'follow':
        return (
          <p className="text-sm text-gray-700">
            <Link href={`/profile/${notification.fromUserId}`} className="font-medium hover:text-basil">
              {userName}
            </Link>{' '}
            started following you.
          </p>
        );
      case 'friend_request':
        return (
          <p className="text-sm text-gray-700">
            <Link href={`/profile/${notification.fromUserId}`} className="font-medium hover:text-basil">
              {userName}
            </Link>{' '}
            sent you a friend request.
          </p>
        );
      case 'friend_accept':
        return (
          <p className="text-sm text-gray-700">
            <Link href={`/profile/${notification.fromUserId}`} className="font-medium hover:text-basil">
              {userName}
            </Link>{' '}
            accepted your friend request.
          </p>
        );
      case 'recipe_share':
        return (
          <p className="text-sm text-gray-700">
            <Link href={`/profile/${notification.fromUserId}`} className="font-medium hover:text-basil">
              {userName}
            </Link>{' '}
            shared a recipe with you:{' '}
            <Link href={`/recipes/${notification.relatedItemId}`} className="font-medium hover:text-basil">
              {notification.relatedItemName || 'a recipe'}
            </Link>
          </p>
        );
      default:
        return (
          <p className="text-sm text-gray-700">
            You have a new notification.
          </p>
        );
    }
  };

  // Render action buttons for friend requests and shared recipes
  const renderActions = () => {
    if (notification.type === 'friend_request') {
      return (
        <div className="mt-2 flex space-x-2">
          <button
            onClick={handleAcceptFriendRequest}
            disabled={isLoading}
            className="px-3 py-1 bg-basil text-white text-xs rounded flex items-center gap-1 hover:bg-basil"
          >
            <FiThumbsUp size={12} />
            Accept
          </button>
          <button
            onClick={handleRejectFriendRequest}
            disabled={isLoading}
            className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded flex items-center gap-1 hover:bg-gray-400"
          >
            <FiThumbsDown size={12} />
            Decline
          </button>
        </div>
      );
    }

    if (notification.type === 'recipe_share') {
      return (
        <div className="mt-2 flex space-x-2">
          <button
            onClick={handleAcceptRecipe}
            disabled={isLoading}
            className="px-3 py-1 bg-basil text-white text-xs rounded flex items-center gap-1 hover:bg-basil"
          >
            <FiThumbsUp size={12} />
            Add to Collection
          </button>
          <button
            onClick={handleRejectRecipe}
            disabled={isLoading}
            className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded flex items-center gap-1 hover:bg-gray-400"
          >
            <FiThumbsDown size={12} />
            Decline
          </button>
        </div>
      );
    }

    return null;
  };
  
  return (
    <div className={`p-3 border-b ${notification.isRead ? 'bg-white' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {notification.fromUserPhoto ? (
            <div className="h-10 w-10 rounded-full overflow-hidden">
              <Image 
                src={notification.fromUserPhoto} 
                alt={notification.fromUserName || 'User'} 
                width={40}
                height={40}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="h-10 w-10 rounded-full flex items-center justify-center bg-basil text-white">
              {renderIcon()}
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          {renderContent()}
          
          <div className="mt-1 flex items-center text-xs text-gray-500">
            <time dateTime={notification.createdAt.toISOString()}>
              {formatRelativeTime(notification.createdAt)}
            </time>
          </div>
          
          {renderActions()}
        </div>
        
        <div className="flex flex-shrink-0 gap-1 ml-2">
          {!notification.isRead && (
            <button
              onClick={handleMarkAsRead}
              disabled={isLoading}
              className="p-1 text-basil hover:bg-basil hover:text-white rounded-full transition-colors"
              title="Mark as read"
            >
              <FiCheck size={16} />
            </button>
          )}
          
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
            title="Delete notification"
          >
            <FiX size={16} />
          </button>
        </div>
      </div>
    </div>
  );
} 