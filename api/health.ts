import { fetchWithTimeout } from './geoapify/fetchWithTimeout.js';
import { getClientIp } from './geoapify/shared.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any) {
  try {
    const q = new URL(req?.url || '/', 'http://local').searchParams;
    const runTests = String(q.get('runTests') || 'false').toLowerCase() === 'true';

    // Protect health endpoint: it discloses deployment configuration.
    const healthSecret = String(process.env.HEALTH_CHECK_SECRET || '').trim();
    const headerSecret = String(req?.headers?.['x-health-check'] || '').trim();

    // If not configured, behave as "not found" to reduce information leakage.
    if (!healthSecret) {
      res.statusCode = 404;
      return res.end('Not found');
    }

    if (!headerSecret || headerSecret !== healthSecret) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }

    // Live upstream checks are opt-in via ?runTests=true (requires the same X-Health-Check header above).
    const allowLiveTests = runTests;

    const result: any = {
      ok: true,
      env: {
        TURNSTILE_SECRET_KEY: !!process.env.TURNSTILE_SECRET_KEY,
        TURNSTILE_SECRET_KEY_FORMAT: process.env.TURNSTILE_SECRET_KEY ? (process.env.TURNSTILE_SECRET_KEY.startsWith('0x') ? 'VALID (starts with 0x)' : 'INVALID (should start with 0x - you may have used SITE KEY instead of SECRET KEY)') : 'NOT SET',
        TURNSTILE_EXPECTED_HOSTNAMES: process.env.TURNSTILE_EXPECTED_HOSTNAMES || 'NOT SET',
        GEOAPIFY_API_KEY: !!process.env.GEOAPIFY_API_KEY,
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        VERCEL_ENV: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
      },
      checks: {},
      note: allowLiveTests ? 'Running live upstream checks (authorized)' : 'Live tests not requested.',
      clientIp: getClientIp(req),
      troubleshooting: {
        turnstile401: 'If you get 401 error, your TURNSTILE_SECRET_KEY is WRONG. Go to Cloudflare Dashboard → Turnstile → Copy the SECRET key (NOT the site key). The secret key starts with 0x.',
        vercelEnvVars: 'Make sure TURNSTILE_SECRET_KEY is set in Vercel Dashboard → Project Settings → Environment Variables for Production environment.',
      },
    };

    if (allowLiveTests) {
      // Turnstile live check: POST verify with a dummy response token. Status 401 indicates invalid secret.
      try {
        const params = new URLSearchParams();
        params.set('secret', String(process.env.TURNSTILE_SECRET_KEY || ''));
        params.set('response', '__health_check_token__');
        const r = await fetchWithTimeout('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        }, 4000, 0);
        const status = r?.status || 0;
        const body = await r.json().catch(() => null);
        result.checks.turnstile = { status, body: body ? { success: !!body.success, errorCodes: body['error-codes'] } : null };
      } catch (e: any) {
        result.checks.turnstile = { error: String(e?.message || e) };
      }

      // Geoapify live check: simple geocode request
      try {
        const key = String(process.env.GEOAPIFY_API_KEY || '');
        const url = `https://api.geoapify.com/v1/geocode/search?${new URLSearchParams({ text: 'Kathmandu', apiKey: key, limit: '1', format: 'geojson' }).toString()}`;
        const r2 = await fetchWithTimeout(url, { method: 'GET' }, 4000, 0);
        const status = r2?.status || 0;
        const body = await r2.json().catch(() => null);
        result.checks.geoapify = { status, body: body ? { features: Array.isArray(body.features) ? body.features.length : undefined } : null };
      } catch (e: any) {
        result.checks.geoapify = { error: String(e?.message || e) };
      }
    }

    return res.statusCode = 200, res.end(JSON.stringify(result, null, 2));
  } catch (e: any) {
    const status = e?.statusCode || 500;
    res.statusCode = status;
    return res.end(JSON.stringify({ error: e?.message || 'Server error.' }));
  }
}
