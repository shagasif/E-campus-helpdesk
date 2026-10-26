import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Supabase is optional. With both values set (client/.env.local), accounts and requests are saved in the shared database.
// Without them, the site keeps working exactly as before, with everything saved in this browser only.
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const supabase: SupabaseClient | null = url && key
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

/** True when a Supabase project is configured. */
export const cloudEnabled = supabase !== null;
