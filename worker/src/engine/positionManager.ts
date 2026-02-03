// worker/src/engine/positionManager.ts
// Manages autopilot hedge positions for LIVE delta-neutral trading

import type { SupabaseClient } from '@supabase/supabase-js';
import type { OpportunityCalc, RiskTier } from './formulas.js';
import { calculateUnrealizedPnL, checkExitConditions } from './formulas.js';
import { AuditLog } from '../utils/auditLog.js';
import { RiskManager } from './riskManager.js';
import type { HedgeExecutor, HedgeExecutionResult } from '../adapters/hedgeExecutor.js';

interface ExitConfig {
  holdingPeriodIntervals: number;
  maxHoldingHours: number;
  profitExitThresholdBps: number;
  pnlDriftLimitPercent: number;
  spreadCollapseThresholdBps: number;
  spreadSpikeThresholdBps: number;
  dataStaleTimeoutSeconds: number;
  profitTargetPercent: number;
}

interface PositionRow {
  id: string;
  hedge_id: string | null;
  symbol: string;
  symbol_id: string | null;
  long_exchange: string;
  short_exchange: string;
  long_market_id: string | null;
  short_market_id: string | null;
  size_eur: number;
  leverage: number;
  risk_tier: RiskTier;
  entry_ts: string;
  entry_long_price: number;
  entry_short_price: number;
  entry_funding_spread_8h: number;
  entry_score: number;
  current_long_price: number | null;
  current_short_price: number | null;
  funding_collected_eur: number;
  intervals_collected: number;
  unrealized_pnl_eur: number;
  unrealized_pnl_percent: number;
  pnl_drift: number;
  status: string;
  risk_snapshot: Record<string, unknown>;
}

interface PriceData {
  market_id: string;
  mark_price: number;
  spread_bps: number;
  funding_rate_8h: number;
}

export class PositionManager {
  private supabase: SupabaseClient;
  private config: {
    exit: ExitConfig;
    capital: { hedgeSizeEur: number; legSizeEur: number };
  };
  private audit: AuditLog;
  private riskManager: RiskManager;
  private hedgeExecutor: HedgeExecutor;

  constructor(
    supabase: SupabaseClient,
    config: {
      exit: ExitConfig;
      capital: { hedgeSizeEur: number; legSizeEur: number };
    },
    audit: AuditLog,
    riskManager: RiskManager,
    hedgeExecutor: HedgeExecutor
  ) {
    this.supabase = supabase;
    this.config = config;
    this.audit = audit;
    this.riskManager = riskManager;
    this.hedgeExecutor = hedgeExecutor;
  }

  /**
   * Get all open positions
   */
  async getOpenPositions(): Promise<PositionRow[]> {
    const { data, error } = await this.supabase
      .from('autopilot_positions')
      .select('*')
      .eq('status', 'open');

    if (error) {
      console.error('[PositionManager] Failed to get positions:', error);
      return [];
    }

    return (data || []) as unknown as PositionRow[];
  }

  /**
   * Get latest price data for markets
   */
  private async getLatestPrices(marketIds: string[]): Promise<Map<string, PriceData>> {
    const priceMap = new Map<string, PriceData>();
    
    if (marketIds.length === 0) return priceMap;

    const { data, error } = await this.supabase
      .from('computed_metrics_v2')
      .select('market_id, mark_price, spread_bps, funding_rate_8h')
      .in('market_id', marketIds)
      .order('ts', { ascending: false })
      .limit(marketIds.length * 2);

    if (error) {
      console.error('[PositionManager] Failed to get prices:', error);
      return priceMap;
    }

    for (const row of data || []) {
      if (!priceMap.has(row.market_id)) {
        priceMap.set(row.market_id, row as PriceData);
      }
    }

    return priceMap;
  }

  /**
   * Open a new hedge position after successful execution
   */
  async openHedgePosition(opportunity: OpportunityCalc, execResult: HedgeExecutionResult): Promise<string | null> {
    if (!execResult.success || !execResult.hedgeId) {
      return null;
    }

    const now = new Date().toISOString();
    
    const position = {
      mode: 'live',
      hedge_id: execResult.hedgeId,
      symbol: opportunity.symbol,
      symbol_id: opportunity.symbolId,
      long_exchange: opportunity.longExchange,
      short_exchange: opportunity.shortExchange,
      long_market_id: opportunity.longMarketId,
      short_market_id: opportunity.shortMarketId,
      size_eur: this.config.capital.hedgeSizeEur,
      leverage: 1,
      risk_tier: opportunity.riskTier,
      entry_ts: now,
      entry_long_price: execResult.longOrder?.fillPrice ?? opportunity.longPrice,
      entry_short_price: execResult.shortOrder?.fillPrice ?? opportunity.shortPrice,
      entry_funding_spread_8h: opportunity.fundingSpread8h,
      entry_score: opportunity.score,
      current_long_price: execResult.longOrder?.fillPrice ?? opportunity.longPrice,
      current_short_price: execResult.shortOrder?.fillPrice ?? opportunity.shortPrice,
      pnl_drift: 0,
      risk_snapshot: {
        netProfitBps: opportunity.netProfitBps,
        apr: opportunity.apr,
        reasons: opportunity.reasons,
        hedgeId: execResult.hedgeId,
        longOrderId: execResult.longOrder?.orderId,
        shortOrderId: execResult.shortOrder?.orderId,
      },
    };

    const { data, error } = await this.supabase
      .from('autopilot_positions')
      .insert(position)
      .select('id')
      .single();

    if (error) {
      console.error('[PositionManager] Failed to record position:', error);
      await this.audit.log('error', 'POSITION_RECORD_FAILED', 'position', null, {
        symbol: opportunity.symbol,
        hedgeId: execResult.hedgeId,
        error: error.message,
      });
      return null;
    }

    await this.audit.log('action', 'HEDGE_POSITION_OPENED', 'position', data.id, {
      symbol: opportunity.symbol,
      hedgeId: execResult.hedgeId,
      longExchange: opportunity.longExchange,
      shortExchange: opportunity.shortExchange,
      sizeEur: this.config.capital.hedgeSizeEur,
      riskTier: opportunity.riskTier,
      score: opportunity.score,
      netProfitBps: opportunity.netProfitBps,
      apr: opportunity.apr,
    });

    // Update state with last trade timestamp
    await this.supabase
      .from('autopilot_state')
      .update({ last_trade_ts: now, updated_at: now })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    return data.id;
  }

  /**
   * Update all open positions with latest prices and PnL
   */
  async updateAllPositions(): Promise<void> {
    const positions = await this.getOpenPositions();
    if (positions.length === 0) return;

    const marketIds: string[] = [];
    for (const pos of positions) {
      if (pos.long_market_id) marketIds.push(pos.long_market_id);
      if (pos.short_market_id) marketIds.push(pos.short_market_id);
    }

    const prices = await this.getLatestPrices(marketIds);

    for (const position of positions) {
      const longPrice = position.long_market_id ? prices.get(position.long_market_id) : null;
      const shortPrice = position.short_market_id ? prices.get(position.short_market_id) : null;

      const currentLongPrice = longPrice?.mark_price ?? position.current_long_price ?? position.entry_long_price;
      const currentShortPrice = shortPrice?.mark_price ?? position.current_short_price ?? position.entry_short_price;

      // Calculate PnL and drift
      const pnl = calculateUnrealizedPnL(
        position.entry_long_price,
        position.entry_short_price,
        currentLongPrice,
        currentShortPrice,
        position.size_eur
      );

      // Update position
      await this.supabase
        .from('autopilot_positions')
        .update({
          current_long_price: currentLongPrice,
          current_short_price: currentShortPrice,
          unrealized_pnl_eur: position.funding_collected_eur + pnl.pnlEur,
          unrealized_pnl_percent: pnl.pnlPercent,
          pnl_drift: pnl.drift,
          updated_at: new Date().toISOString(),
        })
        .eq('id', position.id);
    }
  }

  /**
   * Simulate funding collection (for positions without real funding events)
   */
  async simulateFundingCollection(): Promise<void> {
    const positions = await this.getOpenPositions();
    const now = new Date();

    for (const position of positions) {
      const entryTime = new Date(position.entry_ts);
      const hoursElapsed = (now.getTime() - entryTime.getTime()) / (1000 * 60 * 60);
      
      // Assuming 8h intervals
      const expectedIntervals = Math.floor(hoursElapsed / 8);
      
      if (expectedIntervals > position.intervals_collected) {
        const intervalsToAdd = expectedIntervals - position.intervals_collected;
        const fundingPerInterval = position.size_eur * position.entry_funding_spread_8h;
        const fundingToAdd = fundingPerInterval * intervalsToAdd;

        await this.supabase
          .from('autopilot_positions')
          .update({
            funding_collected_eur: position.funding_collected_eur + fundingToAdd,
            intervals_collected: expectedIntervals,
            updated_at: new Date().toISOString(),
          })
          .eq('id', position.id);

        await this.audit.log('action', 'FUNDING_COLLECTED', 'position', position.id, {
          symbol: position.symbol,
          intervalsAdded: intervalsToAdd,
          fundingAdded: fundingToAdd,
          totalFunding: position.funding_collected_eur + fundingToAdd,
        });
      }
    }
  }

  /**
   * Check exit conditions for all positions (STRICT for LIVE)
   */
  async checkExitConditions(): Promise<void> {
    const positions = await this.getOpenPositions();
    const now = new Date();

    for (const position of positions) {
      const entryTime = new Date(position.entry_ts);
      const hoursHeld = (now.getTime() - entryTime.getTime()) / (1000 * 60 * 60);
      
      // Get current spread
      const currentSpreadBps = 10; // Would fetch from metrics in production
      const entrySpreadBps = 10;
      
      // Expected profit based on entry
      const expectedProfitPercent = position.entry_funding_spread_8h * 100 * position.intervals_collected;
      const totalPnlPercent = (position.unrealized_pnl_eur / position.size_eur) * 100;

      const exitReason = checkExitConditions(
        hoursHeld,
        position.intervals_collected,
        position.pnl_drift,
        currentSpreadBps,
        entrySpreadBps,
        totalPnlPercent,
        expectedProfitPercent,
        this.config.exit
      );

      if (exitReason) {
        await this.closePosition(position.id, exitReason);
      }
    }
  }

  /**
   * Close a position
   */
  async closePosition(positionId: string, reason: string): Promise<void> {
    const { data: position, error: fetchError } = await this.supabase
      .from('autopilot_positions')
      .select('*')
      .eq('id', positionId)
      .single();

    if (fetchError || !position) {
      console.error('[PositionManager] Position not found:', positionId);
      return;
    }

    const pos = position as unknown as PositionRow;
    const now = new Date().toISOString();

    // Close hedge via executor if we have hedge_id
    if (pos.hedge_id) {
      await this.hedgeExecutor.closeHedge(
        pos.hedge_id,
        pos.long_exchange,
        pos.short_exchange,
        pos.size_eur / 2,
        pos.size_eur / 2,
        reason
      );
    }

    // Final PnL = funding collected + price PnL
    const realizedPnl = pos.unrealized_pnl_eur;
    const realizedPnlPercent = (realizedPnl / pos.size_eur) * 100;

    const { error } = await this.supabase
      .from('autopilot_positions')
      .update({
        status: 'closed',
        exit_ts: now,
        exit_long_price: pos.current_long_price,
        exit_short_price: pos.current_short_price,
        realized_pnl_eur: realizedPnl,
        realized_pnl_percent: realizedPnlPercent,
        exit_reason: reason,
        updated_at: now,
      })
      .eq('id', positionId);

    if (error) {
      console.error('[PositionManager] Failed to close position:', error);
      return;
    }

    // Update totals in state
    await this.supabase
      .from('autopilot_state')
      .update({
        total_realized_pnl_eur: realizedPnl,
        total_funding_collected_eur: pos.funding_collected_eur,
        updated_at: now,
      })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    await this.audit.log('action', 'HEDGE_POSITION_CLOSED', 'position', positionId, {
      symbol: pos.symbol,
      hedgeId: pos.hedge_id,
      reason,
      realizedPnl,
      realizedPnlPercent,
      fundingCollected: pos.funding_collected_eur,
      intervalsHeld: pos.intervals_collected,
      pnlDrift: pos.pnl_drift,
    });
  }
}
