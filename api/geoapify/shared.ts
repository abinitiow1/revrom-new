// Vercel Serverless Function helpers: cache, rate-limit, and Geoapify category mapping.

type CacheEntry<T> = { value: T; expiresAt: number };

const memoryCache = new Map<string, CacheEntry<any>>();

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
};

export const readJsonBody = async (req: any): Promise<any> => {
  if (req?.body && typeof req.body === 'object') return req.body;
  const chunks: any[] = [];
  await new Promise<void>((resolve, reject) => {
    req.on('data', (c: any) => chunks.push(c));
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
  // Allow local/dev to function without Turnstile configured.
  if (!secret) return;

  const response = (token || '').trim();
  if (!response) {
    const err: any = new Error('Missing Turnstile token.');
    err.statusCode = 400;
    throw err;
  }

  const ip = getClientIp(req);
  const params = new URLSearchParams();
  params.set('secret', secret);
  params.set('response', response);
  if (ip && ip !== 'unknown') params.set('remoteip', ip);

  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data: any = await r.json().catch(() => null);
  if (!data?.success) {
    const codes = Array.isArray(data?.['error-codes']) ? data['error-codes'].join(', ') : '';
    const err: any = new Error(`Turnstile verification failed${codes ? ` (${codes})` : ''}.`);
    err.statusCode = 403;
    throw err;
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
