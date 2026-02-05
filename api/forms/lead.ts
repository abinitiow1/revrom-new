import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { rateLimitOrThrow, readJsonBody, sendJson, verifyTurnstileOrThrow } from '../geoapify/shared.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' }, { 'Cache-Control': 'no-store' });

    await rateLimitOrThrow(req, 10, 5 * 60 * 1000, 'forms:lead'); // 10 requests / 5 minutes / IP

    const body = await readJsonBody(req);
    const turnstileToken = String(body?.turnstileToken || '').trim();
    await verifyTurnstileOrThrow(req, turnstileToken, 'forms:lead');

    const tripId = String(body?.tripId || '').trim();
    const tripTitle = String(body?.tripTitle || '').trim();
    const name = String(body?.name || '').trim();
    const whatsappNumber = String(body?.whatsappNumber || '').trim();
    const email = String(body?.email || '').trim();
    const planningTime = String(body?.planningTime || '').trim();
    const date = new Date().toISOString();
    const status = 'new';

    if (!tripId || !tripTitle) return sendJson(res, 400, { error: 'Missing trip details.' }, { 'Cache-Control': 'no-store' });
    if (!name) return sendJson(res, 400, { error: 'Name is required.' }, { 'Cache-Control': 'no-store' });
    if (!whatsappNumber && !email) return sendJson(res, 400, { error: 'Provide a WhatsApp number or an email.' }, { 'Cache-Control': 'no-store' });
    if (name.length > 120) return sendJson(res, 400, { error: 'Name is too long.' }, { 'Cache-Control': 'no-store' });
    if (tripTitle.length > 200) return sendJson(res, 400, { error: 'Trip title is too long.' }, { 'Cache-Control': 'no-store' });
    if (planningTime.length > 200) return sendJson(res, 400, { error: 'Planning time is too long.' }, { 'Cache-Control': 'no-store' });
    if (whatsappNumber.length > 40) return sendJson(res, 400, { error: 'WhatsApp number is too long.' }, { 'Cache-Control': 'no-store' });
    if (email.length > 254) return sendJson(res, 400, { error: 'Email is too long.' }, { 'Cache-Control': 'no-store' });
    if (email && !/\S+@\S+\.\S+/.test(email)) return sendJson(res, 400, { error: 'Valid email is required.' }, { 'Cache-Control': 'no-store' });

    // Keep the original formatting for display/follow-up, but validate based on digits.
    if (whatsappNumber) {
      const digits = whatsappNumber.replace(/\D/g, '');
      if (digits.length < 8 || digits.length > 15) return sendJson(res, 400, { error: 'WhatsApp number looks invalid.' }, { 'Cache-Control': 'no-store' });
    }

    const supabase = getSupabaseAdmin() as any;
    const { error } = await supabase.from('itinerary_queries').insert({
      trip_id: tripId,
      trip_title: tripTitle,
      name,
      whatsapp_number: whatsappNumber || null,
      email: email || null,
      planning_time: planningTime || 'Website inquiry',
      date,
      status,
    } as any);

    if (error) return sendJson(res, 500, { error: error.message || 'Failed to save lead.' }, { 'Cache-Control': 'no-store' });

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
