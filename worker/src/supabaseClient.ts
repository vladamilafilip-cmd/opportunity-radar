// worker/src/supabaseClient.ts
// Supabase client for the local worker

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Load from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

let supabaseInstance: SupabaseClient | null = null;

export function createSupabaseClient(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;
  
  // Prefer service role key for worker (bypasses RLS)
  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
  
  if (!SUPABASE_URL || !key) {
    console.error('[Supabase] Missing URL or key. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    throw new Error('Supabase configuration missing');
  }
  
  supabaseInstance = createClient(SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  
  console.log('[Supabase] Client initialized for:', SUPABASE_URL);
  return supabaseInstance;
}

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    return createSupabaseClient();
  }
  return supabaseInstance;
}
