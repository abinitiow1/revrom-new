import { getSupabase } from './supabaseClient';

export const getIsAdmin = async (): Promise<boolean> => {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('is_admin');
  if (error) throw error;
  return !!data;
};

