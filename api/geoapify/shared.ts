// Vercel Serverless Function helpers: cache, rate-limit, and Geoapify category mapping.

type CacheEntry<T> = { value: T; expiresAt: number };

const memoryCache = new Map<string, CacheEntry<any>>();

import { fetchWithTimeout } from './fetchWithTimeout.js';
import { getSupabaseAdmin } from '../supabaseAdmin.js';
import * as crypto from 'node:crypto';

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

let lastRatePruneAtMs = 0;
let lastReplayPruneAtMs = 0;

export const getClientIp = (req: any) => {
  const xff = (req?.headers?.['x-forwarded-for'] || req?.headers?.['X-Forwarded-For']) as string | undefined;
  if (xff) return xff.split(',')[0].trim();
  const xrip = (req?.headers?.['x-real-ip'] || req?.headers?.['X-Real-IP']) as string | undefined;
  if (xrip) return xrip.trim();
  return 'unknown';
};

export const rateLimitOrThrow = async (req: any, limit: number, windowMs: number, bucket: string = 'default') => {
  const ip = getClientIp(req);
  const now = Date.now();
  const windowStartIso = new Date(now - windowMs).toISOString();

  const supabase = getSupabaseAdmin() as any;

  // Insert an event (serverless-safe). We then count events in the last `windowMs`.
  // If over limit, reject with Retry-After based on the oldest event in the window.
  const insertRes = await supabase.from('rate_limit_events').insert({ bucket, ip } as any);
  if (insertRes?.error) {
    const err: any = new Error('Rate limiter failed (storage error).');
    err.statusCode = 500;
    throw err;
  }

  const countRes = await supabase
    .from('rate_limit_events')
    .select('id', { count: 'exact', head: true })
    .eq('bucket', bucket)
    .eq('ip', ip)
    .gte('created_at', windowStartIso);

  if (countRes?.error) {
    const err: any = new Error('Rate limiter failed (count error).');
    err.statusCode = 500;
    throw err;
  }

  const count = Number(countRes?.count || 0);
  if (count > limit) {
    const oldestRes = await supabase
      .from('rate_limit_events')
      .select('created_at')
      .eq('bucket', bucket)
      .eq('ip', ip)
      .gte('created_at', windowStartIso)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const oldestIso = String(oldestRes?.data?.created_at || '');
    const oldestMs = oldestIso ? Date.parse(oldestIso) : Number.NaN;
    const retryAfterSec =
      Number.isFinite(oldestMs) ? Math.max(1, Math.ceil((windowMs - (now - oldestMs)) / 1000)) : Math.max(1, Math.ceil(windowMs / 1000));

    const err: any = new Error('Rate limit exceeded.');
    err.statusCode = 429;
    err.retryAfterSec = retryAfterSec;
    throw err;
  }

  // Best-effort pruning (keeps table small without cron). Run at most every ~60s per instance.
  if (now - lastRatePruneAtMs > 60_000) {
    lastRatePruneAtMs = now;
    const pruneBeforeIso = new Date(now - Math.max(windowMs * 6, 30 * 60 * 1000)).toISOString();
    try {
      await supabase.from('rate_limit_events').delete().lt('created_at', pruneBeforeIso);
    } catch {}
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
  // API responses should not be cached by browsers/CDNs (forms/security endpoints especially).
  // Geoapify endpoints have their own in-memory cache.
  res.setHeader('Cache-Control', 'no-store');
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

export const verifyTurnstileOrThrow = async (req: any, token: string | undefined, expectedAction?: string) => {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  // Do NOT depend on deployment environment; APIs are attacked directly.
  // If this function is called, Turnstile is required (fail closed if misconfigured).
  const maxAgeSec = 120;

  // Always enforce (preview deployments must also verify tokens).

  // Production enforcement: Turnstile must be configured.
  if (!secret) {
      console.error('[Turnstile Server] CRITICAL: TURNSTILE_SECRET_KEY is not set in Vercel environment variables!');
      console.error('[Turnstile Server] Go to Vercel Dashboard → Settings → Environment Variables → Add TURNSTILE_SECRET_KEY');
      const err: any = new Error('Turnstile is not configured on the server (missing TURNSTILE_SECRET_KEY). Add it to Vercel Environment Variables.');
      err.statusCode = 500;
      throw err;
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
  const now = Date.now();

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
    // Secret key is server configuration; treat as 500 so it gets fixed promptly.
    err.statusCode = 500;
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
    // Treat Turnstile as an authorization gate: always reject failures.
    // Especially: "timeout-or-duplicate" must never be accepted.
    const err: any = new Error(`Turnstile verification failed${codes ? ` (${codes})` : ''}.`);
    err.statusCode = 403;
    throw err;
  }

  // Authorization hardening: require hostname allow-list and a fresh challenge timestamp.
  // Example: TURNSTILE_EXPECTED_HOSTNAMES="revrom.in,www.revrom.in,revrom.vercel.app"
  const expected = String(process.env.TURNSTILE_EXPECTED_HOSTNAMES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!expected.length) {
    const err: any = new Error('Turnstile server is misconfigured (missing TURNSTILE_EXPECTED_HOSTNAMES).');
    err.statusCode = 500;
    throw err;
  }

  const hostname = String(data?.hostname || '').trim();
  if (!hostname || !expected.includes(hostname)) {
    const err: any = new Error(`Turnstile hostname mismatch (${hostname || 'missing'}).`);
    err.statusCode = 403;
    throw err;
  }

  const challengeTsRaw = String(data?.challenge_ts || '').trim();
  const challengeTs = challengeTsRaw ? Date.parse(challengeTsRaw) : Number.NaN;
  if (!Number.isFinite(challengeTs)) {
    const err: any = new Error('Turnstile verification missing/invalid challenge timestamp.');
    err.statusCode = 403;
    throw err;
  }

  const ageSec = Math.floor((now - challengeTs) / 1000);
  if (ageSec < 0 || ageSec > maxAgeSec) {
    const err: any = new Error('Turnstile token is too old. Please retry verification.');
    err.statusCode = 403;
    throw err;
  }

  // Bind token to an action (must be configured on the client widget).
  if (expectedAction) {
    const action = String(data?.action || '').trim();
    if (!action || action !== expectedAction) {
      const err: any = new Error('Turnstile action mismatch.');
      err.statusCode = 403;
      throw err;
    }
  }

  // Prevent token replay: store a hashed token for ~2 minutes and reject duplicates.
  // Store only after Cloudflare verification succeeds to reduce storage abuse.
  const supabase = getSupabaseAdmin() as any;
  const tokenHash = crypto.createHmac('sha256', String(secret)).update(String(response)).digest('hex');
  const expiresAtIso = new Date(now + 2 * 60 * 1000).toISOString();
  const ins = await supabase.from('turnstile_token_replay').insert({ token_hash: tokenHash, expires_at: expiresAtIso } as any);
  if (ins?.error) {
    const msg = String(ins.error?.message || '').toLowerCase();
    if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('already exists')) {
      const err: any = new Error('Turnstile token already used.');
      err.statusCode = 403;
      throw err;
    }
    const err: any = new Error('Turnstile replay store failed.');
    err.statusCode = 500;
    throw err;
  }

  // Best-effort pruning of expired replay entries (at most every ~60s per instance).
  if (now - lastReplayPruneAtMs > 60_000) {
    lastReplayPruneAtMs = now;
    try {
      await supabase.from('turnstile_token_replay').delete().lt('expires_at', new Date(now - 60_000).toISOString());
    } catch {}
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
