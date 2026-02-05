import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { rateLimitOrThrow, readJsonBody, sendJson, verifyTurnstileOrThrow } from '../geoapify/shared.js';

// Ensure Vercel runs this as a Node.js Serverless Function (not Edge).
export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' }, { 'Cache-Control': 'no-store' });

    await rateLimitOrThrow(req, 10, 5 * 60 * 1000, 'forms:contact'); // 10 requests / 5 minutes / IP

    const body = await readJsonBody(req);
    const turnstileToken = String(body?.turnstileToken || '').trim();
    // Turnstile "action" must be a simple token (Cloudflare rejects ":" etc).
    await verifyTurnstileOrThrow(req, turnstileToken, 'forms_contact');

    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim();
    const whatsappNumber = String(body?.whatsappNumber || '').trim();
    const message = String(body?.message || '').trim();

    if (!name) return sendJson(res, 400, { error: 'Name is required.' }, { 'Cache-Control': 'no-store' });
    if (!email || !/\S+@\S+\.\S+/.test(email)) return sendJson(res, 400, { error: 'Valid email is required.' }, { 'Cache-Control': 'no-store' });
    if (!message || message.length < 10) return sendJson(res, 400, { error: 'Message must be at least 10 characters.' }, { 'Cache-Control': 'no-store' });
    if (name.length > 120) return sendJson(res, 400, { error: 'Name is too long.' }, { 'Cache-Control': 'no-store' });
    if (email.length > 254) return sendJson(res, 400, { error: 'Email is too long.' }, { 'Cache-Control': 'no-store' });
    if (whatsappNumber.length > 40) return sendJson(res, 400, { error: 'WhatsApp number is too long.' }, { 'Cache-Control': 'no-store' });
    if (message.length > 8000) return sendJson(res, 400, { error: 'Message is too long.' }, { 'Cache-Control': 'no-store' });
    if (whatsappNumber) {
      const digits = whatsappNumber.replace(/\D/g, '');
      if (digits.length < 8 || digits.length > 15) return sendJson(res, 400, { error: 'WhatsApp number looks invalid.' }, { 'Cache-Control': 'no-store' });
    }

    const supabase = getSupabaseAdmin() as any;
    const { error } = await supabase.from('contact_messages').insert({ name, email, whatsapp_number: whatsappNumber || null, message } as any);
    if (error) return sendJson(res, 500, { error: error.message || 'Failed to save message.' }, { 'Cache-Control': 'no-store' });

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
