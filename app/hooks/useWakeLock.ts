'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Manages a Screen Wake Lock so the device doesn't sleep while the user
 * is actively reading a recipe.
 *
 * - Automatically re-acquires the lock after the tab becomes visible again
 *   (browsers release it whenever the page is hidden).
 * - Releases on unmount.
 * - Sets isSupported=false on browsers that don't implement the API
 *   (Firefox, older Safari) so the toggle can be hidden.
 */
export function useWakeLock() {
  const [isActive, setIsActive]       = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    setIsSupported(typeof navigator !== 'undefined' && 'wakeLock' in navigator);
  }, []);

  // Re-acquire after the tab returns to the foreground.
  // The browser always releases the lock when the page is hidden.
  useEffect(() => {
    if (!isActive) return;

    const handleVisibility = async () => {
      if (document.visibilityState === 'visible' && sentinelRef.current === null) {
        try {
          sentinelRef.current = await navigator.wakeLock.request('screen');
        } catch {
          setIsActive(false);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isActive]);

  // Release on unmount
  useEffect(() => {
    return () => {
      sentinelRef.current?.release().catch(() => {});
    };
  }, []);

  const toggle = useCallback(async () => {
    if (!isSupported) return;

    if (isActive) {
      await sentinelRef.current?.release().catch(() => {});
      sentinelRef.current = null;
      setIsActive(false);
    } else {
      try {
        sentinelRef.current = await navigator.wakeLock.request('screen');
        sentinelRef.current.addEventListener('release', () => {
          sentinelRef.current = null;
          setIsActive(false);
        });
        setIsActive(true);
      } catch {
        setIsActive(false);
      }
    }
  }, [isActive, isSupported]);

  return { isActive, isSupported, toggle };
}
