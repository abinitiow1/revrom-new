import { getSupabase } from './supabaseClient';

const TABLE = 'newsletter_subscribers';

export const subscribeNewsletter = async (email: string): Promise<void> => {
  const supabase = getSupabase();
  const normalized = (email || '').trim().toLowerCase();
  const { error } = await supabase.from(TABLE).insert({ email: normalized });
  if (error) throw error;
};

