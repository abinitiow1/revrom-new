import type { NewsletterSubscriber } from '../types';
import { getSupabase } from './supabaseClient';

const TABLE = 'newsletter_subscribers';

export const subscribeNewsletter = async (
  email: string,
  opts?: { turnstileToken?: string }
): Promise<{ duplicate?: boolean }> => {
  // Normalize aggressively: users often paste emails with spaces/zero-width chars via autofill.
  const normalized = (email || '')
    .replace(/[\s\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .toLowerCase();

  const isLocalhost = typeof window !== 'undefined' && window.location?.hostname === 'localhost';
  if (!isLocalhost) {
    const res = await fetch('/api/forms/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalized, turnstileToken: opts?.turnstileToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Could not subscribe.');
    return { duplicate: !!data?.duplicate };
  }

  // Local dev fallback (no Vercel API routes unless using `vercel dev`).
  const supabase = getSupabase();
  const { error } = await supabase.from(TABLE).insert({ email: normalized });
  if (error) throw error;
  return { duplicate: false };
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
