import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabaseInstance = null;

export function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      '[Fatal] DB_PROVIDER is set to "supabase" but SUPABASE_URL or SUPABASE_ANON_KEY is missing. ' +
      'Strict production mode prevents silent fallback to local SQLite. ' +
      'Please configure SUPABASE_URL and SUPABASE_ANON_KEY in your environment variables.'
    );
  }

  supabaseInstance = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
  });

  return supabaseInstance;
}
