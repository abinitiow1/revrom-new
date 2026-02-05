import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { rateLimitOrThrow, readJsonBody, sendJson, verifyTurnstileOrThrow } from '../geoapify/shared.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' }, { 'Cache-Control': 'no-store' });

    await rateLimitOrThrow(req, 5, 5 * 60 * 1000, 'forms:newsletter'); // 5 requests / 5 minutes / IP

    const body = await readJsonBody(req);
    const turnstileToken = String(body?.turnstileToken || '').trim();
    // Turnstile "action" must be a simple token (Cloudflare rejects ":" etc).
    await verifyTurnstileOrThrow(req, turnstileToken, 'forms_newsletter');

    const email = String(body?.email || '')
      .replace(/[\s\u200B-\u200D\uFEFF]/g, '')
      .trim()
      .toLowerCase();
    if (!email || !/\S+@\S+\.\S+/.test(email)) return sendJson(res, 400, { error: 'Enter a valid email.' }, { 'Cache-Control': 'no-store' });
    if (email.length > 254) return sendJson(res, 400, { error: 'Email is too long.' }, { 'Cache-Control': 'no-store' });

    const supabase = getSupabaseAdmin() as any;
    const { error } = await supabase.from('newsletter_subscribers').insert({ email } as any);
    if (error) {
      // Ignore duplicates (common for newsletter).
      const msg = String(error.message || '');
      if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
        return sendJson(res, 200, { ok: true, duplicate: true }, { 'Cache-Control': 'no-store' });
      }
      return sendJson(res, 500, { error: msg || 'Could not subscribe.' }, { 'Cache-Control': 'no-store' });
    }

    return sendJson(res, 200, { ok: true }, { 'Cache-Control': 'no-store' });
  } catch (e: any) {
    const status = e?.statusCode || 500;
    const retryAfterSec = status === 429 ? Number(e?.retryAfterSec || 0) : 0;
    const payload: any = { error: e?.message || 'Server error.' };
    const headers: Record<string, string> = { 'Cache-Control': 'no-store' };
    if (status === 429 && retryAfterSec > 0) {
      payload.retryAfterSec = retryAfterSec;
      headers['Retry-After'] = String(retryAfterSec);
    }
    return sendJson(res, status, payload, headers);
  }
}
