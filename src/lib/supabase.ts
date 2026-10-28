import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readSupabaseConfig } from './env';

export const supabaseConfig = readSupabaseConfig(import.meta.env);

/** Null when the app is not configured; the UI then runs in demo mode with sample data. */
export const supabase: SupabaseClient | null = supabaseConfig.ok
  ? createClient(supabaseConfig.config.url, supabaseConfig.config.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export const isSupabaseConfigured = supabase !== null;

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
  return supabase;
}
