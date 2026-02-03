/**
 * SECURITY GUIDE: Data Exposure Vulnerabilities
 * 
 * What hackers can access through browser DevTools:
 * 1. Console logs
 * 2. Network tab (API calls, request/response data)
 * 3. Application tab (localStorage, sessionStorage, cookies)
 * 4. React DevTools (component state)
 * 5. Source maps (in development)
 */

// ============================================================================
// ❌ VULNERABILITY #1: API KEYS IN BROWSER (geoapifyService.ts)
// ============================================================================

// CURRENT CODE (INSECURE):
const getClientGeoapifyKeyIfPresent = () =>
  ((import.meta as any).env?.VITE_GEOAPIFY_API_KEY as string | undefined) || undefined;

// ATTACK SCENARIO:
// 1. Hacker opens DevTools → Network tab
// 2. Hacker sees API call to: https://api.geoapify.com/v1/geocode/search?apiKey=xyz123abc
// 3. Hacker copies the API key: xyz123abc
// 4. Hacker uses YOUR key to make millions of requests
// 5. Your bill skyrockets! ($$$$$)

// REAL EXAMPLE FROM YOUR CODE:
const url =
  `https://api.geoapify.com/v1/geocode/search?` +
  new URLSearchParams({
    text: q,
    limit: '1',
    format: 'geojson',
    apiKey: clientKey,  // ← ⚠️ EXPOSED IN NETWORK REQUEST!
  }).toString();

console.log('Network tab will show this exact URL with your API key visible!');


// ============================================================================
// ❌ VULNERABILITY #2: USER DATA IN LOCALSTORAGE (Unencrypted)
// ============================================================================

// CURRENT CODE (INSECURE):
localStorage.setItem(cacheKey, JSON.stringify(cacheData));
// cacheData: { lat, lon, formatted, timestamp }

// ATTACK SCENARIO:
// 1. Hacker runs in console: localStorage.getItem('geocode_kasol')
// 2. Hacker sees: { lat: 32.2264, lon: 77.4686, formatted: "Kasol, India" }
// 3. Hacker knows exactly where you're planning trips!

// EXAMPLE - USER PRIVACY LEAK:
localStorage.setItem('geocode_my_home', JSON.stringify({
  lat: 28.5921,
  lon: 77.2064,
  formatted: 'New Delhi, Home'
}));
// Now hacker knows your home address!


// ============================================================================
// ❌ VULNERABILITY #3: CONSOLE LOGS EXPOSE SENSITIVE DATA
// ============================================================================

// FROM fetchWithTimeout.ts:
console.info(`client-fetch: ${pathname} ${status} ${took}ms`);

// PROBLEM: If you add sensitive data:
console.log('User login:', { email: 'user@gmail.com', token: 'xyz123' });
// Hacker opens DevTools → Console
// Sees: User login: {email: 'user@gmail.com', token: 'xyz123'}
// Hacker steals token → hijacks account!


// ============================================================================
// ❌ VULNERABILITY #4: TURNSTILE TOKENS IN NETWORK
// ============================================================================

// FROM contactMessageService.ts:
const res = await fetch('/api/forms/contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: userMessage,
    turnstileToken: input.turnstileToken,  // ← Visible in Network tab
  }),
});

// ATTACK SCENARIO:
// 1. Hacker intercepts request in Network tab
// 2. Hacker sees: { turnstileToken: "0.abc123xyz789==", ... }
// 3. Hacker could potentially replay/reuse token


// ============================================================================
// ✅ SOLUTIONS
// ============================================================================

/**
 * SOLUTION #1: Never Put API Keys in Browser
 * 
 * RULE: All API keys must be server-side only
 * 
 * ❌ WRONG:
 * const key = import.meta.env.VITE_GEOAPIFY_API_KEY;  // VITE_ prefix = exposed!
 * 
 * ✅ RIGHT:
 * // Backend/API endpoint that you control
 * // /api/geocode (server-side, uses SERVER_GEOAPIFY_KEY)
 */

// BEFORE (INSECURE):
export const geoapifyGeocode = async (text: string): Promise<GeoPoint> => {
  const clientKey = import.meta.env.VITE_GEOAPIFY_API_KEY; // ← ⚠️ EXPOSED!
  
  const url = `https://api.geoapify.com/v1/geocode/search?` +
    new URLSearchParams({
      text: q,
      apiKey: clientKey,  // ← ⚠️ IN NETWORK REQUEST!
    }).toString();

  const res = await fetch(url);
  // ...
};

// AFTER (SECURE):
export const geoapifyGeocode = async (text: string): Promise<GeoPoint> => {
  // 1. Browser calls YOUR server endpoint (no API key exposed)
  const res = await fetch('/api/geocode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    // ↑ Only text is sent, no API key!
  });

  const data = await res.json();
  return { lat: data.lat, lon: data.lon, formatted: data.formatted };
};

// 2. Backend receives request with your SECRET key
// api/geocode.ts (SERVER ONLY - has SECRET key):
export default async function handler(req, res) {
  const { text } = req.body;
  
  // SECRET key is only on server, never exposed to browser
  const serverKey = process.env.GEOAPIFY_API_KEY;  // ← Secret, not exposed
  
  const geoapifyUrl = `https://api.geoapify.com/v1/geocode/search?` +
    new URLSearchParams({
      text,
      apiKey: serverKey,  // ← Only server sees this!
    }).toString();

  const response = await fetch(geoapifyUrl);
  const data = await response.json();
  
  // Return only the data, not the API key
  res.json({
    lat: data.features[0].geometry.coordinates[1],
    lon: data.features[0].geometry.coordinates[0],
  });
}

/**
 * SOLUTION #2: Encrypt Sensitive Data in LocalStorage
 * 
 * If you must store in localStorage, encrypt it!
 */

// BEFORE (INSECURE):
localStorage.setItem(
  'user_preferences',
  JSON.stringify({
    tripHistory: ['Kasol', 'New Delhi', 'Mumbai'],  // ← Readable!
    budget: 50000,
  })
);

// AFTER (MORE SECURE):
// Use a library like: crypto-js, libsodium, or TweetNaCl
import CryptoJS from 'crypto-js';

const encryptedData = CryptoJS.AES.encrypt(
  JSON.stringify({ tripHistory: [...], budget: 50000 }),
  'user-specific-password'  // Derive from user login
).toString();

localStorage.setItem('user_preferences', encryptedData);
// Now hacker sees: U2FsdGVkX1... (unreadable garbage!)

// Retrieve:
const decrypted = CryptoJS.AES.decrypt(
  localStorage.getItem('user_preferences'),
  'user-specific-password'
).toString(CryptoJS.enc.Utf8);


/**
 * SOLUTION #3: Use Secure Transport (HTTPS + CSP Headers)
 */

// 1. ALWAYS use HTTPS (not HTTP)
// 2. Set Content Security Policy (CSP) headers to prevent XSS:
{
  "headers": [
    {
      "key": "Content-Security-Policy",
      "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    }
  ]
}


/**
 * SOLUTION #4: Never Log Sensitive Data
 */

// ❌ WRONG:
console.log('User data:', { email, password, token, creditCard });

// ✅ RIGHT:
logInfo('Auth', 'User logged in successfully');  // No sensitive data
logError('API', 'Request failed', { statusCode: 500 });  // No secrets


/**
 * SOLUTION #5: Monitor Network Security
 */

// Check Turnstile token timeout in Network requests:
// Token should have short expiry (5-10 minutes)
// After expiry, token becomes useless

// ✅ Token includes: expiration time
// ❌ Attacker captures old token: Can't reuse it (expired)


// ============================================================================
// 📋 SECURITY CHECKLIST
// ============================================================================

const SECURITY_CHECKLIST = {
  "API Keys": {
    "all_keys_server_only": "❌ VITE_GEOAPIFY_API_KEY exposed in browser",
    "action": "Move to /api/geocode endpoint with SERVER key",
  },
  "LocalStorage": {
    "sensitive_data_encrypted": "❌ Trip history stored plaintext",
    "action": "Encrypt location/user preference data",
  },
  "Console Logs": {
    "no_secrets_logged": "⚠️ Some logs could leak data if added",
    "action": "Use logInfo/logError, never log tokens/passwords",
  },
  "Network Requests": {
    "https_only": "✅ Check: Is your site HTTPS?",
    "request_body_safe": "⚠️ Turnstile token in request body",
    "action": "Ensure tokens are cleared after use",
  },
  "React DevTools": {
    "sensitive_state_exposed": "❌ Component state visible",
    "action": "Disable React DevTools in production (vercel.json)",
  },
};


// ============================================================================
// 🔒 PRACTICAL EXAMPLE: Secure vs Insecure
// ============================================================================

// ❌ INSECURE FORM SUBMISSION:
async function submitForm(data) {
  console.log('Submitting:', data);  // ← Logs everything including token
  
  const res = await fetch('/api/contact', {
    method: 'POST',
    body: JSON.stringify({
      email: data.email,
      message: data.message,
      turnstileToken: data.token,  // ← Visible in Network
      apiKey: import.meta.env.VITE_API_KEY,  // ← ⚠️ HUGE SECURITY ISSUE!
    }),
  });
}

// ✅ SECURE FORM SUBMISSION:
async function submitForm(data) {
  logInfo('Form', 'Submission started');  // ← No sensitive data
  
  const res = await fetch('/api/contact', {
    method: 'POST',
    body: JSON.stringify({
      email: data.email,  // ← OK, not sensitive
      message: data.message,  // ← OK, user data
      // ← NO token/key in request!
    }),
    // ← Token handled internally by server
  });

  // Token cleared after submission
  data.token = '';
}

// Server-side (/api/contact):
export async function POST(req) {
  const { email, message } = await req.json();
  
  // Get token from request headers or session (not body)
  const token = req.headers['x-turnstile-token'];
  const apiKey = process.env.GEOAPIFY_API_KEY;  // ← Secret, not exposed
  
  // Verify token server-side
  const tokenValid = await verifyTurnstileToken(token);
  if (!tokenValid) return res.status(403).json({ error: 'Failed verification' });
  
  // Process with API key (server-side)
  // ...
}


export default SECURITY_CHECKLIST;
