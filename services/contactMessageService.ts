import type { ContactMessage } from '../types';
import { getSupabase } from './supabaseClient';

const TABLE = 'contact_messages';

export type ContactMessageInput = {
  name: string;
  email: string;
  message: string;
};

export const submitContactMessage = async (input: ContactMessageInput): Promise<void> => {
  const supabase = getSupabase();
  const { error } = await supabase.from(TABLE).insert({
    name: input.name,
    email: input.email,
    message: input.message,
  });
  if (error) throw error;
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
