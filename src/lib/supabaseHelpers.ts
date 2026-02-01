import { supabase } from '@/integrations/supabase/client';

// Check if env vars are present (with trimming)
const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const SUPABASE_URL = rawUrl?.trim() || '';
export const SUPABASE_KEY = rawKey?.trim() || '';

export const supabaseReady = !!(SUPABASE_URL && SUPABASE_KEY);

// Default timeout for all requests
const DEFAULT_TIMEOUT_MS = 10000;

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
    });

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
 * Auth Ping - Direct fetch to Supabase Auth endpoint
 * Returns actual HTTP status and response body
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
    });

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
 * Safe query wrapper with AbortController timeout
 * Uses Promise.race with actual abort signal
 */
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<{ data: T | null; error: string | null; timedOut: boolean; elapsedMs: number }> {
  if (!supabaseReady) {
    return { data: null, error: 'Supabase not configured', timedOut: false, elapsedMs: 0 };
  }

  const startTime = performance.now();

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Race between query and timeout
    const result = await Promise.race([
      queryFn(),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error(`Query aborted after ${timeoutMs}ms timeout`));
        });
      }),
    ]);

    clearTimeout(timeoutId);
    const elapsedMs = Math.round(performance.now() - startTime);

    if (result.error) {
      return { data: null, error: result.error.message, timedOut: false, elapsedMs };
    }
    return { data: result.data, error: null, timedOut: false, elapsedMs };
  } catch (err: any) {
    const elapsedMs = Math.round(performance.now() - startTime);
    const timedOut = err.message?.includes('timeout') || err.message?.includes('aborted');
    return { data: null, error: err.message, timedOut, elapsedMs };
  }
}

// Re-export supabase for convenience
export { supabase };
