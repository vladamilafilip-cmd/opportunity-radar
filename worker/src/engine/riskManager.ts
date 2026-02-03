// worker/src/engine/riskManager.ts
// Risk management and kill switch logic for LIVE delta-neutral hedging

import type { SupabaseClient } from '@supabase/supabase-js';
import type { OpportunityCalc, RiskTier } from './formulas.js';
import { AuditLog } from '../utils/auditLog.js';

type RiskLevel = 'normal' | 'cautious' | 'stopped';

interface RiskConfig {
  maxDailyDrawdownEur: number;
  cautionDrawdownEur: number;
  maxConcurrentHedges: number;
  stressTestMultiplier: number;
  killSwitchCooldownHours: number;
  notionalMatchTolerancePercent: number;
  maxLeverage: number;
  defaultLeverage: number;
}

interface BucketConfig {
  percent: number;
  maxPositions: number;
}

interface CapitalConfig {
  totalEur: number;
  maxRiskPercent: number;
  hedgeSizeEur: number;
  legSizeEur: number;
  bufferEur: number;
  maxDeployedEur: number;
}

interface Position {
  id: string;
  symbol: string;
  risk_tier: RiskTier;
  size_eur: number;
  unrealized_pnl_eur: number;
  pnl_drift: number;
  status: string;
}

interface AutopilotState {
  id: string;
  mode: string;
  is_running: boolean;
  dry_run_enabled: boolean;
  kill_switch_active: boolean;
  kill_switch_reason: string | null;
  daily_drawdown_eur: number;
  total_realized_pnl_eur: number;
}

export class RiskManager {
  private supabase: SupabaseClient;
  private config: {
    risk: RiskConfig;
    buckets: Record<RiskTier, BucketConfig>;
    capital: CapitalConfig;
  };
  private audit: AuditLog;
  private stateId: string | null = null;

  constructor(
    supabase: SupabaseClient,
    config: {
      risk: RiskConfig;
      buckets: Record<RiskTier, BucketConfig>;
      capital: CapitalConfig;
    },
    audit: AuditLog
  ) {
    this.supabase = supabase;
    this.config = config;
    this.audit = audit;
  }

  /**
   * Get or create autopilot state
   */
  private async getState(): Promise<AutopilotState | null> {
    const { data, error } = await this.supabase
      .from('autopilot_state')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[RiskManager] Failed to get state:', error);
      return null;
    }

    if (!data) {
      const { data: newState, error: insertError } = await this.supabase
        .from('autopilot_state')
        .insert({ mode: 'live', is_running: false })
        .select()
        .single();

      if (insertError) {
        console.error('[RiskManager] Failed to create state:', insertError);
        return null;
      }

      return newState as unknown as AutopilotState;
    }

    this.stateId = data.id;
    return data as unknown as AutopilotState;
  }

  /**
   * Get open positions
   */
  async getOpenPositions(): Promise<Position[]> {
    const { data, error } = await this.supabase
      .from('autopilot_positions')
      .select('id, symbol, risk_tier, size_eur, unrealized_pnl_eur, pnl_drift, status')
      .eq('status', 'open');

    if (error) {
      console.error('[RiskManager] Failed to get positions:', error);
      return [];
    }

    return (data || []) as unknown as Position[];
  }

  /**
   * Check if kill switch is active
   */
  async isKillSwitchActive(): Promise<boolean> {
    const state = await this.getState();
    return state?.kill_switch_active ?? false;
  }

  /**
   * Check if autopilot is running
   */
  async isRunning(): Promise<boolean> {
    const state = await this.getState();
    return state?.is_running ?? false;
  }

  /**
   * Get current risk level based on drawdown
   */
  async getRiskLevel(): Promise<RiskLevel> {
    const state = await this.getState();
    if (!state) return 'stopped';
    
    const drawdown = Math.abs(state.daily_drawdown_eur);
    
    if (drawdown >= this.config.risk.maxDailyDrawdownEur) return 'stopped';
    if (drawdown >= this.config.risk.cautionDrawdownEur) return 'cautious';
    return 'normal';
  }

  /**
   * Count positions by bucket
   */
  private countByBucket(positions: Position[]): Record<RiskTier, number> {
    return {
      safe: positions.filter(p => p.risk_tier === 'safe').length,
      medium: positions.filter(p => p.risk_tier === 'medium').length,
      high: positions.filter(p => p.risk_tier === 'high').length,
    };
  }

  /**
   * Calculate stress test loss
   */
  private calculateStressLoss(positions: Position[], newOpp?: OpportunityCalc): number {
    let totalExposure = positions.reduce((sum, p) => sum + p.size_eur, 0);
    
    if (newOpp) {
      totalExposure += this.config.capital.hedgeSizeEur;
    }

    return totalExposure * (this.config.risk.stressTestMultiplier / 100);
  }

  /**
   * Check if we can open a new hedge
   */
  private canOpenNewHedge(positions: Position[], bucketCounts: Record<RiskTier, number>): boolean {
    // Check total hedge count
    if (positions.length >= this.config.risk.maxConcurrentHedges) return false;
    
    // Check deployed capital
    const deployed = positions.reduce((sum, p) => sum + p.size_eur, 0);
    if (deployed + this.config.capital.hedgeSizeEur > this.config.capital.maxDeployedEur) return false;
    
    return true;
  }

  /**
   * Filter opportunities within budget constraints (STRICT for LIVE)
   */
  async filterWithinBudget(opportunities: OpportunityCalc[]): Promise<OpportunityCalc[]> {
    const positions = await this.getOpenPositions();
    const bucketCounts = this.countByBucket(positions);
    const selected: OpportunityCalc[] = [];

    // Track used symbols (max 1 position per symbol)
    const usedSymbols = new Set(positions.map(p => p.symbol));

    // Check if we can open new positions at all
    if (!this.canOpenNewHedge(positions, bucketCounts)) {
      return [];
    }

    for (const opp of opportunities) {
      // Only valid opportunities
      if (!opp.isValid) continue;

      // Skip if symbol already has position
      if (usedSymbols.has(opp.symbol)) continue;

      // Skip HIGH tier by default (unless explicitly enabled)
      if (opp.riskTier === 'high' && this.config.buckets.high.maxPositions === 0) continue;

      // Check bucket limits
      const bucket = this.config.buckets[opp.riskTier];
      if (bucketCounts[opp.riskTier] >= bucket.maxPositions) continue;

      // Check total position limit
      const totalOpen = selected.length + positions.length;
      if (totalOpen >= this.config.risk.maxConcurrentHedges) break;

      // Check stress test
      const stressLoss = this.calculateStressLoss(positions, opp);
      if (stressLoss > this.config.risk.maxDailyDrawdownEur) {
        await this.audit.log('warn', 'STRESS_TEST_EXCEEDED', 'opportunity', null, {
          symbol: opp.symbol,
          stressLoss,
          limit: this.config.risk.maxDailyDrawdownEur,
        });
        continue;
      }

      selected.push(opp);
      bucketCounts[opp.riskTier]++;
      usedSymbols.add(opp.symbol);

      // Only open 1 new position per cycle for safety
      if (selected.length >= 1) break;
    }

    return selected;
  }

  /**
   * Trigger kill switch
   */
  async triggerKillSwitch(reason: string): Promise<void> {
    const state = await this.getState();
    if (!state) return;

    await this.supabase
      .from('autopilot_state')
      .update({
        kill_switch_active: true,
        kill_switch_reason: reason,
        is_running: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', state.id);

    await this.audit.log('error', 'KILL_SWITCH_TRIGGERED', 'risk', null, { reason });
  }

  /**
   * Update daily stats and check for kill switch conditions
   */
  async updateDailyStats(): Promise<void> {
    const state = await this.getState();
    if (!state) return;

    const positions = await this.getOpenPositions();
    
    // Calculate total unrealized PnL
    const unrealizedPnl = positions.reduce((sum, p) => sum + p.unrealized_pnl_eur, 0);
    
    // Check for kill switch (€20 max loss)
    if (unrealizedPnl < -this.config.risk.maxDailyDrawdownEur) {
      await this.triggerKillSwitch(
        `Unrealized loss €${Math.abs(unrealizedPnl).toFixed(2)} exceeds max €${this.config.risk.maxDailyDrawdownEur}`
      );
      return;
    }

    // Update state
    await this.supabase
      .from('autopilot_state')
      .update({
        last_scan_ts: new Date().toISOString(),
        daily_drawdown_eur: unrealizedPnl < 0 ? unrealizedPnl : 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', state.id);
  }
}
