/**
 * CRYPTO ARBITRAGE OS - DATA INGESTION ENGINE
 * 
 * This edge function fetches real-time data from crypto exchanges:
 * - Funding rates for perpetual futures
 * - Mark prices and ticker data
 * 
 * Supported exchanges:
 * - Binance (fapi.binance.com)
 * - Bybit (api.bybit.com)
 * 
 * Runs every minute via pg_cron to keep data fresh
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
}

interface FundingRateData {
  market_id: string;
  funding_rate: number;
  next_funding_ts: string | null;
  ts: string;
}

interface PriceData {
  market_id: string;
  last_price: number;
  mark_price: number;
  bid_price: number | null;
  ask_price: number | null;
  volume_24h: number | null;
  open_interest: number | null;
  ts: string;
}

interface IngestionStats {
  exchange: string;
  funding_rates_fetched: number;
  prices_fetched: number;
  errors: string[];
}

// ============================================
// EXCHANGE API FETCHERS
// ============================================

/**
 * Fetch funding rates from Binance Futures
 * API: GET /fapi/v1/premiumIndex
 */
async function fetchBinanceFundingRates(): Promise<Map<string, { rate: number; nextFundingTs: string; markPrice: number }>> {
  const result = new Map();
  
  try {
    const response = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex');
    if (!response.ok) throw new Error(`Binance API error: ${response.status}`);
    
    const data = await response.json();
    
    for (const item of data) {
      result.set(item.symbol, {
        rate: parseFloat(item.lastFundingRate),
        nextFundingTs: new Date(item.nextFundingTime).toISOString(),
        markPrice: parseFloat(item.markPrice),
      });
    }
  } catch (error) {
    console.error('Binance funding rates error:', error);
  }
  
  return result;
}

/**
 * Fetch ticker data from Binance Futures
 * API: GET /fapi/v1/ticker/24hr
 */
async function fetchBinanceTickers(): Promise<Map<string, { lastPrice: number; volume: number; bidPrice: number; askPrice: number }>> {
  const result = new Map();
  
  try {
    const response = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr');
    if (!response.ok) throw new Error(`Binance ticker API error: ${response.status}`);
    
    const data = await response.json();
    
    for (const item of data) {
      result.set(item.symbol, {
        lastPrice: parseFloat(item.lastPrice),
        volume: parseFloat(item.quoteVolume),
        bidPrice: parseFloat(item.bidPrice),
        askPrice: parseFloat(item.askPrice),
      });
    }
  } catch (error) {
    console.error('Binance tickers error:', error);
  }
  
  return result;
}

/**
 * Fetch open interest from Binance Futures
 * API: GET /fapi/v1/openInterest
 */
async function fetchBinanceOpenInterest(symbols: string[]): Promise<Map<string, number>> {
  const result = new Map();
  
  // Limit concurrent requests
  const batchSize = 10;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    
    const promises = batch.map(async (symbol) => {
      try {
        const response = await fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`);
        if (response.ok) {
          const data = await response.json();
          result.set(symbol, parseFloat(data.openInterest) * parseFloat(data.openInterest > 0 ? '1' : '0'));
        }
      } catch (error) {
        // Silently skip failed OI fetches
      }
    });
    
    await Promise.all(promises);
  }
  
  return result;
}

/**
 * Fetch funding rates from Bybit
 * API: GET /v5/market/tickers?category=linear
 */
async function fetchBybitData(): Promise<{
  funding: Map<string, { rate: number; nextFundingTs: string }>;
  tickers: Map<string, { lastPrice: number; markPrice: number; volume: number; bidPrice: number; askPrice: number; openInterest: number }>;
}> {
  const funding = new Map();
  const tickers = new Map();
  
  try {
    const response = await fetch('https://api.bybit.com/v5/market/tickers?category=linear');
    if (!response.ok) throw new Error(`Bybit API error: ${response.status}`);
    
    const data = await response.json();
    
    if (data.result && data.result.list) {
      for (const item of data.result.list) {
        // Only USDT perpetuals
        if (!item.symbol.endsWith('USDT')) continue;
        
        funding.set(item.symbol, {
          rate: parseFloat(item.fundingRate || '0'),
          nextFundingTs: item.nextFundingTime ? new Date(parseInt(item.nextFundingTime)).toISOString() : null,
        });
        
        tickers.set(item.symbol, {
          lastPrice: parseFloat(item.lastPrice || '0'),
          markPrice: parseFloat(item.markPrice || item.lastPrice || '0'),
          volume: parseFloat(item.turnover24h || '0'),
          bidPrice: parseFloat(item.bid1Price || '0'),
          askPrice: parseFloat(item.ask1Price || '0'),
          openInterest: parseFloat(item.openInterest || '0'),
        });
      }
    }
  } catch (error) {
    console.error('Bybit data error:', error);
  }
  
  return { funding, tickers };
}

// ============================================
// DATA INGESTION CORE
// ============================================

async function ingestExchangeData(supabase: SupabaseClient): Promise<{
  success: boolean;
  stats: IngestionStats[];
  totalRecords: { funding: number; prices: number };
  error?: string;
}> {
  const now = new Date().toISOString();
  const allStats: IngestionStats[] = [];
  let totalFunding = 0;
  let totalPrices = 0;

  // Log ingestion run
  const { data: runData } = await supabase
    .from('ingestion_runs')
    .insert({
      source: 'multi-exchange',
      run_type: 'scheduled',
      status: 'running',
    } as any)
    .select('id')
    .single();

  const runId = runData?.id;

  try {
    // ========================================
    // STEP 1: Get all active markets
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
        )
      `)
      .eq('is_active', true);

    if (marketsError) throw new Error(`Markets fetch error: ${marketsError.message}`);

    // Build market lookup maps
    const marketsByExchange = new Map<string, MarketInfo[]>();
    
    for (const market of (markets || []) as any[]) {
      const exchangeCode = market.exchanges.code.toLowerCase();
      if (!marketsByExchange.has(exchangeCode)) {
        marketsByExchange.set(exchangeCode, []);
      }
      marketsByExchange.get(exchangeCode)!.push({
        market_id: market.id,
        symbol_id: market.symbol_id,
        exchange_id: market.exchange_id,
        exchange_code: exchangeCode,
        exchange_symbol: market.exchange_symbol,
      });
    }

    // ========================================
    // STEP 2: Fetch data from Binance
    // ========================================
    const binanceStats: IngestionStats = {
      exchange: 'binance',
      funding_rates_fetched: 0,
      prices_fetched: 0,
      errors: [],
    };

    const binanceMarkets = marketsByExchange.get('binance') || [];
    
    if (binanceMarkets.length > 0) {
      // Fetch all Binance data in parallel
      const [binanceFunding, binanceTickers] = await Promise.all([
        fetchBinanceFundingRates(),
        fetchBinanceTickers(),
      ]);

      // Get symbols for OI fetch
      const binanceSymbols = binanceMarkets.map(m => m.exchange_symbol);
      const binanceOI = await fetchBinanceOpenInterest(binanceSymbols);

      const fundingRates: FundingRateData[] = [];
      const prices: PriceData[] = [];

      for (const market of binanceMarkets) {
        const fundingData = binanceFunding.get(market.exchange_symbol);
        const tickerData = binanceTickers.get(market.exchange_symbol);
        const oi = binanceOI.get(market.exchange_symbol);

        if (fundingData) {
          fundingRates.push({
            market_id: market.market_id,
            funding_rate: fundingData.rate,
            next_funding_ts: fundingData.nextFundingTs,
            ts: now,
          });
        }

        if (tickerData || fundingData) {
          prices.push({
            market_id: market.market_id,
            last_price: tickerData?.lastPrice || 0,
            mark_price: fundingData?.markPrice || tickerData?.lastPrice || 0,
            bid_price: tickerData?.bidPrice || null,
            ask_price: tickerData?.askPrice || null,
            volume_24h: tickerData?.volume || null,
            open_interest: oi || null,
            ts: now,
          });
        }
      }

      // Insert Binance data
      if (fundingRates.length > 0) {
        const { error } = await supabase.from('funding_rates').insert(fundingRates as any[]);
        if (error) {
          binanceStats.errors.push(`Funding insert: ${error.message}`);
        } else {
          binanceStats.funding_rates_fetched = fundingRates.length;
          totalFunding += fundingRates.length;
        }
      }

      if (prices.length > 0) {
        const { error } = await supabase.from('prices').insert(prices as any[]);
        if (error) {
          binanceStats.errors.push(`Prices insert: ${error.message}`);
        } else {
          binanceStats.prices_fetched = prices.length;
          totalPrices += prices.length;
        }
      }
    }

    allStats.push(binanceStats);

    // ========================================
    // STEP 3: Fetch data from Bybit
    // ========================================
    const bybitStats: IngestionStats = {
      exchange: 'bybit',
      funding_rates_fetched: 0,
      prices_fetched: 0,
      errors: [],
    };

    const bybitMarkets = marketsByExchange.get('bybit') || [];
    
    if (bybitMarkets.length > 0) {
      const { funding: bybitFunding, tickers: bybitTickers } = await fetchBybitData();

      const fundingRates: FundingRateData[] = [];
      const prices: PriceData[] = [];

      for (const market of bybitMarkets) {
        const fundingData = bybitFunding.get(market.exchange_symbol);
        const tickerData = bybitTickers.get(market.exchange_symbol);

        if (fundingData) {
          fundingRates.push({
            market_id: market.market_id,
            funding_rate: fundingData.rate,
            next_funding_ts: fundingData.nextFundingTs,
            ts: now,
          });
        }

        if (tickerData) {
          prices.push({
            market_id: market.market_id,
            last_price: tickerData.lastPrice,
            mark_price: tickerData.markPrice,
            bid_price: tickerData.bidPrice,
            ask_price: tickerData.askPrice,
            volume_24h: tickerData.volume,
            open_interest: tickerData.openInterest,
            ts: now,
          });
        }
      }

      // Insert Bybit data
      if (fundingRates.length > 0) {
        const { error } = await supabase.from('funding_rates').insert(fundingRates as any[]);
        if (error) {
          bybitStats.errors.push(`Funding insert: ${error.message}`);
        } else {
          bybitStats.funding_rates_fetched = fundingRates.length;
          totalFunding += fundingRates.length;
        }
      }

      if (prices.length > 0) {
        const { error } = await supabase.from('prices').insert(prices as any[]);
        if (error) {
          bybitStats.errors.push(`Prices insert: ${error.message}`);
        } else {
          bybitStats.prices_fetched = prices.length;
          totalPrices += prices.length;
        }
      }
    }

    allStats.push(bybitStats);

    // ========================================
    // STEP 4: Update ingestion run log
    // ========================================
    if (runId) {
      await supabase
        .from('ingestion_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          records_fetched: totalFunding + totalPrices,
          records_inserted: totalFunding + totalPrices,
          metadata: { stats: allStats },
        } as any)
        .eq('id', runId);
    }

    // ========================================
    // STEP 5: Trigger metrics engine
    // ========================================
    // Call the metrics engine to process new data
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
      stats: allStats,
      totalRecords: { funding: totalFunding, prices: totalPrices },
    };

  } catch (error: any) {
    console.error('Ingestion error:', error);

    if (runId) {
      await supabase
        .from('ingestion_runs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          errors: [{ message: error.message, stack: error.stack }],
        } as any)
        .eq('id', runId);
    }

    return {
      success: false,
      stats: allStats,
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
        stats: result.stats,
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
