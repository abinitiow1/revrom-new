/**
 * Centralized logging utility
 * Rules:
 * - console.error: For failures that break functionality
 * - console.warn: For recoverable issues and warnings
 * - console.log: ONLY in development builds (not in production)
 * - NEVER log secrets, tokens, or sensitive data
 */

import { isDevelopment } from './env';

const PREFIX = '[App]';

/**
 * Log errors - critical failures that break functionality
 * Visible in all environments (dev, preview, production)
 * @param context - Component or module name (e.g., 'Turnstile', 'ContactForm')
 * @param message - Error message (never include tokens/secrets)
 * @param details - Optional additional error details
 */
export function logError(context: string, message: string, details?: unknown): void {
  const prefix = `${PREFIX}[${context}] ✗`;
  
  if (details instanceof Error) {
    console.error(`${prefix} ${message}:`, details.message);
  } else if (typeof details === 'string') {
    console.error(`${prefix} ${message}: ${details}`);
  } else if (details && typeof details === 'object') {
    // Only log non-sensitive details
    const safeDetails = sanitizeObjectForLogging(details);
    console.error(`${prefix} ${message}:`, safeDetails);
  } else {
    console.error(`${prefix} ${message}`);
  }
}

/**
 * Log warnings - recoverable issues that don't break functionality
 * Visible in all environments (dev, preview, production)
 * @param context - Component or module name
 * @param message - Warning message
 * @param details - Optional additional details
 */
export function logWarn(context: string, message: string, details?: unknown): void {
  const prefix = `${PREFIX}[${context}] ⚠`;
  
  if (typeof details === 'string') {
    console.warn(`${prefix} ${message}: ${details}`);
  } else if (details && typeof details === 'object') {
    const safeDetails = sanitizeObjectForLogging(details);
    console.warn(`${prefix} ${message}:`, safeDetails);
  } else {
    console.warn(`${prefix} ${message}`);
  }
}

/**
 * Log info messages - ONLY in development builds
 * Hidden in production for performance and security
 * @param context - Component or module name
 * @param message - Info message
 * @param details - Optional additional details
 */
export function logInfo(context: string, message: string, details?: unknown): void {
  // Only log in development - production gets no logs
  if (!isDevelopment()) {
    return;
  }

  const prefix = `${PREFIX}[${context}]`;
  
  if (typeof details === 'string') {
    console.log(`${prefix} ${message}: ${details}`);
  } else if (details && typeof details === 'object') {
    const safeDetails = sanitizeObjectForLogging(details);
    console.log(`${prefix} ${message}:`, safeDetails);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

/**
 * Log debug info - ONLY in development builds
 * More verbose than logInfo, for detailed debugging
 * @param context - Component or module name
 * @param message - Debug message
 * @param details - Optional additional details
 */
export function logDebug(context: string, message: string, details?: unknown): void {
  // Only log in development
  if (!isDevelopment()) {
    return;
  }

  const prefix = `${PREFIX}[${context}]`;
  
  if (typeof details === 'string') {
    console.log(`${prefix} DEBUG: ${message}: ${details}`);
  } else if (details && typeof details === 'object') {
    const safeDetails = sanitizeObjectForLogging(details);
    console.log(`${prefix} DEBUG: ${message}:`, safeDetails);
  } else {
    console.log(`${prefix} DEBUG: ${message}`);
  }
}

/**
 * Sanitize objects before logging - removes sensitive data
 * @param obj - Object to sanitize
 * @returns Safe object for logging
 */
function sanitizeObjectForLogging(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  // List of keys to exclude from logging
  const sensitiveKeys = [
    'token',
    'secret',
    'password',
    'apiKey',
    'api_key',
    'Authorization',
    'authorization',
    'sitekey',
    'turnstile',
    'captcha',
  ];

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObjectForLogging(item));
  }

  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Exclude sensitive keys
    if (sensitiveKeys.some(sensitiveKey => key.toLowerCase().includes(sensitiveKey.toLowerCase()))) {
      result[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      result[key] = sanitizeObjectForLogging(value);
    } else if (typeof value === 'string' && value.length > 100) {
      // Truncate very long strings
      result[key] = value.substring(0, 97) + '...';
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Format error code with description for user-facing messages
 * Never includes sensitive details
 * @param code - Error code
 * @param description - Error description
 * @returns Formatted message safe for user display
 */
export function formatErrorMessage(code: string, description: string): string {
  return `Verification failed (error ${code})`;
}
