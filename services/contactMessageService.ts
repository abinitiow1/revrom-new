import type { ContactMessage } from '../types';
import { getSupabase } from './supabaseClient';

const TABLE = 'contact_messages';

export type ContactMessageInput = {
  name: string;
  email: string;
  message: string;
  turnstileToken?: string;
};

export const submitContactMessage = async (input: ContactMessageInput): Promise<void> => {
  const res = await fetch('/api/forms/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      message: input.message,
      turnstileToken: input.turnstileToken,
    }),
  });

  if (res.status === 404 && typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
    throw new Error('API route not available on localhost. Use `vercel dev` (recommended) or configure a dev proxy for /api/*.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Failed to send message.');
};

type ContactMessageRow = {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
};

export const listContactMessages = async (): Promise<ContactMessage[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select('id,name,email,message,created_at')
    .order('created_at', { ascending: false })
    .limit(200)
    .returns<ContactMessageRow[]>();

  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    message: row.message,
    createdAt: row.created_at,
  }));
};
