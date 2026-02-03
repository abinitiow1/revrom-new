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

  const res = await fetch('/api/forms/newsletter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: normalized, turnstileToken: opts?.turnstileToken }),
  });

  if (res.status === 404 && typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
    throw new Error('API route not available on localhost. Use `vercel dev` (recommended) or configure a dev proxy for /api/*.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(data?.error || 'Could not subscribe.');
    err.status = res.status;
    throw err;
  }
  return { duplicate: !!data?.duplicate };
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
