import type { NewsletterSubscriber } from '../types';
import { getSupabase } from './supabaseClient';

const TABLE = 'newsletter_subscribers';

export const subscribeNewsletter = async (email: string): Promise<void> => {
  const supabase = getSupabase();
  const normalized = (email || '').trim().toLowerCase();
  const { error } = await supabase.from(TABLE).insert({ email: normalized });
  if (error) throw error;
};

type NewsletterSubscriberRow = {
  email: string;
  created_at: string;
};

export const listNewsletterSubscribers = async (): Promise<NewsletterSubscriber[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select('email,created_at')
    .order('created_at', { ascending: false })
    .limit(500)
    .returns<NewsletterSubscriberRow[]>();

  if (error) throw error;
  return (data || []).map((row) => ({ email: row.email, createdAt: row.created_at }));
};
