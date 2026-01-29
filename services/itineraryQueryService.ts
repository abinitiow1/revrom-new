import type { ItineraryQuery } from '../types';
import { getSupabase } from './supabaseClient';

const TABLE = 'itinerary_queries';

type ItineraryQueryRow = {
  id: string;
  trip_id: string;
  trip_title: string;
  name: string;
  whatsapp_number: string;
  planning_time: string;
  date: string;
  status: string | null;
};

const toRow = (lead: ItineraryQuery): ItineraryQueryRow => ({
  id: lead.id,
  trip_id: lead.tripId,
  trip_title: lead.tripTitle,
  name: lead.name,
  whatsapp_number: lead.whatsappNumber,
  planning_time: lead.planningTime,
  date: lead.date,
  status: lead.status ?? 'new',
});

const fromRow = (row: ItineraryQueryRow): ItineraryQuery => ({
  id: row.id,
  tripId: row.trip_id,
  tripTitle: row.trip_title,
  name: row.name,
  whatsappNumber: row.whatsapp_number,
  planningTime: row.planning_time,
  date: row.date,
  status: (row.status || 'new') as any,
});

export const submitItineraryQuery = async (lead: ItineraryQuery): Promise<void> => {
  const supabase = getSupabase();
  const { error } = await supabase.from(TABLE).insert(toRow(lead));
  if (error) throw error;
};

export const listItineraryQueries = async (): Promise<ItineraryQuery[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select('id,trip_id,trip_title,name,whatsapp_number,planning_time,date,status')
    .order('date', { ascending: false })
    .limit(200)
    .returns<ItineraryQueryRow[]>();

  if (error) throw error;
  return (data || []).map(fromRow);
};

export const updateItineraryQueryStatus = async (id: string, status: string): Promise<void> => {
  const supabase = getSupabase();
  const { error } = await supabase.from(TABLE).update({ status }).eq('id', id);
  if (error) throw error;
};
