/**
 * IQ200 TIER SYSTEM - DATA INGESTION ENGINE
 * 
 * Tier-based multi-exchange data ingestion with:
 * - Batch API calls per exchange (no individual pair polling)
 * - Dynamic scheduling based on symbol/exchange tiers
 * - Circuit breaker for failed exchanges
 * - Liquidity pre-filtering
 * 
 * Runs every minute via pg_cron
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { 
  fetchExchangeData, 
  ExchangeData, 
  FundingData, 
  TickerData 
} from './exchangeFetchers.ts'
import {
  getDueSchedules,
  groupSchedulesByExchange,
  markScheduleSuccess,
  markScheduleFailure,
  getLiquidityFilters,
  ScheduleEntry,
  LiquidityFilters,
} from './scheduler.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================
// TYPES
// ============================================

interface MarketInfo {
  market_id: string;
  symbol_id: string;
  exchange_id: string;
  exchange_code: string;
  exchange_symbol: string;
  symbol_tier: number;
  base_asset: string;
}

interface FundingRateRow {
  market_id: string;
  funding_rate: number;
  next_funding_ts: string | null;
  ts: string;
}

interface PriceRow {
  market_id: string;
  last_price: number;
  mark_price: number;
  bid_price: number | null;
  ask_price: number | null;
  volume_24h: number | null;
  open_interest: number | null;
  ts: string;
}

interface IngestionResult {
  exchange: string;
  symbolTiers: number[];
  fundingCount: number;
  priceCount: number;
  skippedLowLiquidity: number;
  errors: string[];
}

// ============================================
// SYMBOL MAPPING HELPERS
// ============================================

/**
 * Normalize exchange symbols to match our DB format
 */
function normalizeSymbol(exchangeCode: string, rawSymbol: string): string {
  switch (exchangeCode) {
    case 'okx':
      // OKX: BTC-USDT-SWAP -> BTCUSDT
      return rawSymbol.replace('-USDT-SWAP', 'USDT').replace('-SWAP', '');
    case 'gate':
      // Gate: BTC_USDT -> BTCUSDT
      return rawSymbol.replace('_USDT', 'USDT');
    case 'kucoin':
      // KuCoin: BTCUSDTM -> BTCUSDT
      return rawSymbol.replace('USDTM', 'USDT');
    case 'htx':
      // HTX: BTC-USDT -> BTCUSDT
      return rawSymbol.replace('-USDT', 'USDT');
    case 'mexc':
      // MEXC: BTC_USDT -> BTCUSDT
      return rawSymbol.replace('_USDT', 'USDT');
    case 'kraken':
      // Kraken: PF_BTCUSD -> BTCUSDT (approximate)
      return rawSymbol.replace('PF_', '').replace('USD', 'USDT');
    case 'deribit':
      // Deribit: BTC-PERPETUAL -> BTCUSDT
      return rawSymbol.replace('-PERPETUAL', 'USDT');
    default:
      // Binance/Bybit: already in BTCUSDT format
      return rawSymbol;
  }
}

/**
 * Get exchange-specific symbol format from base asset
 */
function getExchangeSymbol(exchangeCode: string, baseAsset: string): string {
  switch (exchangeCode) {
    case 'okx':
      return `${baseAsset}-USDT-SWAP`;
    case 'gate':
      return `${baseAsset}_USDT`;
    case 'kucoin':
      return `${baseAsset}USDTM`;
    case 'htx':
      return `${baseAsset}-USDT`;
    case 'mexc':
      return `${baseAsset}_USDT`;
    case 'kraken':
      return `PF_${baseAsset}USD`;
    case 'deribit':
      return `${baseAsset}-PERPETUAL`;
    default:
      return `${baseAsset}USDT`;
  }
}

// ============================================
// LIQUIDITY FILTER
// ============================================

function passesLiquidityFilter(
  ticker: TickerData | undefined, 
  filters: LiquidityFilters
): boolean {
  if (!ticker) return false;
  
  // Skip low volume pairs
  if (ticker.volume24h < filters.min_volume_24h) return false;
  
  // Skip high spread (illiquid) pairs
  if (ticker.bidPrice > 0 && ticker.askPrice > 0) {
    const spreadBps = ((ticker.askPrice - ticker.bidPrice) / ticker.askPrice) * 10000;
    if (spreadBps > filters.max_spread_bps) return false;
  }
  
  return true;
}

// ============================================
// MAIN INGESTION LOGIC
// ============================================

async function ingestExchangeData(supabase: SupabaseClient): Promise<{
  success: boolean;
  results: IngestionResult[];
  totalRecords: { funding: number; prices: number };
  error?: string;
}> {
  const now = new Date().toISOString();
  const results: IngestionResult[] = [];
  let totalFunding = 0;
  let totalPrices = 0;

  try {
    // ========================================
    // STEP 1: Get due schedules
    // ========================================
    const dueSchedules = await getDueSchedules(supabase);
    
    if (dueSchedules.length === 0) {
      return {
        success: true,
        results: [],
        totalRecords: { funding: 0, prices: 0 },
      };
    }

    // Group by exchange for batch fetching
    const schedulesByExchange = groupSchedulesByExchange(dueSchedules);
    
    // ========================================
    // STEP 2: Get liquidity filters
    // ========================================
    const liquidityFilters = await getLiquidityFilters(supabase);

    // ========================================
    // STEP 3: Get all active markets
    // ========================================
    const { data: markets, error: marketsError } = await supabase
      .from('markets')
      .select(`
        id,
        symbol_id,
        exchange_id,
        exchange_symbol,
        exchanges!inner (
          id,
          code
        ),
        symbols!inner (
          id,
          base_asset,
          symbol_tier
        )
      `)
      .eq('is_active', true);

    if (marketsError) throw new Error(`Markets fetch error: ${marketsError.message}`);

    // Build market lookup by exchange and normalized symbol
    const marketLookup = new Map<string, MarketInfo>();
    
    for (const market of (markets || []) as any[]) {
      const key = `${market.exchanges.code}:${market.symbols.base_asset}`;
      marketLookup.set(key, {
        market_id: market.id,
        symbol_id: market.symbol_id,
        exchange_id: market.exchange_id,
        exchange_code: market.exchanges.code,
        exchange_symbol: market.exchange_symbol,
        symbol_tier: market.symbols.symbol_tier,
        base_asset: market.symbols.base_asset,
      });
    }

    // ========================================
    // STEP 4: Fetch and process each exchange
    // ========================================
    const exchangePromises = Array.from(schedulesByExchange.entries()).map(
      async ([exchangeCode, schedules]) => {
        const result: IngestionResult = {
          exchange: exchangeCode,
          symbolTiers: schedules.map(s => s.symbol_tier),
          fundingCount: 0,
          priceCount: 0,
          skippedLowLiquidity: 0,
          errors: [],
        };

        try {
          // Fetch all data from exchange (single batch call)
          const exchangeData = await fetchExchangeData(exchangeCode);
          result.errors.push(...exchangeData.errors);

          if (exchangeData.errors.length > 0 && 
              exchangeData.funding.size === 0 && 
              exchangeData.tickers.size === 0) {
            // Complete failure - mark all schedules as failed
            for (const schedule of schedules) {
              await markScheduleFailure(supabase, schedule.id, schedule.consecutive_failures);
            }
            return result;
          }

          // Determine which symbol tiers to process
          const tiersToProcess = new Set(schedules.map(s => s.symbol_tier));

          const fundingRows: FundingRateRow[] = [];
          const priceRows: PriceRow[] = [];

          // Process each symbol we have a market for
          for (const [key, market] of marketLookup) {
            if (market.exchange_code !== exchangeCode) continue;
            if (!tiersToProcess.has(market.symbol_tier)) continue;

            // Find matching data from exchange
            const exchangeSymbol = getExchangeSymbol(exchangeCode, market.base_asset);
            const funding = exchangeData.funding.get(exchangeSymbol);
            const ticker = exchangeData.tickers.get(exchangeSymbol);

            // Apply liquidity filter
            if (!passesLiquidityFilter(ticker, liquidityFilters)) {
              result.skippedLowLiquidity++;
              continue;
            }

            if (funding) {
              fundingRows.push({
                market_id: market.market_id,
                funding_rate: funding.fundingRate,
                next_funding_ts: funding.nextFundingTs,
                ts: now,
              });
            }

            if (ticker || funding) {
              priceRows.push({
                market_id: market.market_id,
                last_price: ticker?.lastPrice || 0,
                mark_price: funding?.markPrice || ticker?.markPrice || ticker?.lastPrice || 0,
                bid_price: ticker?.bidPrice || null,
                ask_price: ticker?.askPrice || null,
                volume_24h: ticker?.volume24h || null,
                open_interest: ticker?.openInterest || null,
                ts: now,
              });
            }
          }

          // Insert funding rates
          if (fundingRows.length > 0) {
            const { error } = await supabase.from('funding_rates').insert(fundingRows as any[]);
            if (error) {
              result.errors.push(`Funding insert: ${error.message}`);
            } else {
              result.fundingCount = fundingRows.length;
            }
          }

          // Insert prices
          if (priceRows.length > 0) {
            const { error } = await supabase.from('prices').insert(priceRows as any[]);
            if (error) {
              result.errors.push(`Prices insert: ${error.message}`);
            } else {
              result.priceCount = priceRows.length;
            }
          }

          // Mark schedules as success
          for (const schedule of schedules) {
            await markScheduleSuccess(supabase, schedule.id, schedule.interval_minutes);
          }

        } catch (error: any) {
          result.errors.push(error.message);
          // Mark all schedules as failed
          for (const schedule of schedules) {
            await markScheduleFailure(supabase, schedule.id, schedule.consecutive_failures);
          }
        }

        return result;
      }
    );

    // Execute all exchange fetches in parallel
    const exchangeResults = await Promise.all(exchangePromises);
    
    for (const result of exchangeResults) {
      results.push(result);
      totalFunding += result.fundingCount;
      totalPrices += result.priceCount;
    }

    // ========================================
    // STEP 5: Log ingestion run
    // ========================================
    await supabase
      .from('ingestion_runs')
      .insert({
        source: 'tier-based-multi-exchange',
        run_type: 'scheduled',
        status: 'completed',
        completed_at: new Date().toISOString(),
        records_fetched: totalFunding + totalPrices,
        records_inserted: totalFunding + totalPrices,
        metadata: { 
          results,
          exchanges_processed: results.length,
          schedules_due: dueSchedules.length,
        },
      } as any);

    // ========================================
    // STEP 6: Trigger metrics engine
    // ========================================
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    try {
      await fetch(`${supabaseUrl}/functions/v1/run-metrics-engine`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (triggerError) {
      console.error('Failed to trigger metrics engine:', triggerError);
    }

    return {
      success: true,
      results,
      totalRecords: { funding: totalFunding, prices: totalPrices },
    };

  } catch (error: any) {
    console.error('Ingestion error:', error);

    await supabase
      .from('ingestion_runs')
      .insert({
        source: 'tier-based-multi-exchange',
        run_type: 'scheduled',
        status: 'failed',
        completed_at: new Date().toISOString(),
        errors: [{ message: error.message, stack: error.stack }],
      } as any);

    return {
      success: false,
      results,
      totalRecords: { funding: totalFunding, prices: totalPrices },
      error: error.message,
    };
  }
}

// ============================================
// EDGE FUNCTION HANDLER
// ============================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const result = await ingestExchangeData(supabase);

    return new Response(
      JSON.stringify({
        success: result.success,
        results: result.results,
        total: result.totalRecords,
        error: result.error,
        timestamp: new Date().toISOString(),
      }),
      {
        status: result.success ? 200 : 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error: any) {
    console.error('Handler error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
