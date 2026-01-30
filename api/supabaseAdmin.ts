import { createClient } from '@supabase/supabase-js';

let adminClient: ReturnType<typeof createClient> | null = null;

export const getSupabaseAdmin = () => {
  if (adminClient) return adminClient;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    // Keep the message explicit; this is the #1 cause of “works locally but not on Vercel”.
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY on the server.');
  }

  adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return adminClient;
};

