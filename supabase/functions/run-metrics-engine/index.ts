/**
 * CRYPTO ARBITRAGE OS - METRICS & SCORING ENGINE
 * 
 * This edge function is the quantitative core of the trading system.
 * It transforms raw exchange data into actionable trading signals.
 * 
 * Pipeline:
 * 1. Fetch latest funding rates & prices from all markets
 * 2. Normalize funding to 8h equivalent
 * 3. Compute per-market metrics (costs, liquidity scores)
 * 4. Find cross-exchange arbitrage opportunities
 * 5. Calculate net edge after fees/slippage
 * 6. Score opportunities using professional model
 * 7. Generate trading signals for high-score opportunities
 * 
 * Runs every 30-60 seconds via cron
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================
// TYPES
// ============================================

interface EngineConfig {
  scoring_weights: { profit: number; liquidity: number; stability: number };
  thresholds: { min_net_edge_bps: number; min_opportunity_score: number; signal_ttl_hours: number };
  costs: { default_slippage_bps: number; extreme_funding_threshold: number };
  funding_intervals: Record<string, number>;
  risk_penalties: { extreme_funding: number; low_liquidity: number; high_volatility: number; stale_data: number };
}

interface MarketData {
  market_id: string;
  symbol_id: string;
  exchange_id: string;
  exchange_code: string;
  symbol_name: string;
  funding_rate: number;
  next_funding_ts: string | null;
  mark_price: number;
  volume_24h: number | null;
  open_interest: number | null;
  taker_fee: number;
  funding_ts: string;
  price_ts: string;
}

interface ComputedMetric {
  symbol_id: string;
  market_id: string;
  exchange_id: string;
  funding_rate_raw: number;
  funding_interval_hours: number;
  mark_price: number;
  funding_rate_8h: number;
  funding_rate_annual: number;
  spread_bps: number;
  volume_24h: number;
  open_interest: number;
  taker_fee_bps: number;
  slippage_bps: number;
  total_cost_bps: number;
  liquidity_score: number;
  volatility_score: number;
  data_quality: number;
  ts_bucket: string;
}

interface ArbitrageOpportunity {
  symbol_id: string;
  long_market_id: string;
  short_market_id: string;
  long_exchange_id: string;
  short_exchange_id: string;
  long_exchange_code: string;
  short_exchange_code: string;
  long_funding_8h: number;
  short_funding_8h: number;
  funding_spread_8h: number;
  long_price: number;
  short_price: number;
  price_spread_bps: number;
  long_fee_bps: number;
  short_fee_bps: number;
  total_fees_bps: number;
  slippage_bps: number;
  spread_cost_bps: number;
  total_cost_bps: number;
  gross_edge_8h_bps: number;
  net_edge_8h_bps: number;
  net_edge_annual_percent: number;
  profit_score: number;
  liquidity_score: number;
  stability_score: number;
  risk_penalty: number;
  opportunity_score: number;
  confidence_score: number;
  risk_tier: 'safe' | 'medium' | 'high';
  status: 'active' | 'stale' | 'expired';
  expires_at: string;
  reason: object;
  ts_bucket: string;
  next_funding_time: string | null;
}

interface EngineStats {
  markets_processed: number;
  metrics_computed: number;
  opportunities_found: number;
  signals_generated: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Normalize funding rate to 8-hour equivalent
 * Examples: 1h -> *8, 4h -> *2, 24h -> /3
 */
function normalizeFunding8h(fundingRate: number, intervalHours: number): number {
  if (intervalHours <= 0) return 0;
  return fundingRate * (8 / intervalHours);
}

/**
 * Annualize 8h rate: 3 periods/day * 365 days = 1095
 */
function annualize8hRate(rate8h: number): number {
  return rate8h * 1095;
}

/**
 * Calculate liquidity score from spread (inverse relationship)
 * 0 bps spread = 100 score, 100 bps spread = 0 score
 */
function calcLiquidityScore(spreadBps: number): number {
  return Math.max(0, Math.min(100, 100 - Math.min(spreadBps, 100)));
}

/**
 * Calculate profit score from net edge
 * Scale: 0-100 bps maps to 0-100 score
 */
function calcProfitScore(netEdgeBps: number): number {
  return Math.max(0, Math.min(100, Math.min(netEdgeBps, 100)));
}

/**
 * Determine risk tier based on score and edge
 */
function determineRiskTier(opportunityScore: number, netEdgeBps: number, fundingSpread: number): 'safe' | 'medium' | 'high' {
  if (Math.abs(fundingSpread) > 0.01 || opportunityScore < 40) return 'high';
  if (opportunityScore >= 75 && netEdgeBps >= 30 && Math.abs(fundingSpread) < 0.005) return 'safe';
  return 'medium';
}

/**
 * Get funding interval for exchange (default 8h)
 */
function getFundingInterval(exchangeCode: string, config: EngineConfig): number {
  const code = exchangeCode.toLowerCase();
  return config.funding_intervals[code] ?? 8;
}

/**
 * Calculate data freshness quality (0-1)
 */
function calcDataQuality(dataTs: string, maxAgeMinutes: number = 5): number {
  const age = Date.now() - new Date(dataTs).getTime();
  const ageMinutes = age / (1000 * 60);
  if (ageMinutes > maxAgeMinutes) return 0;
  return 1 - (ageMinutes / maxAgeMinutes);
}

/**
 * Create timestamp bucket for deduplication (truncate to minute)
 */
function createTsBucket(): string {
  const now = new Date();
  now.setSeconds(0, 0);
  return now.toISOString();
}

// ============================================
// ENGINE CORE
// ============================================

async function runMetricsEngine(supabase: SupabaseClient): Promise<{
  success: boolean;
  stats: EngineStats;
  error?: string;
}> {
  const startTime = Date.now();
  const tsBucket = createTsBucket();
  const stats: EngineStats = {
    markets_processed: 0,
    metrics_computed: 0,
    opportunities_found: 0,
    signals_generated: 0,
  };

  // Create engine run log
  const { data: runData, error: runError } = await supabase
    .from('engine_runs')
    .insert({ status: 'running' } as any)
    .select('id')
    .single();

  const runId = runData?.id;

  try {
    // ========================================
    // STEP 1: Load configuration
    // ========================================
    const { data: configRows } = await supabase
      .from('engine_config')
      .select('config_key, config_value');

    const config: EngineConfig = {
      scoring_weights: { profit: 0.5, liquidity: 0.25, stability: 0.25 },
      thresholds: { min_net_edge_bps: 20, min_opportunity_score: 60, signal_ttl_hours: 8 },
      costs: { default_slippage_bps: 2, extreme_funding_threshold: 0.01 },
      funding_intervals: { binance: 8, bybit: 8, okx: 8, deribit: 8, bitmex: 8, dydx: 1, hyperliquid: 1 },
      risk_penalties: { extreme_funding: 10, low_liquidity: 15, high_volatility: 10, stale_data: 20 },
    };

    for (const row of (configRows || []) as any[]) {
      const key = row.config_key as keyof EngineConfig;
      if (key in config) {
        (config as any)[key] = row.config_value;
      }
    }

    // ========================================
    // STEP 2: Fetch latest market data
    // ========================================
    const { data: fundingData, error: fundingError } = await supabase
      .from('funding_rates')
      .select(`
        id,
        market_id,
        funding_rate,
        next_funding_ts,
        ts,
        markets!inner (
          id,
          symbol_id,
          exchange_id,
          exchanges!inner (
            id,
            code,
            taker_fee
          ),
          symbols!inner (
            id,
            display_name
          )
        )
      `)
      .gte('ts', new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .order('ts', { ascending: false });

    if (fundingError) throw new Error(`Funding fetch error: ${fundingError.message}`);

    // Get latest prices
    const { data: priceData, error: priceError } = await supabase
      .from('prices')
      .select(`
        id,
        market_id,
        last_price,
        mark_price,
        bid_price,
        ask_price,
        volume_24h,
        open_interest,
        ts
      `)
      .gte('ts', new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .order('ts', { ascending: false });

    if (priceError) throw new Error(`Price fetch error: ${priceError.message}`);

    // Build price map (latest price per market)
    const priceMap = new Map<string, any>();
    for (const price of (priceData || []) as any[]) {
      if (!priceMap.has(price.market_id)) {
        priceMap.set(price.market_id, price);
      }
    }

    // Build market data map (deduplicate to latest per market)
    const marketDataMap = new Map<string, MarketData>();
    
    for (const fr of (fundingData || []) as any[]) {
      const market = fr.markets;
      const exchange = market.exchanges;
      const symbol = market.symbols;
      const price = priceMap.get(fr.market_id);

      if (!price) continue;

      const key = fr.market_id;
      if (!marketDataMap.has(key) || new Date(fr.ts) > new Date(marketDataMap.get(key)!.funding_ts)) {
        marketDataMap.set(key, {
          market_id: fr.market_id,
          symbol_id: market.symbol_id,
          exchange_id: market.exchange_id,
          exchange_code: exchange.code,
          symbol_name: symbol.display_name,
          funding_rate: Number(fr.funding_rate),
          next_funding_ts: fr.next_funding_ts,
          mark_price: Number(price.mark_price || price.last_price),
          volume_24h: price.volume_24h ? Number(price.volume_24h) : null,
          open_interest: price.open_interest ? Number(price.open_interest) : null,
          taker_fee: Number(exchange.taker_fee),
          funding_ts: fr.ts,
          price_ts: price.ts,
        });
      }
    }

    stats.markets_processed = marketDataMap.size;

    // ========================================
    // STEP 3: Compute per-market metrics
    // ========================================
    const computedMetrics: ComputedMetric[] = [];

    for (const [marketId, data] of marketDataMap) {
      const intervalHours = getFundingInterval(data.exchange_code, config);
      const funding8h = normalizeFunding8h(data.funding_rate, intervalHours);
      const fundingAnnual = annualize8hRate(funding8h);
      
      // Reduce spread estimate for liquid markets (was 5, now 2)
      const spreadBps = 2;
      
      const takerFeeBps = data.taker_fee * 10000;
      const slippageBps = config.costs.default_slippage_bps;
      const totalCostBps = takerFeeBps * 2 + slippageBps + spreadBps;
      
      const liquidityScore = calcLiquidityScore(spreadBps);
      const dataQuality = Math.min(
        calcDataQuality(data.funding_ts),
        calcDataQuality(data.price_ts)
      );

      computedMetrics.push({
        symbol_id: data.symbol_id,
        market_id: data.market_id,
        exchange_id: data.exchange_id,
        funding_rate_raw: data.funding_rate,
        funding_interval_hours: intervalHours,
        mark_price: data.mark_price,
        funding_rate_8h: funding8h,
        funding_rate_annual: fundingAnnual,
        spread_bps: spreadBps,
        volume_24h: data.volume_24h || 0,
        open_interest: data.open_interest || 0,
        taker_fee_bps: takerFeeBps,
        slippage_bps: slippageBps,
        total_cost_bps: totalCostBps,
        liquidity_score: liquidityScore,
        volatility_score: 50,
        data_quality: dataQuality,
        ts_bucket: tsBucket,
      });
    }

    // Upsert computed metrics
    if (computedMetrics.length > 0) {
      const { error: metricsError } = await supabase
        .from('computed_metrics_v2')
        .upsert(computedMetrics as any[], { 
          onConflict: 'market_id,ts_bucket',
          ignoreDuplicates: false 
        });

      if (metricsError) {
        console.error('Metrics upsert error:', metricsError);
      } else {
        stats.metrics_computed = computedMetrics.length;
      }
    }

    // ========================================
    // STEP 4: Find cross-exchange arbitrage opportunities
    // ========================================
    // Group metrics by symbol for cross-exchange comparison
    const symbolMetrics = new Map<string, ComputedMetric[]>();
    for (const metric of computedMetrics) {
      if (!symbolMetrics.has(metric.symbol_id)) {
        symbolMetrics.set(metric.symbol_id, []);
      }
      symbolMetrics.get(metric.symbol_id)!.push(metric);
    }

    console.log(`[Engine] Found ${symbolMetrics.size} symbols with metrics`);
    
    // Log symbols with multiple exchanges for debugging
    for (const [symbolId, metrics] of symbolMetrics) {
      if (metrics.length >= 2) {
        console.log(`[Engine] Symbol ${symbolId} has ${metrics.length} exchanges:`, 
          metrics.map(m => `${marketDataMap.get(m.market_id)?.exchange_code}:${m.funding_rate_8h.toFixed(6)}`).join(', '));
      }
    }

    const opportunities: ArbitrageOpportunity[] = [];
    const { weights, penalties } = { 
      weights: config.scoring_weights, 
      penalties: config.risk_penalties 
    };

    for (const [symbolId, metrics] of symbolMetrics) {
      if (metrics.length < 2) continue;

      console.log(`[Engine] Processing symbol ${symbolId} with ${metrics.length} metrics for arbitrage`);

      for (let i = 0; i < metrics.length; i++) {
        for (let j = i + 1; j < metrics.length; j++) {
          const a = metrics[i];
          const b = metrics[j];

          let long: ComputedMetric, short: ComputedMetric;
          let longData: MarketData | undefined, shortData: MarketData | undefined;

          if (a.funding_rate_8h > b.funding_rate_8h) {
            short = a;
            long = b;
            shortData = marketDataMap.get(a.market_id);
            longData = marketDataMap.get(b.market_id);
          } else {
            short = b;
            long = a;
            shortData = marketDataMap.get(b.market_id);
            longData = marketDataMap.get(a.market_id);
          }

          if (!longData || !shortData) {
            console.log(`[Engine] Missing market data for ${a.market_id} or ${b.market_id}`);
            continue;
          }

          const fundingSpread8h = short.funding_rate_8h - long.funding_rate_8h;
          
          if (fundingSpread8h <= 0) continue;

          const avgPrice = (long.mark_price + short.mark_price) / 2;
          const priceSpreadBps = Math.abs(long.mark_price - short.mark_price) / avgPrice * 10000;

          const totalFeesBps = long.taker_fee_bps + short.taker_fee_bps;
          const slippageBps = long.slippage_bps + short.slippage_bps;
          const spreadCostBps = (long.spread_bps + short.spread_bps) / 2;
          const totalCostBps = totalFeesBps + slippageBps + spreadCostBps;

          const grossEdge8hBps = fundingSpread8h * 10000;
          const netEdge8hBps = grossEdge8hBps - totalCostBps;
          const netEdgeAnnualPercent = annualize8hRate(netEdge8hBps / 10000) * 100;

          // Log calculations for debugging
          console.log(`[Engine] ${longData.symbol_name}: gross=${grossEdge8hBps.toFixed(2)}bps, costs=${totalCostBps.toFixed(2)}bps, net=${netEdge8hBps.toFixed(2)}bps`);

          if (netEdge8hBps <= 0) continue;

          // Scoring
          const profitScore = calcProfitScore(netEdge8hBps);
          const avgLiquidityScore = (long.liquidity_score + short.liquidity_score) / 2;
          const stabilityScore = 50;

          let riskPenalty = 0;
          
          if (Math.abs(short.funding_rate_8h) > config.costs.extreme_funding_threshold ||
              Math.abs(long.funding_rate_8h) > config.costs.extreme_funding_threshold) {
            riskPenalty += penalties.extreme_funding;
          }
          
          if (avgLiquidityScore < 30) {
            riskPenalty += penalties.low_liquidity;
          }
          
          if (long.data_quality < 0.5 || short.data_quality < 0.5) {
            riskPenalty += penalties.stale_data;
          }

          const rawScore = 
            weights.profit * profitScore +
            weights.liquidity * avgLiquidityScore +
            weights.stability * stabilityScore;
          
          const opportunityScore = Math.max(0, Math.min(100, rawScore - riskPenalty));
          const confidenceScore = Math.round((long.data_quality + short.data_quality) / 2 * 100);
          const riskTier = determineRiskTier(opportunityScore, netEdge8hBps, fundingSpread8h);

          const ttlMs = config.thresholds.signal_ttl_hours * 60 * 60 * 1000;
          const expiresAt = shortData.next_funding_ts || 
            new Date(Date.now() + ttlMs).toISOString();

          opportunities.push({
            symbol_id: symbolId,
            long_market_id: long.market_id,
            short_market_id: short.market_id,
            long_exchange_id: longData.exchange_id,
            short_exchange_id: shortData.exchange_id,
            long_exchange_code: longData.exchange_code,
            short_exchange_code: shortData.exchange_code,
            long_funding_8h: long.funding_rate_8h,
            short_funding_8h: short.funding_rate_8h,
            funding_spread_8h: fundingSpread8h,
            long_price: long.mark_price,
            short_price: short.mark_price,
            price_spread_bps: priceSpreadBps,
            long_fee_bps: long.taker_fee_bps,
            short_fee_bps: short.taker_fee_bps,
            total_fees_bps: totalFeesBps,
            slippage_bps: slippageBps,
            spread_cost_bps: spreadCostBps,
            total_cost_bps: totalCostBps,
            gross_edge_8h_bps: grossEdge8hBps,
            net_edge_8h_bps: netEdge8hBps,
            net_edge_annual_percent: netEdgeAnnualPercent,
            profit_score: profitScore,
            liquidity_score: avgLiquidityScore,
            stability_score: stabilityScore,
            risk_penalty: riskPenalty,
            opportunity_score: opportunityScore,
            confidence_score: confidenceScore,
            risk_tier: riskTier,
            status: 'active',
            expires_at: expiresAt,
            reason: {
              funding_spread: fundingSpread8h,
              costs: { fees: totalFeesBps, slippage: slippageBps, spread: spreadCostBps },
              scores: { profit: profitScore, liquidity: avgLiquidityScore, stability: stabilityScore },
              penalty: riskPenalty,
            },
            ts_bucket: tsBucket,
            next_funding_time: shortData.next_funding_ts,
          });
        }
      }
    }

    // Upsert opportunities
    if (opportunities.length > 0) {
      const oppsToInsert = opportunities.map(opp => ({
        symbol_id: opp.symbol_id,
        long_market_id: opp.long_market_id,
        short_market_id: opp.short_market_id,
        long_exchange_id: opp.long_exchange_id,
        short_exchange_id: opp.short_exchange_id,
        long_funding_8h: opp.long_funding_8h,
        short_funding_8h: opp.short_funding_8h,
        funding_spread_8h: opp.funding_spread_8h,
        long_price: opp.long_price,
        short_price: opp.short_price,
        price_spread_bps: opp.price_spread_bps,
        long_fee_bps: opp.long_fee_bps,
        short_fee_bps: opp.short_fee_bps,
        total_fees_bps: opp.total_fees_bps,
        slippage_bps: opp.slippage_bps,
        spread_cost_bps: opp.spread_cost_bps,
        total_cost_bps: opp.total_cost_bps,
        gross_edge_8h_bps: opp.gross_edge_8h_bps,
        net_edge_8h_bps: opp.net_edge_8h_bps,
        net_edge_annual_percent: opp.net_edge_annual_percent,
        profit_score: opp.profit_score,
        liquidity_score: opp.liquidity_score,
        stability_score: opp.stability_score,
        risk_penalty: opp.risk_penalty,
        opportunity_score: opp.opportunity_score,
        confidence_score: opp.confidence_score,
        risk_tier: opp.risk_tier,
        status: opp.status,
        expires_at: opp.expires_at,
        reason: opp.reason,
        ts_bucket: opp.ts_bucket,
      }));

      const { data: insertedOpps, error: oppsError } = await supabase
        .from('arbitrage_opportunities')
        .upsert(oppsToInsert as any[], { 
          onConflict: 'symbol_id,long_exchange_id,short_exchange_id,ts_bucket',
          ignoreDuplicates: false 
        })
        .select('id, symbol_id, long_exchange_id, short_exchange_id');

      if (oppsError) {
        console.error('Opportunities upsert error:', oppsError);
      } else {
        stats.opportunities_found = insertedOpps?.length || 0;
        
        const oppIdMap = new Map<string, string>();
        for (const opp of (insertedOpps || []) as any[]) {
          const key = `${opp.symbol_id}-${opp.long_exchange_id}-${opp.short_exchange_id}`;
          oppIdMap.set(key, opp.id);
        }

        // ========================================
        // STEP 5: Generate trading signals
        // ========================================
        const signals: any[] = [];
        
        for (const opp of opportunities) {
          if (opp.net_edge_8h_bps < config.thresholds.min_net_edge_bps) continue;
          if (opp.opportunity_score < config.thresholds.min_opportunity_score) continue;

          const oppKey = `${opp.symbol_id}-${opp.long_exchange_id}-${opp.short_exchange_id}`;
          const opportunityId = oppIdMap.get(oppKey);
          
          if (!opportunityId) continue;

          const ttlSeconds = config.thresholds.signal_ttl_hours * 60 * 60;

          signals.push({
            opportunity_id: opportunityId,
            symbol_id: opp.symbol_id,
            signal_type: 'funding_arbitrage',
            direction: 'long_short',
            long_exchange: opp.long_exchange_code,
            short_exchange: opp.short_exchange_code,
            net_profit_estimate_bps: opp.net_edge_8h_bps,
            net_profit_estimate_percent: opp.net_edge_8h_bps / 100,
            score: Math.round(opp.opportunity_score),
            confidence: Math.round(opp.confidence_score),
            ttl_seconds: ttlSeconds,
            expires_at: opp.expires_at,
            next_funding_time: opp.next_funding_time,
            status: 'open',
            reason: opp.reason,
            is_speculative: opp.opportunity_score < 70,
          });
        }

        if (signals.length > 0) {
          const oppIds = signals.map(s => s.opportunity_id);
          await supabase
            .from('trading_signals')
            .update({ 
              status: 'closed', 
              closed_at: new Date().toISOString(),
              closed_reason: 'superseded'
            } as any)
            .in('opportunity_id', oppIds)
            .eq('status', 'open');

          const { error: signalsError } = await supabase
            .from('trading_signals')
            .insert(signals);

          if (signalsError) {
            console.error('Signals insert error:', signalsError);
          } else {
            stats.signals_generated = signals.length;
          }
        }
      }
    }

    // ========================================
    // STEP 6: Expire old signals
    // ========================================
    await supabase
      .from('trading_signals')
      .update({ 
        status: 'expired', 
        updated_at: new Date().toISOString() 
      } as any)
      .eq('status', 'open')
      .lt('expires_at', new Date().toISOString());

    // ========================================
    // STEP 7: Update engine run log
    // ========================================
    const duration = Date.now() - startTime;
    
    if (runId) {
      await supabase
        .from('engine_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          markets_processed: stats.markets_processed,
          metrics_computed: stats.metrics_computed,
          opportunities_found: stats.opportunities_found,
          signals_generated: stats.signals_generated,
          config_snapshot: config,
        } as any)
        .eq('id', runId);
    }

    return { success: true, stats };

  } catch (error: any) {
    console.error('Engine error:', error);
    
    if (runId) {
      await supabase
        .from('engine_runs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
          error_message: error.message,
          error_stack: error.stack,
        } as any)
        .eq('id', runId);
    }

    return { success: false, stats, error: error.message };
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

    const result = await runMetricsEngine(supabase);

    return new Response(
      JSON.stringify({
        success: result.success,
        stats: result.stats,
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
