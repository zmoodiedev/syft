/**
 * Utility functions for working with environments
 */

/**
 * Checks if the current environment is development
 */
export const isDev = process.env.NODE_ENV === 'development';

/**
 * Checks if the current environment is production
 */
export const isProd = process.env.NODE_ENV === 'production';

/**
 * Runs a callback only in development mode
 */
export function onlyInDev<T>(callback: () => T, fallback: T | null = null): T | null {
  if (isDev) {
    return callback();
  }
  return fallback;
} 