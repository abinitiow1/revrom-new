import type { ContactMessage } from '../types';
import { getSupabase } from './supabaseClient';

const TABLE = 'contact_messages';

export type ContactMessageInput = {
  name: string;
  email: string;
  whatsappNumber?: string;
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
      whatsappNumber: input.whatsappNumber,
      message: input.message,
      turnstileToken: input.turnstileToken,
    }),
  });

  if (res.status === 404 && typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
    throw new Error('API route not available on localhost. Use `vercel dev` (recommended) or configure a dev proxy for /api/*.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(data?.error || 'Failed to send message.');
    err.status = res.status;
    throw err;
  }
};

type ContactMessageRow = {
  id: string;
  name: string;
  email: string;
  whatsapp_number?: string | null;
  message: string;
  created_at: string;
};

export const listContactMessages = async (): Promise<ContactMessage[]> => {
  const supabase = getSupabase();
  const res = await supabase
    .from(TABLE)
    .select('id,name,email,whatsapp_number,message,created_at')
    .order('created_at', { ascending: false })
    .limit(200)
    .returns<ContactMessageRow[]>();

  if (res.error) {
    const msg = String((res.error as any)?.message || '');
    if (msg.toLowerCase().includes('whatsapp_number') && msg.toLowerCase().includes('does not exist')) {
      const legacy = await supabase
        .from(TABLE)
        .select('id,name,email,message,created_at')
        .order('created_at', { ascending: false })
        .limit(200)
        .returns<Omit<ContactMessageRow, 'whatsapp_number'>[]>();
      if (legacy.error) throw legacy.error;
      return (legacy.data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        whatsappNumber: undefined,
        message: row.message,
        createdAt: row.created_at,
      }));
    }
    throw res.error;
  }

  return (res.data || []).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    whatsappNumber: (row as any).whatsapp_number || undefined,
    message: row.message,
    createdAt: row.created_at,
  }));
};
