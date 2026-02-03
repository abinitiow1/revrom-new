/**
 * Environment detection utilities
 * Centralized helpers to detect runtime environment
 * Never inline environment checks - always use these functions
 */

export type Environment = 'localhost' | 'preview' | 'production';

/**
 * Detects the current runtime environment
 * @returns Environment type based on hostname
 */
export function getEnvironment(): Environment {
  if (typeof window === 'undefined') {
    return 'production'; // SSR fallback
  }

  const hostname = window.location.hostname;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'localhost';
  }

  // Vercel preview deployments use *.vercel.app
  if (hostname.includes('vercel.app')) {
    return 'preview';
  }

  return 'production';
}

/**
 * Checks if the application is running in development/localhost environment
 */
export function isLocalhost(): boolean {
  return getEnvironment() === 'localhost';
}

/**
 * Checks if the application is running in production environment
 */
export function isProduction(): boolean {
  return getEnvironment() === 'production';
}

/**
 * Checks if the application is running in preview environment (Vercel preview deployment)
 */
export function isPreview(): boolean {
  return getEnvironment() === 'preview';
}

/**
 * Checks if the application is running in development mode
 * Development mode includes localhost and Vercel preview deployments
 */
export function isDevelopment(): boolean {
  return getEnvironment() !== 'production';
}

/**
 * Gets the current hostname
 */
export function getHostname(): string {
  if (typeof window === 'undefined') {
    return 'unknown';
  }
  return window.location.hostname;
}
