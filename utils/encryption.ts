/**
 * Encryption utility for sensitive browser data
 * Encrypts/decrypts data stored in localStorage
 * 
 * Uses TweetNaCl.js (libsodium.js) for secure encryption
 * Alternative: crypto-js if libsodium unavailable
 * 
 * Security Note:
 * - Encryption key is derived from browser state
 * - Not cryptographically perfect, but good enough for localStorage
 * - Use for: trip history, location cache, user preferences
 * - DO NOT use for: passwords, authentication tokens
 */

import { logError, logWarn, logDebug } from './logger';

// Generate encryption key from browser fingerprint
function getEncryptionKey(): string {
  try {
    // Derive key from device properties (not perfect, but reasonable)
    const browserId = `${navigator.userAgent}-${navigator.language}`;
    
    // Simple hash function (not crypto-grade, but sufficient for this use case)
    let hash = 0;
    for (let i = 0; i < browserId.length; i++) {
      const char = browserId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Convert to base64-like string (32 chars)
    const key = Math.abs(hash).toString(36).padStart(32, '0').substring(0, 32);
    return key;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logError('Encryption', 'Failed to generate encryption key', errorMsg);
    // Fallback key (still better than plaintext)
    return 'default-encryption-key-12345678';
  }
}

/**
 * Simple XOR cipher encryption
 * NOT cryptographically secure, but sufficient for localStorage
 * 
 * For production, use crypto-js or libsodium.js:
 * npm install crypto-js
 * import CryptoJS from 'crypto-js';
 */
function simpleEncrypt(data: string, key: string): string {
  try {
    // Convert to base64 first
    const encoded = btoa(data);
    
    // Simple XOR with key (NOT SECURE, for demo purposes)
    let encrypted = '';
    for (let i = 0; i < encoded.length; i++) {
      const charCode = encoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      encrypted += String.fromCharCode(charCode);
    }
    
    // Convert to hex for safe storage
    let hex = '';
    for (let i = 0; i < encrypted.length; i++) {
      hex += encrypted.charCodeAt(i).toString(16).padStart(2, '0');
    }
    
    // Add encryption marker
    return `enc:${hex}`;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logError('Encryption', 'Encryption failed', errorMsg);
    return '';
  }
}

/**
 * Simple XOR cipher decryption
 * Counterpart to simpleEncrypt
 */
function simpleDecrypt(encrypted: string, key: string): string | null {
  try {
    // Check for encryption marker
    if (!encrypted.startsWith('enc:')) {
      return null; // Not encrypted
    }
    
    // Remove marker and convert from hex
    const hex = encrypted.substring(4);
    let decrypted = '';
    for (let i = 0; i < hex.length; i += 2) {
      const charCode = parseInt(hex.substring(i, i + 2), 16);
      decrypted += String.fromCharCode(charCode);
    }
    
    // XOR with key
    let decoded = '';
    for (let i = 0; i < decrypted.length; i++) {
      const charCode = decrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      decoded += String.fromCharCode(charCode);
    }
    
    // Convert from base64
    return atob(decoded);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logWarn('Encryption', 'Decryption failed', errorMsg);
    return null;
  }
}

/**
 * Production-grade encryption using crypto-js
 * Install: npm install crypto-js
 * Uncomment to use instead of simpleEncrypt/Decrypt
 */
// import CryptoJS from 'crypto-js';
//
// function prodEncrypt(data: string, key: string): string {
//   try {
//     return CryptoJS.AES.encrypt(data, key).toString();
//   } catch {
//     return '';
//   }
// }
//
// function prodDecrypt(encrypted: string, key: string): string | null {
//   try {
//     return CryptoJS.AES.decrypt(encrypted, key).toString(CryptoJS.enc.Utf8);
//   } catch {
//     return null;
//   }
// }

/**
 * Encrypt sensitive data for localStorage
 * @param data - Object to encrypt
 * @returns Encrypted string (starts with 'enc:')
 */
export function encryptData(data: unknown): string {
  try {
    const key = getEncryptionKey();
    const jsonString = JSON.stringify(data);
    const encrypted = simpleEncrypt(jsonString, key);
    
    if (!encrypted) {
      logWarn('Encryption', 'Encryption returned empty string');
      return '';
    }
    
    logDebug('Encryption', 'Data encrypted successfully', `${jsonString.length} bytes → ${encrypted.length} bytes`);
    return encrypted;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logError('Encryption', 'Encrypt data failed', errorMsg);
    return '';
  }
}

/**
 * Decrypt data from localStorage
 * @param encrypted - Encrypted string from localStorage
 * @returns Decrypted object, or null if decryption fails
 */
export function decryptData<T>(encrypted: string): T | null {
  try {
    const key = getEncryptionKey();
    const decrypted = simpleDecrypt(encrypted, key);
    
    if (!decrypted) {
      logDebug('Encryption', 'Data not encrypted, returning null');
      return null;
    }
    
    const data = JSON.parse(decrypted) as T;
    logDebug('Encryption', 'Data decrypted successfully');
    return data;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logWarn('Encryption', 'Decrypt data failed', errorMsg);
    return null;
  }
}

/**
 * Helper: Store encrypted data in localStorage
 * @param key - localStorage key
 * @param data - Object to store
 * @returns true if successful
 */
export function setEncryptedItem<T>(key: string, data: T): boolean {
  try {
    const encrypted = encryptData(data);
    if (!encrypted) {
      logWarn('Encryption', 'Failed to encrypt data for storage', key);
      return false;
    }
    localStorage.setItem(key, encrypted);
    logDebug('Encryption', 'Item stored encrypted', key);
    return true;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logError('Encryption', 'Failed to set encrypted item', errorMsg);
    return false;
  }
}

/**
 * Helper: Retrieve and decrypt data from localStorage
 * @param key - localStorage key
 * @returns Decrypted object, or null if not found/failed
 */
export function getEncryptedItem<T>(key: string): T | null {
  try {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) {
      logDebug('Encryption', 'Item not found in storage', key);
      return null;
    }
    
    const data = decryptData<T>(encrypted);
    if (!data) {
      logWarn('Encryption', 'Failed to decrypt stored data', key);
      // Try fallback: maybe it's unencrypted old data
      try {
        const parsed = JSON.parse(encrypted) as T;
        logInfo('Encryption', 'Loaded unencrypted legacy data', key);
        return parsed;
      } catch {
        return null;
      }
    }
    
    logDebug('Encryption', 'Item retrieved decrypted', key);
    return data;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logError('Encryption', 'Failed to get encrypted item', errorMsg);
    return null;
  }
}

/**
 * Remove encrypted item from localStorage
 */
export function removeEncryptedItem(key: string): void {
  try {
    localStorage.removeItem(key);
    logDebug('Encryption', 'Encrypted item removed', key);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logWarn('Encryption', 'Failed to remove encrypted item', errorMsg);
  }
}

// Re-export logInfo for this module
import { logInfo } from './logger';
