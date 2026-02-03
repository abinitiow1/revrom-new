// Vercel Serverless Function helpers: cache, rate-limit, and Geoapify category mapping.

type CacheEntry<T> = { value: T; expiresAt: number };

const memoryCache = new Map<string, CacheEntry<any>>();

// Turnstile tokens are intended to be single-use, but real UIs can trigger duplicate server calls
// (double-clicks, retries, parallel requests). To avoid false negatives, cache successful
// verifications for a short window keyed by token + IP.
const verifiedTurnstileCache = new Map<string, number>();

import { fetchWithTimeout } from './fetchWithTimeout.js';

export const cacheGet = <T>(key: string): T | null => {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value as T;
};

export const cacheSet = <T>(key: string, value: T, ttlMs: number) => {
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlMs });
  // Light pruning to avoid unbounded growth
  if (memoryCache.size > 2000) {
    const now = Date.now();
    for (const [k, e] of memoryCache.entries()) {
      if (e.expiresAt <= now) memoryCache.delete(k);
      if (memoryCache.size <= 1500) break;
    }
  }
};

type RateState = { count: number; resetAt: number };
const rateMap = new Map<string, RateState>();

export const getClientIp = (req: any) => {
  const xff = (req?.headers?.['x-forwarded-for'] || req?.headers?.['X-Forwarded-For']) as string | undefined;
  if (xff) return xff.split(',')[0].trim();
  const xrip = (req?.headers?.['x-real-ip'] || req?.headers?.['X-Real-IP']) as string | undefined;
  if (xrip) return xrip.trim();
  return 'unknown';
};

export const rateLimitOrThrow = (req: any, limit: number, windowMs: number, bucket: string = 'default') => {
  const ip = getClientIp(req);
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const cur = rateMap.get(key);
  if (!cur || now > cur.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (cur.count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((cur.resetAt - now) / 1000));
    const err: any = new Error('Rate limit exceeded.');
    err.statusCode = 429;
    err.retryAfterSec = retryAfterSec;
    throw err;
  }
  cur.count += 1;
  rateMap.set(key, cur);

  // Periodic pruning to avoid unbounded map size
  if (rateMap.size > 5000) {
    const now = Date.now();
    for (const [k, v] of rateMap.entries()) {
      if (v.resetAt + 60 * 60 * 1000 < now) rateMap.delete(k); // purge very old entries
      if (rateMap.size <= 4000) break;
    }
  }
};

export const readJsonBody = async (req: any): Promise<any> => {
  if (req?.body && typeof req.body === 'object') return req.body;
  const chunks: any[] = [];
  const maxBytes = 128 * 1024; // 128KB hard cap to avoid memory abuse
  let total = 0;
  await new Promise<void>((resolve, reject) => {
    req.on('data', (c: any) => {
      total += c?.length || 0;
      if (total > maxBytes) {
        const err: any = new Error('Request body too large.');
        err.statusCode = 413;
        try {
          req.destroy(err);
        } catch {}
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve());
    req.on('error', (e: any) => reject(e));
  });
  const raw = Buffer.concat(chunks as any).toString('utf-8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

export const getQuery = (req: any) => {
  const url = new URL(req?.url || '/', 'http://local');
  return url.searchParams;
};

export const sendJson = (res: any, statusCode: number, data: any, headers?: Record<string, string>) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // Helps Vercel edge cache (best-effort); in-memory cache is still used.
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=86400');
  if (headers) {
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  }
  res.end(JSON.stringify(data));
};

export const getGeoapifyApiKey = () => {
  const key = process.env.GEOAPIFY_API_KEY;
  if (!key) {
    console.error('Geoapify API key missing: process.env.GEOAPIFY_API_KEY is not set');
    const err: any = new Error('Missing GEOAPIFY_API_KEY server environment variable.');
    err.statusCode = 500;
    throw err;
  }
  return key;
};

export const verifyTurnstileOrThrow = async (req: any, token: string | undefined) => {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const vercelEnv = (process.env.VERCEL_ENV || process.env.NODE_ENV || '').toLowerCase();
  const shouldEnforce = vercelEnv === 'production'; // Only enforce on production (revrom.in)

  // Allow local/dev/preview to function without Turnstile configured
  if (!secret) {
    if (shouldEnforce) {
      console.error('[Turnstile Server] CRITICAL: TURNSTILE_SECRET_KEY is not set in Vercel environment variables!');
      console.error('[Turnstile Server] Go to Vercel Dashboard → Settings → Environment Variables → Add TURNSTILE_SECRET_KEY');
      const err: any = new Error('Turnstile is not configured on the server (missing TURNSTILE_SECRET_KEY). Add it to Vercel Environment Variables.');
      err.statusCode = 500;
      throw err;
    }
    return;
  }

  // Validate secret key format (should start with 0x, not be the site key)
  if (!secret.startsWith('0x')) {
    console.error('[Turnstile Server] CRITICAL: TURNSTILE_SECRET_KEY has invalid format! It should start with "0x"');
    console.error('[Turnstile Server] You may have set the SITE KEY instead of the SECRET KEY');
    const err: any = new Error('Invalid TURNSTILE_SECRET_KEY format. Ensure you are using the SECRET key (starts with 0x), not the SITE key.');
    err.statusCode = 500;
    throw err;
  }

  const response = (token || '').trim();
  if (!response) {
    const err: any = new Error('Missing Turnstile token.');
    err.statusCode = 400;
    throw err;
  }

  const ip = getClientIp(req);
  const cacheKey = `${response}:${ip || 'unknown'}`;
  const now = Date.now();
  const cachedOkUntil = verifiedTurnstileCache.get(cacheKey);
  if (cachedOkUntil && now < cachedOkUntil) {
    return;
  }
  if (cachedOkUntil && now >= cachedOkUntil) verifiedTurnstileCache.delete(cacheKey);

  const params = new URLSearchParams();
  params.set('secret', secret);
  params.set('response', response);
  if (ip && ip !== 'unknown') params.set('remoteip', ip);

  let r: any;
  try {
    r = await fetchWithTimeout('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    }, 4000, 1);
  } catch (fetchErr: any) {
    console.error('[Turnstile Server] Network error contacting Cloudflare:', fetchErr?.message || fetchErr);
    const err: any = new Error('Failed to verify Turnstile token (network error or timeout).');
    err.statusCode = fetchErr?.statusCode || 502;
    throw err;
  }

  const status = r?.status || 0;
  const data: any = await r.json().catch(() => null);

  // Cloudflare returns 401 when the secret is invalid/unauthorized.
  if (status === 401) {
    console.error('[Turnstile Server] ❌ 401 ERROR - Your TURNSTILE_SECRET_KEY is INVALID or WRONG!');
    console.error('[Turnstile Server] Common causes:');
    console.error('[Turnstile Server]   1. You set the SITE KEY instead of the SECRET KEY');
    console.error('[Turnstile Server]   2. The secret key belongs to a different Cloudflare account');
    console.error('[Turnstile Server]   3. The secret key was regenerated and the old one is deployed');
    console.error('[Turnstile Server] Fix: Go to https://dash.cloudflare.com/ → Turnstile → Copy the SECRET key (not site key)');
    const err: any = new Error('Turnstile 401 error: Invalid TURNSTILE_SECRET_KEY. Make sure you copied the SECRET key (not site key) from Cloudflare Turnstile dashboard.');
    err.statusCode = 401;
    throw err;
  }

  if (!r.ok) {
    console.error('[Turnstile Server] Cloudflare returned error status:', status);
    const err: any = new Error(`Turnstile verification request failed (${status}).`);
    err.statusCode = status || 502;
    throw err;
  }

  if (!data?.success) {
    const codes = Array.isArray(data?.['error-codes']) ? data['error-codes'].join(', ') : '';
    console.error('[Turnstile Server] Verification failed:', codes || 'unknown error');

    // If we already verified this token recently for this IP, treat it as OK.
    // This specifically avoids spurious "timeout-or-duplicate" failures from repeated calls.
    if (cachedOkUntil && codes.includes('timeout-or-duplicate')) {
      return;
    }

    const err: any = new Error(`Turnstile verification failed${codes ? ` (${codes})` : ''}.`);
    err.statusCode = 403;
    throw err;
  }

  // Cache successful verification briefly to tolerate duplicate requests.
  verifiedTurnstileCache.set(cacheKey, now + 2 * 60 * 1000); // 2 minutes
  // Best-effort pruning to avoid unbounded growth.
  if (verifiedTurnstileCache.size > 2000) {
    for (const [k, exp] of verifiedTurnstileCache.entries()) {
      if (exp <= now) verifiedTurnstileCache.delete(k);
      if (verifiedTurnstileCache.size <= 1500) break;
    }
  }

  // Optional: lock verification to expected hostnames (comma-separated list).
  // Example: "revrom.vercel.app,revrom.in,www.revrom.in"
  const expected = String(process.env.TURNSTILE_EXPECTED_HOSTNAMES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (expected.length) {
    const hostname = String(data?.hostname || '').trim();
    if (!hostname || !expected.includes(hostname)) {
      const err: any = new Error(`Turnstile hostname mismatch (${hostname || 'missing'}).`);
      err.statusCode = 403;
      throw err;
    }
  }
};

export type InterestTag =
  | 'mountain'
  | 'valley'
  | 'river'
  | 'lakes'
  | 'monasteries'
  | 'culture'
  | 'adventure'
  | 'photography';

export const mapInterestTagsToGeoapifyCategories = (tags: InterestTag[]) => {
  const set = new Set<string>();

  // Baseline: keep mapping conservative; invalid categories cause upstream 400s.
  set.add('tourism.attraction');
  set.add('tourism.sights');
  set.add('natural.mountain');
  set.add('natural.water');

  for (const tag of tags || []) {
    if (tag === 'mountain' || tag === 'valley') {
      set.add('natural.mountain');
    }
    if (tag === 'river' || tag === 'lakes') {
      set.add('natural.water');
    }
    if (tag === 'monasteries') {
      set.add('tourism.attraction');
    }
    if (tag === 'culture') {
      set.add('tourism.attraction');
      set.add('tourism.sights');
    }
    if (tag === 'adventure') {
      set.add('tourism.sights');
    }
    if (tag === 'photography') {
      set.add('tourism.sights');
    }
  }

  return Array.from(set);
};
