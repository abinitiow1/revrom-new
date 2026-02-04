import type { ItineraryQuery } from '../types';
import { getSupabase } from './supabaseClient';

const TABLE = 'itinerary_queries';

type ItineraryQueryRow = {
  id: string;
  trip_id: string;
  trip_title: string;
  name: string;
  whatsapp_number: string | null;
  email: string | null;
  planning_time: string;
  date: string;
  status: string | null;
};

const toRow = (lead: ItineraryQuery): ItineraryQueryRow => ({
  id: lead.id,
  trip_id: lead.tripId,
  trip_title: lead.tripTitle,
  name: lead.name,
  whatsapp_number: lead.whatsappNumber ?? null,
  email: lead.email ?? null,
  planning_time: lead.planningTime,
  date: lead.date,
  status: lead.status ?? 'new',
});

const fromRow = (row: ItineraryQueryRow): ItineraryQuery => ({
  id: row.id,
  tripId: row.trip_id,
  tripTitle: row.trip_title,
  name: row.name,
  whatsappNumber: row.whatsapp_number || undefined,
  email: row.email || undefined,
  planningTime: row.planning_time,
  date: row.date,
  status: (row.status || 'new') as any,
});

export const submitItineraryQuery = async (lead: ItineraryQuery): Promise<void> => {
  // Require Turnstile token on production/preview to prevent automated spam.
  const token = (lead as any)?.turnstileToken as string | undefined;
  if (!token) return; // best-effort: still allow the UX (WhatsApp) without saving a lead.

  const res = await fetch('/api/forms/lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tripId: lead.tripId,
      tripTitle: lead.tripTitle,
      name: lead.name,
      whatsappNumber: lead.whatsappNumber,
      email: lead.email,
      planningTime: lead.planningTime,
      turnstileToken: token,
    }),
  });

  if (res.status === 404 && typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
    throw new Error('API route not available on localhost. Use `vercel dev` (recommended) or configure a dev proxy for /api/*.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(data?.error || 'Failed to submit lead.');
    err.status = res.status;
    throw err;
  }
};

export const listItineraryQueries = async (): Promise<ItineraryQuery[]> => {
  const supabase = getSupabase();
  const res = await supabase
    .from(TABLE)
    .select('id,trip_id,trip_title,name,whatsapp_number,email,planning_time,date,status')
    .order('date', { ascending: false })
    .limit(200)
    .returns<ItineraryQueryRow[]>();

  if (res.error) {
    // Backward-compatible: if the DB hasn't been migrated yet, retry without newer columns.
    const msg = String((res.error as any)?.message || '');
    if (msg.toLowerCase().includes('email') && msg.toLowerCase().includes('does not exist')) {
      const legacy = await supabase
        .from(TABLE)
        .select('id,trip_id,trip_title,name,whatsapp_number,planning_time,date,status')
        .order('date', { ascending: false })
        .limit(200)
        .returns<Omit<ItineraryQueryRow, 'email'>[]>();
      if (legacy.error) throw legacy.error;
      return (legacy.data || []).map((row: any) => fromRow({ ...row, email: null } as any));
    }
    throw res.error;
  }

  return (res.data || []).map(fromRow);
};

export const updateItineraryQueryStatus = async (id: string, status: string): Promise<void> => {
  const supabase = getSupabase();
  const { error } = await supabase.from(TABLE).update({ status }).eq('id', id);
  if (error) throw error;
};
