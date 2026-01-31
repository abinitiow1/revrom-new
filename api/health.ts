import { fetchWithTimeout } from './geoapify/fetchWithTimeout.js';
import { getClientIp } from './geoapify/shared.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any) {
  try {
    const q = new URL(req?.url || '/', 'http://local').searchParams;
    const runTests = String(q.get('runTests') || 'false').toLowerCase() === 'true';

    // Authorization for running live upstream tests: set HEALTH_CHECK_SECRET on the server and provide it via X-Health-Check header.
    const healthSecret = String(process.env.HEALTH_CHECK_SECRET || '').trim();
    const headerSecret = String(req?.headers?.['x-health-check'] || '').trim();
    const allowLiveTests = runTests && healthSecret && headerSecret && healthSecret === headerSecret;

    const result: any = {
      ok: true,
      env: {
        TURNSTILE_SECRET_KEY: !!process.env.TURNSTILE_SECRET_KEY,
        TURNSTILE_EXPECTED_HOSTNAMES: !!process.env.TURNSTILE_EXPECTED_HOSTNAMES,
        GEOAPIFY_API_KEY: !!process.env.GEOAPIFY_API_KEY,
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      checks: {},
      note: allowLiveTests ? 'Running live upstream checks (authorized)' : (runTests ? 'Live tests requested but not authorized (missing/invalid HEALTH_CHECK_SECRET header).' : 'Live tests not requested.'),
      clientIp: getClientIp(req),
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
