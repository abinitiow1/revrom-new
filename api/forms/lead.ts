import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { rateLimitOrThrow, readJsonBody, sendJson, verifyTurnstileOrThrow } from '../geoapify/shared.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' });

    rateLimitOrThrow(req, 25, 10 * 60 * 1000, 'forms:lead'); // 25 requests / 10 minutes / IP

    const body = await readJsonBody(req);
    const turnstileToken = String(body?.turnstileToken || '').trim();
    await verifyTurnstileOrThrow(req, turnstileToken);

    const tripId = String(body?.tripId || '').trim();
    const tripTitle = String(body?.tripTitle || '').trim();
    const name = String(body?.name || '').trim();
    const whatsappNumber = String(body?.whatsappNumber || '').trim();
    const planningTime = String(body?.planningTime || '').trim();
    const date = String(body?.date || new Date().toISOString()).trim();
    const status = String(body?.status || 'new').trim();

    if (!tripId || !tripTitle) return sendJson(res, 400, { error: 'Missing trip details.' });
    if (!name) return sendJson(res, 400, { error: 'Name is required.' });
    if (!whatsappNumber) return sendJson(res, 400, { error: 'WhatsApp number is required.' });

    const supabase = getSupabaseAdmin() as any;
    const { error } = await supabase.from('itinerary_queries').insert({
      id: String(body?.id || '').trim() || undefined,
      trip_id: tripId,
      trip_title: tripTitle,
      name,
      whatsapp_number: whatsappNumber,
      planning_time: planningTime || 'Website inquiry',
      date,
      status,
    } as any);

    if (error) return sendJson(res, 500, { error: error.message || 'Failed to save lead.' }, { 'Cache-Control': 'no-store' });

    return sendJson(res, 200, { ok: true }, { 'Cache-Control': 'no-store' });
  } catch (e: any) {
    const status = e?.statusCode || 500;
    return sendJson(res, status, { error: e?.message || 'Server error.' }, { 'Cache-Control': 'no-store' });
  }
}
