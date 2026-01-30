import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { rateLimitOrThrow, readJsonBody, sendJson, verifyTurnstileOrThrow } from '../geoapify/shared.js';

// Ensure Vercel runs this as a Node.js Serverless Function (not Edge).
export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' });

    rateLimitOrThrow(req, 20, 5 * 60 * 1000, 'forms:contact'); // 20 requests / 5 minutes / IP

    const body = await readJsonBody(req);
    const turnstileToken = String(body?.turnstileToken || '').trim();
    await verifyTurnstileOrThrow(req, turnstileToken);

    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const message = String(body?.message || '').trim();

    if (!name) return sendJson(res, 400, { error: 'Name is required.' });
    if (!email || !/\\S+@\\S+\\.\\S+/.test(email)) return sendJson(res, 400, { error: 'Valid email is required.' });
    if (!message || message.length < 10) return sendJson(res, 400, { error: 'Message must be at least 10 characters.' });

    const supabase = getSupabaseAdmin() as any;
    const { error } = await supabase.from('contact_messages').insert({ name, email, message } as any);
    if (error) return sendJson(res, 500, { error: error.message || 'Failed to save message.' }, { 'Cache-Control': 'no-store' });

    return sendJson(res, 200, { ok: true }, { 'Cache-Control': 'no-store' });
  } catch (e: any) {
    const status = e?.statusCode || 500;
    return sendJson(res, status, { error: e?.message || 'Server error.' }, { 'Cache-Control': 'no-store' });
  }
}
