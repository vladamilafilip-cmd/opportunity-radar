// worker/src/engine/opportunityEngine.ts
// Scans market data and ranks opportunities for LIVE delta-neutral hedging

import type { SupabaseClient } from '@supabase/supabase-js';
import { 
  calculateOpportunity, 
  determineRiskTier, 
  type OpportunityCalc, 
  type RiskTier,
  type CostConfig,
  type ThresholdConfig
} from './formulas.js';
import { isValidHedgePair, getEffectiveFeeBps } from '../config/exchangeBalances.js';

// Symbol whitelist
const TIER1_SYMBOLS = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'BNB', 'LINK', 'LTC'];
const TIER2_SYMBOLS = ['ADA', 'AVAX', 'MATIC', 'DOT', 'ATOM', 'UNI', 'AAVE', 'ARB', 'OP', 'SUI'];

interface MetricRow {
  id: string;
  symbol_id: string;
  market_id: string;
  exchange_id: string;
  funding_rate_8h: number;
  funding_interval_hours: number;
  mark_price: number;
  spread_bps: number;
  liquidity_score: number;
  ts: string;
  symbol: {
    id: string;
    display_name: string;
    is_meme: boolean;
    volatility_multiplier: number;
  };
  exchange: {
    id: string;
    code: string;
  };
  market: {
    id: string;
    exchange_symbol: string;
  };
}

interface EngineConfig {
  costs: CostConfig;
  thresholds: Record<RiskTier, ThresholdConfig>;
  hedgeSizeEur: number;
  allowedExchanges: string[];
  fundingIntervals: Record<string, number>;
}

export class OpportunityEngine {
  private supabase: SupabaseClient;
  private config: EngineConfig;
  private lastDataTs: string | null = null;

  constructor(supabase: SupabaseClient, config: EngineConfig) {
    this.supabase = supabase;
    this.config = config;
  }

  /**
   * Get timestamp of last data (for stale check)
   */
  getLastDataTimestamp(): string | null {
    return this.lastDataTs;
  }

  /**
   * Check if symbol is whitelisted
   */
  private isSymbolWhitelisted(displayName: string): boolean {
    const base = displayName.toUpperCase().replace(/USDT?$/, '').replace(/PERP$/, '');
    return TIER1_SYMBOLS.includes(base) || TIER2_SYMBOLS.includes(base);
  }

  /**
   * Fetch latest metrics from computed_metrics_v2
   */
  private async fetchLatestMetrics(): Promise<MetricRow[]> {
    const { data, error } = await this.supabase
      .from('computed_metrics_v2')
      .select(`
        id,
        symbol_id,
        market_id,
        exchange_id,
        funding_rate_8h,
        funding_interval_hours,
        mark_price,
        spread_bps,
        liquidity_score,
        ts,
        symbol:symbols(id, display_name, is_meme, volatility_multiplier),
        exchange:exchanges(id, code),
        market:markets(id, exchange_symbol)
      `)
      .order('ts', { ascending: false })
      .limit(500);

    if (error) {
      console.error('[OpportunityEngine] Failed to fetch metrics:', error);
      return [];
    }

    // Track latest timestamp
    if (data && data.length > 0) {
      this.lastDataTs = data[0].ts;
    }

    return (data || []) as unknown as MetricRow[];
  }

  /**
   * Group metrics by symbol
   */
  private groupBySymbol(metrics: MetricRow[]): Map<string, MetricRow[]> {
    const grouped = new Map<string, MetricRow[]>();
    
    for (const metric of metrics) {
      const symbolId = metric.symbol_id;
      if (!grouped.has(symbolId)) {
        grouped.set(symbolId, []);
      }
      grouped.get(symbolId)!.push(metric);
    }
    
    return grouped;
  }

  /**
   * Scan and rank opportunities with STRICT LIVE filters
   */
  async scanAndRank(): Promise<OpportunityCalc[]> {
    console.log('[OpportunityEngine] Starting LIVE scan...');
    
    const metrics = await this.fetchLatestMetrics();
    if (metrics.length === 0) {
      console.log('[OpportunityEngine] No metrics available');
      return [];
    }

    console.log(`[OpportunityEngine] Fetched ${metrics.length} metrics`);

    const bySymbol = this.groupBySymbol(metrics);
    const opportunities: OpportunityCalc[] = [];

    for (const [symbolId, symbolMetrics] of bySymbol) {
      if (symbolMetrics.length < 2) continue;

      const symbol = symbolMetrics[0].symbol;
      if (!symbol) continue;

      // STRICT: Skip meme coins
      if (symbol.is_meme) {
        continue;
      }

      // STRICT: Only whitelisted symbols
      if (!this.isSymbolWhitelisted(symbol.display_name)) {
        continue;
      }

      // Filter by allowed exchanges
      const allowedMetrics = symbolMetrics.filter(m => 
        m.exchange && this.config.allowedExchanges.includes(m.exchange.code.toLowerCase())
      );

      if (allowedMetrics.length < 2) continue;

      const riskTier = determineRiskTier(
        symbol.is_meme || false,
        symbol.volatility_multiplier || 1,
        Math.max(...allowedMetrics.map(m => m.liquidity_score || 0))
      );

      // Find all valid hedge pairs
      for (let i = 0; i < allowedMetrics.length; i++) {
        for (let j = 0; j < allowedMetrics.length; j++) {
          if (i === j) continue;

          const longMetric = allowedMetrics[i];
          const shortMetric = allowedMetrics[j];

          if (longMetric.exchange_id === shortMetric.exchange_id) continue;

          const longExchange = longMetric.exchange?.code || 'unknown';
          const shortExchange = shortMetric.exchange?.code || 'unknown';

          // STRICT: Validate hedge pair
          if (!isValidHedgePair(longExchange, shortExchange)) continue;

          // Use exchange-specific fees
          const effectiveFeeBps = getEffectiveFeeBps(longExchange, shortExchange);
          const costs = {
            ...this.config.costs,
            takerFeeBps: effectiveFeeBps / 2, // Split between legs
          };

          const opp = calculateOpportunity(
            symbol.display_name,
            symbolId,
            longExchange,
            shortExchange,
            longMetric.market_id,
            shortMetric.market_id,
            longMetric.funding_rate_8h / 100,
            shortMetric.funding_rate_8h / 100,
            longMetric.funding_interval_hours || 8,
            shortMetric.funding_interval_hours || 8,
            longMetric.mark_price,
            shortMetric.mark_price,
            (longMetric.spread_bps + shortMetric.spread_bps) / 2,
            (longMetric.liquidity_score + shortMetric.liquidity_score) / 2,
            riskTier,
            costs,
            this.config.thresholds,
            this.config.hedgeSizeEur
          );

          if (opp && opp.isValid) {
            opportunities.push(opp);
          }
        }
      }
    }

    // Sort by score (descending)
    opportunities.sort((a, b) => b.score - a.score);

    // Log results
    const validCount = opportunities.filter(o => o.isValid).length;
    console.log(`[OpportunityEngine] Found ${validCount} valid opportunities`);
    
    opportunities.slice(0, 5).forEach((opp, i) => {
      console.log(`  ${i + 1}. ${opp.symbol} (${opp.longExchange}/${opp.shortExchange}): Score ${opp.score}, Net ${opp.netProfitBps.toFixed(1)}bps, APR ${opp.apr.toFixed(0)}%`);
    });

    return opportunities;
  }
}
