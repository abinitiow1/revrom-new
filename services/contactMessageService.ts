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

