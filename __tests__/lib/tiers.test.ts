import {
  TIER_FEATURES,
  hasUserReachedLimit,
  canUserPerformAction,
} from '@/app/lib/tiers';

describe('TIER_FEATURES', () => {
  it('Free tier has a recipe limit of 15', () => {
    expect(TIER_FEATURES['Free'].maxRecipes).toBe(15);
  });

  it('Pro tier has no recipe limit', () => {
    expect(TIER_FEATURES['Pro'].maxRecipes).toBe(Infinity);
  });

  it('Beta Tester tier has no recipe limit', () => {
    expect(TIER_FEATURES['Beta Tester'].maxRecipes).toBe(Infinity);
  });

  it('Free tier has no friends allowance', () => {
    expect(TIER_FEATURES['Free'].maxFriends).toBe(0);
  });

  it('Pro tier has a friends allowance', () => {
    expect(TIER_FEATURES['Pro'].maxFriends).toBeGreaterThan(0);
  });
});

describe('hasUserReachedLimit', () => {
  describe('maxRecipes', () => {
    it('returns false when under the Free limit', () => {
      expect(hasUserReachedLimit('Free', 'maxRecipes', 14)).toBe(false);
    });

    it('returns true exactly at the Free limit', () => {
      expect(hasUserReachedLimit('Free', 'maxRecipes', 15)).toBe(true);
    });

    it('returns true when over the Free limit', () => {
      expect(hasUserReachedLimit('Free', 'maxRecipes', 20)).toBe(true);
    });

    it('returns false for Pro regardless of count', () => {
      expect(hasUserReachedLimit('Pro', 'maxRecipes', 1000)).toBe(false);
    });

    it('returns false for Beta Tester regardless of count', () => {
      expect(hasUserReachedLimit('Beta Tester', 'maxRecipes', 1000)).toBe(false);
    });
  });

  describe('maxFriends', () => {
    it('returns true for Free tier at 0 friends (already at limit)', () => {
      expect(hasUserReachedLimit('Free', 'maxFriends', 0)).toBe(true);
    });

    it('returns false for Pro tier below friend limit', () => {
      expect(hasUserReachedLimit('Pro', 'maxFriends', 10)).toBe(false);
    });
  });
});

describe('canUserPerformAction', () => {
  it('Free tier cannot access prioritySupport', () => {
    expect(canUserPerformAction('Free', 'prioritySupport')).toBe(false);
  });

  it('Pro tier can access prioritySupport', () => {
    expect(canUserPerformAction('Pro', 'prioritySupport')).toBe(true);
  });

  it('Free tier cannot access earlyAccess', () => {
    expect(canUserPerformAction('Free', 'earlyAccess')).toBe(false);
  });

  it('Beta Tester tier can access earlyAccess', () => {
    expect(canUserPerformAction('Beta Tester', 'earlyAccess')).toBe(true);
  });
});
