import { supabase } from '@/integrations/supabase/client';

// Check if env vars are present
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabaseReady = !!(SUPABASE_URL && SUPABASE_KEY);

export function getSupabaseEnvStatus() {
  return {
    hasUrl: !!SUPABASE_URL,
    hasKey: !!SUPABASE_KEY,
    urlMasked: SUPABASE_URL ? `${SUPABASE_URL.slice(0, 30)}...` : 'NOT SET',
  };
}

// Safe query wrapper with timeout
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  timeoutMs = 8000
): Promise<{ data: T | null; error: string | null; timedOut: boolean }> {
  if (!supabaseReady) {
    return { data: null, error: 'Supabase not configured', timedOut: false };
  }
  
  try {
    const result = await Promise.race([
      queryFn(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
      ),
    ]);
    
    if (result.error) {
      return { data: null, error: result.error.message, timedOut: false };
    }
    return { data: result.data, error: null, timedOut: false };
  } catch (err: any) {
    const timedOut = err.message === 'Request timed out';
    return { data: null, error: err.message, timedOut };
  }
}

// Re-export supabase for convenience
export { supabase };
