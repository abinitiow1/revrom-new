import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { rateLimitOrThrow, readJsonBody, sendJson, verifyTurnstileOrThrow } from '../geoapify/shared.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' });

    rateLimitOrThrow(req, 30, 10 * 60 * 1000, 'forms:newsletter'); // 30 requests / 10 minutes / IP

    const body = await readJsonBody(req);
    const turnstileToken = String(body?.turnstileToken || '').trim();
    await verifyTurnstileOrThrow(req, turnstileToken);

    const email = String(body?.email || '')
      .replace(/[\s\u200B-\u200D\uFEFF]/g, '')
      .trim()
      .toLowerCase();
    if (!email || !/\S+@\S+\.\S+/.test(email)) return sendJson(res, 400, { error: 'Enter a valid email.' });

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
    return sendJson(res, status, { error: e?.message || 'Server error.' }, { 'Cache-Control': 'no-store' });
  }
}
