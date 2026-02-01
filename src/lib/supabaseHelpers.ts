import { supabase } from '@/integrations/supabase/client';

// Check if env vars are present (with trimming)
const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const SUPABASE_URL = rawUrl?.trim() || '';
export const SUPABASE_KEY = rawKey?.trim() || '';

export const supabaseReady = !!(SUPABASE_URL && SUPABASE_KEY);

// Default timeout for all requests
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
const MAX_RETRIES = 2;
const RETRY_DELAYS = [500, 1500];

/**
 * Get masked environment status for display
 */
export function getSupabaseEnvStatus() {
  return {
    hasUrl: !!SUPABASE_URL,
    hasKey: !!SUPABASE_KEY,
    urlMasked: SUPABASE_URL ? `${SUPABASE_URL.slice(0, 30)}...` : 'NOT SET',
    urlLength: rawUrl?.length ?? 0,
    keyLength: rawKey?.length ?? 0,
    urlTrimmed: rawUrl !== SUPABASE_URL,
    keyTrimmed: rawKey !== SUPABASE_KEY,
  };
}

/**
 * Fetch with AbortController timeout - real cancellation
 */
async function fetchWithAbort(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      const abortError = new Error(`Request aborted after ${timeoutMs}ms timeout`);
      (abortError as any).isTimeout = true;
      (abortError as any).url = url;
      (abortError as any).timeoutMs = timeoutMs;
      throw abortError;
    }
    // Re-throw with url info
    error.url = url;
    throw error;
  }
}

/**
 * REST Ping - Direct fetch to Supabase REST endpoint
 * Returns actual HTTP status and response body
 */
export async function restPing(): Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  text: string;
  elapsedMs: number;
  error?: string;
}> {
  if (!supabaseReady) {
    return {
      ok: false,
      status: 0,
      statusText: 'Not Configured',
      text: 'Supabase URL or Key is missing',
      elapsedMs: 0,
      error: 'ENV_MISSING',
    };
  }

  const startTime = performance.now();
  const url = `${SUPABASE_URL}/rest/v1/`;

  try {
    const response = await fetchWithAbort(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    }, 10000);

    const text = await response.text();
    const elapsedMs = Math.round(performance.now() - startTime);

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      text: text.slice(0, 500),
      elapsedMs,
    };
  } catch (error: any) {
    const elapsedMs = Math.round(performance.now() - startTime);
    
    return {
      ok: false,
      status: 0,
      statusText: error.name || 'Error',
      text: error.message || 'Unknown error',
      elapsedMs,
      error: error.isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
    };
  }
}

/**
 * Auth Health - Public health check endpoint (should return 200)
 */
export async function authHealth(): Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  text: string;
  elapsedMs: number;
  error?: string;
}> {
  if (!supabaseReady) {
    return {
      ok: false,
      status: 0,
      statusText: 'Not Configured',
      text: 'Supabase URL or Key is missing',
      elapsedMs: 0,
      error: 'ENV_MISSING',
    };
  }

  const startTime = performance.now();
  const url = `${SUPABASE_URL}/auth/v1/health`;

  try {
    const response = await fetchWithAbort(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    }, 10000);

    const text = await response.text();
    const elapsedMs = Math.round(performance.now() - startTime);

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      text: text.slice(0, 500),
      elapsedMs,
    };
  } catch (error: any) {
    const elapsedMs = Math.round(performance.now() - startTime);
    
    return {
      ok: false,
      status: 0,
      statusText: error.name || 'Error',
      text: error.message || 'Unknown error',
      elapsedMs,
      error: error.isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
    };
  }
}

/**
 * Auth Session Status - Check if user is logged in (no HTTP call)
 */
export async function authSessionStatus(): Promise<{
  hasSession: boolean;
  userId?: string;
  expiresAt?: number;
  error?: string;
}> {
  if (!supabaseReady || !supabase) {
    return { hasSession: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      return { hasSession: false, error: error.message };
    }

    if (data.session) {
      return {
        hasSession: true,
        userId: data.session.user.id,
        expiresAt: data.session.expires_at,
      };
    }

    return { hasSession: false };
  } catch (err: any) {
    return { hasSession: false, error: err.message };
  }
}

/**
 * Legacy restWhoAmI - kept for backwards compatibility
 */
export async function restWhoAmI(): Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  text: string;
  elapsedMs: number;
  error?: string;
}> {
  if (!supabaseReady) {
    return {
      ok: false,
      status: 0,
      statusText: 'Not Configured',
      text: 'Supabase URL or Key is missing',
      elapsedMs: 0,
      error: 'ENV_MISSING',
    };
  }

  const startTime = performance.now();
  const url = `${SUPABASE_URL}/auth/v1/user`;

  try {
    const response = await fetchWithAbort(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    }, 10000);

    const text = await response.text();
    const elapsedMs = Math.round(performance.now() - startTime);

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      text: text.slice(0, 500),
      elapsedMs,
    };
  } catch (error: any) {
    const elapsedMs = Math.round(performance.now() - startTime);
    
    return {
      ok: false,
      status: 0,
      statusText: error.name || 'Error',
      text: error.message || 'Unknown error',
      elapsedMs,
      error: error.isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
    };
  }
}

/**
 * REST Table Probe - Direct REST call to test a specific table
 * Reveals the real HTTP status without supabase-js abstraction
 */
export async function restTableProbe(table: string): Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  text: string;
  elapsedMs: number;
  error?: string;
}> {
  if (!supabaseReady) {
    return {
      ok: false,
      status: 0,
      statusText: 'Not Configured',
      text: 'Supabase URL or Key is missing',
      elapsedMs: 0,
      error: 'ENV_MISSING',
    };
  }

  const startTime = performance.now();
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`;

  try {
    const response = await fetchWithAbort(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept': 'application/json',
        'Prefer': 'count=exact',
      },
    }, 15000);

    const text = await response.text();
    const elapsedMs = Math.round(performance.now() - startTime);

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      text: text.slice(0, 800),
      elapsedMs,
    };
  } catch (error: any) {
    const elapsedMs = Math.round(performance.now() - startTime);
    
    return {
      ok: false,
      status: 0,
      statusText: error.name || 'Error',
      text: error.message || 'Unknown error',
      elapsedMs,
      error: error.isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
    };
  }
}

/**
 * Warmup - Pre-warm the PostgREST connection to avoid cold-start delays
 */
export async function warmup(): Promise<{ restPing: any; tableProbe: any }> {
  const [pingResult, probeResult] = await Promise.all([
    restPing(),
    restTableProbe('symbols'),
  ]);

  return {
    restPing: pingResult,
    tableProbe: probeResult,
  };
}

/**
 * Get hint message based on HTTP status code
 */
export function getStatusHint(status: number, errorType?: string): string | null {
  if (errorType === 'TIMEOUT') {
    return 'Request timed out. Check network connection or Supabase status.';
  }
  if (errorType === 'NETWORK_ERROR') {
    return 'Network error. Check if CORS is blocking or if the URL is correct.';
  }
  if (status === 401 || status === 403) {
    return 'Key is invalid, disabled, or not authorized for this action.';
  }
  if (status === 404) {
    return 'Project URL is incorrect or endpoint does not exist.';
  }
  if (status >= 500 && status < 600) {
    return 'Supabase service issue or maintenance. Check status.supabase.com';
  }
  if (status === 0) {
    return 'Network/CORS blocked. Check browser console Network tab for details.';
  }
  return null;
}

/**
 * Safe query wrapper with AbortController timeout, retries, and detailed error reporting
 */
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<{ 
  data: T | null; 
  error: string | null; 
  timedOut: boolean; 
  elapsedMs: number;
  retryAttempts: number;
}> {
  if (!supabaseReady) {
    return { data: null, error: 'Supabase not configured', timedOut: false, elapsedMs: 0, retryAttempts: 0 };
  }

  const startTime = performance.now();
  let lastError: string | null = null;
  let retryAttempts = 0;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      retryAttempts++;
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt - 1] || 1000));
    }

    try {
      // Race between query and timeout
      const result = await Promise.race([
        queryFn(),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`ABORT after ${timeoutMs}ms (attempt ${attempt + 1}/${MAX_RETRIES + 1})`));
          }, timeoutMs);
        }),
      ]);

      const elapsedMs = Math.round(performance.now() - startTime);

      if (result.error) {
        const errorMsg = result.error.message || result.error.details || JSON.stringify(result.error);
        
        // Don't retry on auth/permission errors
        if (result.error.code === 'PGRST301' || result.error.code === '42501') {
          return { data: null, error: errorMsg, timedOut: false, elapsedMs, retryAttempts };
        }
        
        lastError = errorMsg;
        continue; // Retry on other errors
      }

      return { data: result.data, error: null, timedOut: false, elapsedMs, retryAttempts };

    } catch (err: any) {
      const elapsedMs = Math.round(performance.now() - startTime);

      const isTimeout = err.message?.includes('ABORT') || err.name === 'AbortError';
      const isNetworkError = err.message?.includes('Failed to fetch') || err.message?.includes('network');
      
      lastError = err.message || 'Unknown error';

      // Only retry on timeout or network errors
      if (!isTimeout && !isNetworkError) {
        return { data: null, error: lastError, timedOut: isTimeout, elapsedMs, retryAttempts };
      }

      // On last attempt, return the error
      if (attempt === MAX_RETRIES) {
        return { 
          data: null, 
          error: `${lastError} (after ${retryAttempts + 1} attempts)`, 
          timedOut: isTimeout, 
          elapsedMs, 
          retryAttempts 
        };
      }
    }
  }

  const elapsedMs = Math.round(performance.now() - startTime);
  return { 
    data: null, 
    error: lastError || 'Max retries exceeded', 
    timedOut: false, 
    elapsedMs, 
    retryAttempts 
  };
}

// Re-export supabase for convenience
export { supabase };
