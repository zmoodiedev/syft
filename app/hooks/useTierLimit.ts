import { useState, useEffect } from 'react';
import { hasUserReachedLimit, UserTier, DEFAULT_TIER, TIER_FEATURES } from '@/app/lib/tiers';

interface TierLimitHookResult {
  hasReachedLimit: boolean;
  isLoading: boolean;
  error: string | null;
  limitCount: number;
  currentCount: number;
}

/**
 * Custom hook to check if a user has reached their tier limit
 * @param tier The user's tier
 * @param feature The feature to check (maxRecipes, maxFriends, maxSharedRecipes)
 * @param countFn Function that returns a Promise with the current count
 */
export function useTierLimit(
  tier: UserTier = DEFAULT_TIER,
  feature: 'maxRecipes' | 'maxFriends' | 'maxSharedRecipes',
  countFn: () => Promise<number>
): TierLimitHookResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCount, setCurrentCount] = useState(0);
  
  // Get the limit from tier settings
  const limitCount = TIER_FEATURES[tier][feature];
  
  useEffect(() => {
    let isMounted = true;
    
    const checkLimit = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const count = await countFn();
        if (isMounted) {
          setCurrentCount(count);
        }
      } catch (error) {
        if (isMounted) {
          setError('Failed to check limit');
          console.error('Error checking tier limit:', error);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    checkLimit();
    
    return () => {
      isMounted = false;
    };
  }, [tier, feature, countFn]);
  
  return {
    hasReachedLimit: hasUserReachedLimit(tier, feature, currentCount),
    isLoading,
    error,
    limitCount,
    currentCount
  };
} 