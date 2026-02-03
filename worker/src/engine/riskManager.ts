// worker/src/engine/riskManager.ts
// Risk management and kill switch logic

import type { SupabaseClient } from '@supabase/supabase-js';
import type { OpportunityCalc, RiskTier } from './formulas.js';
import { AuditLog } from '../utils/auditLog.js';

interface RiskConfig {
  maxDailyDrawdownEur: number;
  maxConcurrentPositions: number;
  stressTestMultiplier: number;
  killSwitchCooldownHours: number;
}

interface BucketConfig {
  percent: number;
  maxPositions: number;
}

interface CapitalConfig {
  totalEur: number;
  maxRiskPercent: number;
  positionSizeEur: number;
}

interface Position {
  id: string;
  symbol: string;
  risk_tier: RiskTier;
  size_eur: number;
  unrealized_pnl_eur: number;
  status: string;
}

interface AutopilotState {
  id: string;
  mode: string;
  is_running: boolean;
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
      // Create initial state
      const { data: newState, error: insertError } = await this.supabase
        .from('autopilot_state')
        .insert({ mode: 'paper', is_running: false })
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
      .select('id, symbol, risk_tier, size_eur, unrealized_pnl_eur, status')
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
      totalExposure += this.config.capital.positionSizeEur;
    }

    // Stress test: assume 2% adverse move on all positions
    return totalExposure * (this.config.risk.stressTestMultiplier / 100);
  }

  /**
   * Filter opportunities within budget constraints
   */
  async filterWithinBudget(opportunities: OpportunityCalc[]): Promise<OpportunityCalc[]> {
    const positions = await this.getOpenPositions();
    const bucketCounts = this.countByBucket(positions);
    const selected: OpportunityCalc[] = [];

    // Track used symbols (max 1 position per symbol)
    const usedSymbols = new Set(positions.map(p => p.symbol));

    // Calculate current exposure
    const currentExposure = positions.reduce((sum, p) => sum + p.size_eur, 0);
    const maxExposure = this.config.capital.totalEur * (this.config.capital.maxRiskPercent / 100);

    for (const opp of opportunities) {
      // Skip if symbol already has position
      if (usedSymbols.has(opp.symbol)) {
        continue;
      }

      // Check bucket limits
      const bucket = this.config.buckets[opp.riskTier];
      if (bucketCounts[opp.riskTier] >= bucket.maxPositions) {
        continue;
      }

      // Check total position limit
      const totalOpen = Object.values(bucketCounts).reduce((a, b) => a + b, 0);
      if (totalOpen >= this.config.risk.maxConcurrentPositions) {
        break;
      }

      // Check exposure limit
      const newExposure = currentExposure + this.config.capital.positionSizeEur;
      if (newExposure > maxExposure) {
        continue;
      }

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
    
    // Check if we should trigger kill switch
    if (unrealizedPnl < -this.config.risk.maxDailyDrawdownEur) {
      await this.triggerKillSwitch(`Unrealized loss €${Math.abs(unrealizedPnl).toFixed(2)} exceeds max €${this.config.risk.maxDailyDrawdownEur}`);
      return;
    }

    // Update last scan timestamp
    await this.supabase
      .from('autopilot_state')
      .update({
        last_scan_ts: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', state.id);
  }
}
