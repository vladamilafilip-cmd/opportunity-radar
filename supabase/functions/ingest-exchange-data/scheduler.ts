/**
 * IQ200 TIER SYSTEM - INGESTION SCHEDULER
 * 
 * Manages tier-based scheduling and circuit breaker logic.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================
// TYPES
// ============================================

export interface ScheduleEntry {
  id: string;
  exchange_id: string;
  exchange_code: string;
  symbol_tier: number;
  interval_minutes: number;
  next_run_at: string | null;
  consecutive_failures: number;
  backoff_until: string | null;
}

export interface TierConfig {
  t1: number;
  t2: number;
  t3: number;
  t4: number;
}

export interface LiquidityFilters {
  min_volume_24h: number;
  max_spread_bps: number;
  min_data_quality: number;
}

// ============================================
// SCHEDULER FUNCTIONS
// ============================================

/**
 * Get all schedules that need to run now
 */
export async function getDueSchedules(supabase: SupabaseClient): Promise<ScheduleEntry[]> {
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('ingestion_schedule')
    .select(`
      id,
      exchange_id,
      symbol_tier,
      interval_minutes,
      next_run_at,
      consecutive_failures,
      backoff_until,
      exchanges!inner (
        code
      )
    `)
    .eq('is_active', true)
    .or(`next_run_at.is.null,next_run_at.lte.${now}`)
    .or(`backoff_until.is.null,backoff_until.lte.${now}`);

  if (error) {
    console.error('Failed to get due schedules:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    exchange_id: row.exchange_id,
    exchange_code: row.exchanges.code,
    symbol_tier: row.symbol_tier,
    interval_minutes: row.interval_minutes,
    next_run_at: row.next_run_at,
    consecutive_failures: row.consecutive_failures,
    backoff_until: row.backoff_until,
  }));
}

/**
 * Group schedules by exchange for batch fetching
 */
export function groupSchedulesByExchange(schedules: ScheduleEntry[]): Map<string, ScheduleEntry[]> {
  const grouped = new Map<string, ScheduleEntry[]>();
  
  for (const schedule of schedules) {
    const existing = grouped.get(schedule.exchange_code) || [];
    existing.push(schedule);
    grouped.set(schedule.exchange_code, existing);
  }
  
  return grouped;
}

/**
 * Update schedule after successful run
 */
export async function markScheduleSuccess(
  supabase: SupabaseClient, 
  scheduleId: string, 
  intervalMinutes: number
): Promise<void> {
  const nextRun = new Date(Date.now() + intervalMinutes * 60 * 1000).toISOString();
  
  await supabase
    .from('ingestion_schedule')
    .update({
      last_run_at: new Date().toISOString(),
      next_run_at: nextRun,
      consecutive_failures: 0,
      backoff_until: null,
    })
    .eq('id', scheduleId);
}

/**
 * Update schedule after failed run with exponential backoff
 */
export async function markScheduleFailure(
  supabase: SupabaseClient, 
  scheduleId: string,
  currentFailures: number
): Promise<void> {
  const newFailures = currentFailures + 1;
  
  // Exponential backoff: 5min, 15min, 30min, then disable after 10 failures
  let backoffMinutes = 5;
  if (newFailures >= 10) {
    // Disable after 10 consecutive failures
    await supabase
      .from('ingestion_schedule')
      .update({
        is_active: false,
        consecutive_failures: newFailures,
      })
      .eq('id', scheduleId);
    return;
  } else if (newFailures >= 5) {
    backoffMinutes = 30;
  } else if (newFailures >= 3) {
    backoffMinutes = 15;
  }
  
  const backoffUntil = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString();
  
  await supabase
    .from('ingestion_schedule')
    .update({
      consecutive_failures: newFailures,
      backoff_until: backoffUntil,
    })
    .eq('id', scheduleId);
}

/**
 * Get tier intervals from engine_config
 */
export async function getTierIntervals(supabase: SupabaseClient): Promise<TierConfig> {
  const { data } = await supabase
    .from('engine_config')
    .select('config_value')
    .eq('config_key', 'tier_intervals')
    .single();
    
  return data?.config_value || { t1: 1, t2: 3, t3: 5, t4: 10 };
}

/**
 * Get liquidity filters from engine_config
 */
export async function getLiquidityFilters(supabase: SupabaseClient): Promise<LiquidityFilters> {
  const { data } = await supabase
    .from('engine_config')
    .select('config_value')
    .eq('config_key', 'liquidity_filters')
    .single();
    
  return data?.config_value || { 
    min_volume_24h: 1000000, 
    max_spread_bps: 50,
    min_data_quality: 0.5 
  };
}

/**
 * Get hub exchanges from engine_config
 */
export async function getHubExchanges(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase
    .from('engine_config')
    .select('config_value')
    .eq('config_key', 'hub_exchanges')
    .single();
    
  return data?.config_value || ['binance', 'bybit', 'okx'];
}
