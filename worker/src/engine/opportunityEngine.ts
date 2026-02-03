// worker/src/engine/opportunityEngine.ts
// Scans market data and ranks opportunities

import type { SupabaseClient } from '@supabase/supabase-js';
import { 
  calculateOpportunity, 
  determineRiskTier, 
  type OpportunityCalc, 
  type RiskTier,
  type CostConfig,
  type ThresholdConfig
} from './formulas.js';

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
  positionSizeEur: number;
  allowedExchanges: string[];
  fundingIntervals: Record<string, number>;
}

export class OpportunityEngine {
  private supabase: SupabaseClient;
  private config: EngineConfig;

  constructor(supabase: SupabaseClient, config: EngineConfig) {
    this.supabase = supabase;
    this.config = config;
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
   * Scan and rank opportunities
   */
  async scanAndRank(): Promise<OpportunityCalc[]> {
    console.log('[OpportunityEngine] Starting scan...');
    
    const metrics = await this.fetchLatestMetrics();
    if (metrics.length === 0) {
      console.log('[OpportunityEngine] No metrics available');
      return [];
    }

    console.log(`[OpportunityEngine] Fetched ${metrics.length} metrics`);

    // Group by symbol
    const bySymbol = this.groupBySymbol(metrics);
    const opportunities: OpportunityCalc[] = [];

    // For each symbol, find best long/short pair
    for (const [symbolId, symbolMetrics] of bySymbol) {
      if (symbolMetrics.length < 2) continue; // Need at least 2 exchanges

      const symbol = symbolMetrics[0].symbol;
      if (!symbol) continue;

      // Filter by allowed exchanges
      const allowedMetrics = symbolMetrics.filter(m => 
        m.exchange && this.config.allowedExchanges.includes(m.exchange.code.toLowerCase())
      );

      if (allowedMetrics.length < 2) continue;

      // Determine risk tier for this symbol
      const riskTier = determineRiskTier(
        symbol.is_meme || false,
        symbol.volatility_multiplier || 1,
        Math.max(...allowedMetrics.map(m => m.liquidity_score || 0))
      );

      // Find all valid pairs
      for (let i = 0; i < allowedMetrics.length; i++) {
        for (let j = 0; j < allowedMetrics.length; j++) {
          if (i === j) continue;

          const longMetric = allowedMetrics[i];
          const shortMetric = allowedMetrics[j];

          // Skip if same exchange
          if (longMetric.exchange_id === shortMetric.exchange_id) continue;

          // Calculate opportunity
          const opp = calculateOpportunity(
            symbol.display_name,
            symbolId,
            longMetric.exchange?.code || 'unknown',
            shortMetric.exchange?.code || 'unknown',
            longMetric.market_id,
            shortMetric.market_id,
            longMetric.funding_rate_8h / 100, // Convert from percent to decimal
            shortMetric.funding_rate_8h / 100,
            longMetric.funding_interval_hours || 8,
            shortMetric.funding_interval_hours || 8,
            longMetric.mark_price,
            shortMetric.mark_price,
            (longMetric.spread_bps + shortMetric.spread_bps) / 2,
            (longMetric.liquidity_score + shortMetric.liquidity_score) / 2,
            riskTier,
            this.config.costs,
            this.config.thresholds,
            this.config.positionSizeEur
          );

          if (opp) {
            opportunities.push(opp);
          }
        }
      }
    }

    // Sort by score (descending)
    opportunities.sort((a, b) => b.score - a.score);

    console.log(`[OpportunityEngine] Found ${opportunities.length} opportunities`);
    
    // Log top 5
    opportunities.slice(0, 5).forEach((opp, i) => {
      console.log(`  ${i + 1}. ${opp.symbol} (${opp.longExchange}/${opp.shortExchange}): Score ${opp.score}, Net ${opp.netProfitBps.toFixed(1)}bps, APR ${opp.apr.toFixed(0)}%`);
    });

    return opportunities;
  }
}
