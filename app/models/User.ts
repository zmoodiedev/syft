import { UserTier } from "@/app/lib/tiers";

export interface UserProfile {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  bio: string | null;
  tier: UserTier;
  
  // Privacy settings
  profileVisibility: 'public' | 'private';
  friendsVisibility: 'public' | 'private';
  
  // Custom settings
  customCategories: string[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface UserStats {
  recipeCount: number;
  friendCount: number;
  followerCount: number;
  followingCount: number;
}

export interface UserRelationship {
  isFriend: boolean;
  isFollowing: boolean;
  isPendingFriend: boolean;
}

export interface Notification {
  id: string;
  userId: string;          // ID of user receiving the notification
  type: 'follow' | 'friend_request' | 'friend_accept' | 'recipe_share';
  fromUserId: string;      // ID of user who triggered the notification
  fromUserName: string | null; // Display name of user who triggered it
  fromUserPhoto: string | null; // Profile photo of user who triggered it
  relatedItemId?: string;  // Optional ID of related item (recipe, etc.)
  relatedItemName?: string; // Optional name of related item
  isRead: boolean;
  createdAt: Date;
}

// The default profile settings for new users
export const DEFAULT_USER_SETTINGS: Partial<UserProfile> = {
  tier: 'Free',
  bio: null,
  profileVisibility: 'public',
  friendsVisibility: 'public',
  customCategories: ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack']
}; 