/**
 * User tier system for Syft app
 * Defines the different subscription tiers and their permissions
 */

export type UserTier = 'Free' | 'Pro' | 'Beta Tester';

export interface TierFeatures {
  maxRecipes: number;
  maxFriends: number;
  maxSharedRecipes: number;
  prioritySupport: boolean;
  earlyAccess: boolean;
}

// Define feature limits for each tier
export const TIER_FEATURES: Record<UserTier, TierFeatures> = {
  'Free': {
    maxRecipes: 15,
    maxFriends: 0,
    maxSharedRecipes: 3,
    prioritySupport: false,
    earlyAccess: false
  },
  'Pro': {
    maxRecipes: 250,
    maxFriends: 100,
    maxSharedRecipes: 50,
    prioritySupport: true,
    earlyAccess: false
  },
  'Beta Tester': {
    maxRecipes: Infinity,
    maxFriends: Infinity,
    maxSharedRecipes: Infinity,
    prioritySupport: true,
    earlyAccess: true
  }
};

// Default to Free tier if no tier is specified
export const DEFAULT_TIER: UserTier = 'Free';

/**
 * Check if a user can perform a specific action based on their tier
 */
export function canUserPerformAction(
  tier: UserTier = DEFAULT_TIER,
  action: keyof Omit<TierFeatures, 'maxRecipes' | 'maxFriends' | 'maxSharedRecipes'>
): boolean {
  return !!TIER_FEATURES[tier][action];
}

/**
 * Check if a user has reached their limit for a specific feature
 */
export function hasUserReachedLimit(
  tier: UserTier = DEFAULT_TIER,
  feature: 'maxRecipes' | 'maxFriends' | 'maxSharedRecipes',
  currentCount: number
): boolean {
  return currentCount >= TIER_FEATURES[tier][feature];
}

/**
 * Get user-friendly name for a feature
 */
export function getFeatureName(feature: keyof TierFeatures): string {
  const names: Record<keyof TierFeatures, string> = {
    maxRecipes: 'Recipe Storage',
    maxFriends: 'Friends',
    maxSharedRecipes: 'Shared Recipes',
    prioritySupport: 'Priority Support',
    earlyAccess: 'Early Access to Features'
  };
  
  return names[feature] || feature;
} 