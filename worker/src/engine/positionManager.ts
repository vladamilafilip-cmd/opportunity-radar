// worker/src/engine/positionManager.ts
// Manages autopilot positions (open, update, close)

import type { SupabaseClient } from '@supabase/supabase-js';
import type { OpportunityCalc, RiskTier } from './formulas.js';
import { calculateUnrealizedPnL, calculateFundingPayment } from './formulas.js';
import { AuditLog } from '../utils/auditLog.js';
import { RiskManager } from './riskManager.js';

interface ExitConfig {
  holdingPeriodIntervals: number;
  maxHoldingHours: number;
  profitExitThresholdBps: number;
  pnlDriftLimitPercent: number;
  spreadSpikeMultiplier: number;
}

interface PositionRow {
  id: string;
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
    capital: { positionSizeEur: number };
  };
  private audit: AuditLog;
  private riskManager: RiskManager;

  constructor(
    supabase: SupabaseClient,
    config: {
      exit: ExitConfig;
      capital: { positionSizeEur: number };
    },
    audit: AuditLog,
    riskManager: RiskManager
  ) {
    this.supabase = supabase;
    this.config = config;
    this.audit = audit;
    this.riskManager = riskManager;
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

    // Get latest price for each market
    for (const row of data || []) {
      if (!priceMap.has(row.market_id)) {
        priceMap.set(row.market_id, row as PriceData);
      }
    }

    return priceMap;
  }

  /**
   * Open a new position
   */
  async openPosition(opportunity: OpportunityCalc): Promise<string | null> {
    const now = new Date().toISOString();
    
    const position = {
      mode: 'paper',
      symbol: opportunity.symbol,
      symbol_id: opportunity.symbolId,
      long_exchange: opportunity.longExchange,
      short_exchange: opportunity.shortExchange,
      long_market_id: opportunity.longMarketId,
      short_market_id: opportunity.shortMarketId,
      size_eur: this.config.capital.positionSizeEur,
      leverage: 1,
      risk_tier: opportunity.riskTier,
      entry_ts: now,
      entry_long_price: opportunity.longPrice,
      entry_short_price: opportunity.shortPrice,
      entry_funding_spread_8h: opportunity.fundingSpread8h,
      entry_score: opportunity.score,
      current_long_price: opportunity.longPrice,
      current_short_price: opportunity.shortPrice,
      risk_snapshot: {
        netProfitBps: opportunity.netProfitBps,
        apr: opportunity.apr,
        reasons: opportunity.reasons,
      },
    };

    const { data, error } = await this.supabase
      .from('autopilot_positions')
      .insert(position)
      .select('id')
      .single();

    if (error) {
      console.error('[PositionManager] Failed to open position:', error);
      await this.audit.log('error', 'POSITION_OPEN_FAILED', 'position', null, {
        symbol: opportunity.symbol,
        error: error.message,
      });
      return null;
    }

    await this.audit.log('action', 'POSITION_OPENED', 'position', data.id, {
      symbol: opportunity.symbol,
      longExchange: opportunity.longExchange,
      shortExchange: opportunity.shortExchange,
      sizeEur: this.config.capital.positionSizeEur,
      riskTier: opportunity.riskTier,
      score: opportunity.score,
      netProfitBps: opportunity.netProfitBps,
      apr: opportunity.apr,
    });

    // Update state with last trade timestamp
    await this.supabase
      .from('autopilot_state')
      .update({ last_trade_ts: now, updated_at: now })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update any row

    return data.id;
  }

  /**
   * Update all open positions with latest prices and PnL
   */
  async updateAllPositions(): Promise<void> {
    const positions = await this.getOpenPositions();
    if (positions.length === 0) return;

    // Collect all market IDs
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

      // Calculate PnL
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
          updated_at: new Date().toISOString(),
        })
        .eq('id', position.id);
    }
  }

  /**
   * Simulate funding collection
   * In paper mode, we simulate receiving funding based on time elapsed
   */
  async simulateFundingCollection(): Promise<void> {
    const positions = await this.getOpenPositions();
    const now = new Date();

    for (const position of positions) {
      const entryTime = new Date(position.entry_ts);
      const hoursElapsed = (now.getTime() - entryTime.getTime()) / (1000 * 60 * 60);
      
      // Assuming 8h intervals, calculate expected number of payments
      const expectedIntervals = Math.floor(hoursElapsed / 8);
      
      if (expectedIntervals > position.intervals_collected) {
        // Calculate funding to add
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
   * Check exit conditions for all positions
   */
  async checkExitConditions(): Promise<void> {
    const positions = await this.getOpenPositions();
    const now = new Date();

    for (const position of positions) {
      const entryTime = new Date(position.entry_ts);
      const hoursHeld = (now.getTime() - entryTime.getTime()) / (1000 * 60 * 60);

      let shouldClose = false;
      let exitReason = '';

      // Check max holding time
      if (hoursHeld >= this.config.exit.maxHoldingHours) {
        shouldClose = true;
        exitReason = `Max holding time (${this.config.exit.maxHoldingHours}h) exceeded`;
      }

      // Check minimum holding period before other checks
      const intervalsHeld = Math.floor(hoursHeld / 8);
      if (intervalsHeld >= this.config.exit.holdingPeriodIntervals && !shouldClose) {
        // Check PnL drift (delta-neutral breakdown)
        if (position.current_long_price && position.current_short_price) {
          const pnl = calculateUnrealizedPnL(
            position.entry_long_price,
            position.entry_short_price,
            position.current_long_price,
            position.current_short_price,
            position.size_eur
          );

          if (pnl.drift > this.config.exit.pnlDriftLimitPercent) {
            shouldClose = true;
            exitReason = `PnL drift ${pnl.drift.toFixed(2)}% exceeds limit ${this.config.exit.pnlDriftLimitPercent}%`;
          }
        }

        // Check if profit has fallen too low
        // (This is simplified - in production you'd recalculate current opportunity score)
        const totalPnlPercent = (position.unrealized_pnl_eur / position.size_eur) * 100;
        if (totalPnlPercent < -(this.config.exit.profitExitThresholdBps / 100)) {
          shouldClose = true;
          exitReason = `PnL ${totalPnlPercent.toFixed(2)}% below threshold`;
        }
      }

      if (shouldClose) {
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

    // Update total realized PnL in state
    await this.supabase.rpc('increment_realized_pnl', { pnl: realizedPnl }).catch(() => {
      // If RPC doesn't exist, update directly
      this.supabase
        .from('autopilot_state')
        .update({
          total_realized_pnl_eur: realizedPnl, // This should be incremented, simplified here
          total_funding_collected_eur: pos.funding_collected_eur,
          updated_at: now,
        })
        .neq('id', '00000000-0000-0000-0000-000000000000');
    });

    await this.audit.log('action', 'POSITION_CLOSED', 'position', positionId, {
      symbol: pos.symbol,
      reason,
      realizedPnl,
      realizedPnlPercent,
      fundingCollected: pos.funding_collected_eur,
      intervalsHeld: pos.intervals_collected,
    });
  }
}
