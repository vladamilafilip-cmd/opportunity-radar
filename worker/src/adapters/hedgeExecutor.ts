// worker/src/adapters/hedgeExecutor.ts
// Atomic hedge execution - ensures both legs fill or none

import type { SupabaseClient } from '@supabase/supabase-js';
import type { OpportunityCalc } from '../engine/formulas.js';
import { AuditLog } from '../utils/auditLog.js';
import { getExchangeConfig, isValidHedgePair } from '../config/exchangeBalances.js';

export interface OrderResult {
  success: boolean;
  orderId: string | null;
  fillPrice: number | null;
  fillSize: number | null;
  fee: number;
  error: string | null;
}

export interface HedgeExecutionResult {
  success: boolean;
  hedgeId: string | null;
  longOrder: OrderResult | null;
  shortOrder: OrderResult | null;
  error: string | null;
}

export interface HedgeCloseResult {
  success: boolean;
  longCloseOrder: OrderResult | null;
  shortCloseOrder: OrderResult | null;
  realizedPnl: number;
  error: string | null;
}

export class HedgeExecutor {
  private supabase: SupabaseClient;
  private audit: AuditLog;
  private dryRun: boolean;

  constructor(supabase: SupabaseClient, audit: AuditLog, dryRun: boolean = true) {
    this.supabase = supabase;
    this.audit = audit;
    this.dryRun = dryRun;
  }

  /**
   * Execute atomic hedge (both legs must fill or none)
   */
  async executeHedge(opportunity: OpportunityCalc, legSizeEur: number): Promise<HedgeExecutionResult> {
    const hedgeId = crypto.randomUUID();
    
    // Validate hedge pair
    if (!isValidHedgePair(opportunity.longExchange, opportunity.shortExchange)) {
      return {
        success: false,
        hedgeId: null,
        longOrder: null,
        shortOrder: null,
        error: `Invalid hedge pair: ${opportunity.longExchange}/${opportunity.shortExchange}`,
      };
    }

    // Check exchange configs exist
    const longConfig = getExchangeConfig(opportunity.longExchange);
    const shortConfig = getExchangeConfig(opportunity.shortExchange);
    
    if (!longConfig || !shortConfig) {
      return {
        success: false,
        hedgeId: null,
        longOrder: null,
        shortOrder: null,
        error: 'Exchange config not found',
      };
    }

    await this.audit.log('info', 'HEDGE_EXECUTION_START', 'hedge', hedgeId, {
      symbol: opportunity.symbol,
      longExchange: opportunity.longExchange,
      shortExchange: opportunity.shortExchange,
      legSizeEur,
      dryRun: this.dryRun,
    });

    if (this.dryRun) {
      // DRY RUN: Simulate successful execution
      return this.simulateHedgeExecution(opportunity, legSizeEur, hedgeId);
    }

    // LIVE EXECUTION
    // TODO: Implement actual exchange API calls via CCXT
    // This is the skeleton for LIVE trading
    
    try {
      // Step 1: Submit both orders simultaneously
      const [longResult, shortResult] = await Promise.all([
        this.submitLongOrder(opportunity, legSizeEur),
        this.submitShortOrder(opportunity, legSizeEur),
      ]);

      // Step 2: Check if both succeeded
      if (!longResult.success || !shortResult.success) {
        // Rollback: cancel/close any filled order
        await this.rollbackHedge(longResult, shortResult);
        
        await this.audit.log('error', 'HEDGE_EXECUTION_FAILED', 'hedge', hedgeId, {
          symbol: opportunity.symbol,
          longError: longResult.error,
          shortError: shortResult.error,
        });

        return {
          success: false,
          hedgeId: null,
          longOrder: longResult,
          shortOrder: shortResult,
          error: `Hedge failed: Long=${longResult.error || 'OK'}, Short=${shortResult.error || 'OK'}`,
        };
      }

      // Step 3: Verify notional match (within 1% tolerance)
      const longNotional = (longResult.fillPrice || opportunity.longPrice) * (longResult.fillSize || 0);
      const shortNotional = (shortResult.fillPrice || opportunity.shortPrice) * (shortResult.fillSize || 0);
      const notionalDiff = Math.abs(longNotional - shortNotional) / ((longNotional + shortNotional) / 2) * 100;
      
      if (notionalDiff > 1) {
        // Notional mismatch - close both positions
        await this.rollbackHedge(longResult, shortResult);
        
        await this.audit.log('error', 'HEDGE_NOTIONAL_MISMATCH', 'hedge', hedgeId, {
          longNotional,
          shortNotional,
          diff: notionalDiff,
        });

        return {
          success: false,
          hedgeId: null,
          longOrder: longResult,
          shortOrder: shortResult,
          error: `Notional mismatch: ${notionalDiff.toFixed(2)}% > 1% tolerance`,
        };
      }

      await this.audit.log('action', 'HEDGE_EXECUTED', 'hedge', hedgeId, {
        symbol: opportunity.symbol,
        longFillPrice: longResult.fillPrice,
        shortFillPrice: shortResult.fillPrice,
        totalFees: longResult.fee + shortResult.fee,
      });

      return {
        success: true,
        hedgeId,
        longOrder: longResult,
        shortOrder: shortResult,
        error: null,
      };

    } catch (error) {
      await this.audit.log('error', 'HEDGE_EXECUTION_ERROR', 'hedge', hedgeId, {
        error: String(error),
      });

      return {
        success: false,
        hedgeId: null,
        longOrder: null,
        shortOrder: null,
        error: String(error),
      };
    }
  }

  /**
   * Close hedge position (both legs)
   */
  async closeHedge(
    positionId: string,
    longExchange: string,
    shortExchange: string,
    longSize: number,
    shortSize: number,
    reason: string
  ): Promise<HedgeCloseResult> {
    await this.audit.log('info', 'HEDGE_CLOSE_START', 'hedge', positionId, {
      longExchange,
      shortExchange,
      reason,
      dryRun: this.dryRun,
    });

    if (this.dryRun) {
      return {
        success: true,
        longCloseOrder: { success: true, orderId: 'dry-run', fillPrice: null, fillSize: null, fee: 0, error: null },
        shortCloseOrder: { success: true, orderId: 'dry-run', fillPrice: null, fillSize: null, fee: 0, error: null },
        realizedPnl: 0,
        error: null,
      };
    }

    // TODO: Implement actual close orders via CCXT
    try {
      const [longClose, shortClose] = await Promise.all([
        this.closeLongPosition(longExchange, longSize),
        this.closeShortPosition(shortExchange, shortSize),
      ]);

      if (!longClose.success || !shortClose.success) {
        await this.audit.log('error', 'HEDGE_CLOSE_PARTIAL', 'hedge', positionId, {
          longError: longClose.error,
          shortError: shortClose.error,
        });
      }

      const totalFees = longClose.fee + shortClose.fee;
      
      await this.audit.log('action', 'HEDGE_CLOSED', 'hedge', positionId, {
        reason,
        totalFees,
      });

      return {
        success: longClose.success && shortClose.success,
        longCloseOrder: longClose,
        shortCloseOrder: shortClose,
        realizedPnl: 0, // Would be calculated from actual fill prices
        error: null,
      };

    } catch (error) {
      return {
        success: false,
        longCloseOrder: null,
        shortCloseOrder: null,
        realizedPnl: 0,
        error: String(error),
      };
    }
  }

  // === PRIVATE METHODS ===

  private simulateHedgeExecution(
    opportunity: OpportunityCalc,
    legSizeEur: number,
    hedgeId: string
  ): HedgeExecutionResult {
    // Simulate fills at current prices with estimated slippage
    const slippageBps = 2;
    
    return {
      success: true,
      hedgeId,
      longOrder: {
        success: true,
        orderId: `dry-run-long-${hedgeId.slice(0, 8)}`,
        fillPrice: opportunity.longPrice * (1 + slippageBps / 10000),
        fillSize: legSizeEur / opportunity.longPrice,
        fee: legSizeEur * 0.0004, // 4bps
        error: null,
      },
      shortOrder: {
        success: true,
        orderId: `dry-run-short-${hedgeId.slice(0, 8)}`,
        fillPrice: opportunity.shortPrice * (1 - slippageBps / 10000),
        fillSize: legSizeEur / opportunity.shortPrice,
        fee: legSizeEur * 0.0004,
        error: null,
      },
      error: null,
    };
  }

  private async submitLongOrder(_opportunity: OpportunityCalc, _legSizeEur: number): Promise<OrderResult> {
    // TODO: Implement via CCXT
    // This would:
    // 1. Get exchange adapter
    // 2. Calculate position size in base asset
    // 3. Submit market buy order
    // 4. Wait for fill confirmation
    // 5. Return fill details
    
    return {
      success: false,
      orderId: null,
      fillPrice: null,
      fillSize: null,
      fee: 0,
      error: 'LIVE trading not implemented - use DRY RUN',
    };
  }

  private async submitShortOrder(_opportunity: OpportunityCalc, _legSizeEur: number): Promise<OrderResult> {
    // TODO: Implement via CCXT
    return {
      success: false,
      orderId: null,
      fillPrice: null,
      fillSize: null,
      fee: 0,
      error: 'LIVE trading not implemented - use DRY RUN',
    };
  }

  private async closeLongPosition(_exchange: string, _size: number): Promise<OrderResult> {
    // TODO: Implement via CCXT
    return {
      success: false,
      orderId: null,
      fillPrice: null,
      fillSize: null,
      fee: 0,
      error: 'LIVE trading not implemented',
    };
  }

  private async closeShortPosition(_exchange: string, _size: number): Promise<OrderResult> {
    // TODO: Implement via CCXT
    return {
      success: false,
      orderId: null,
      fillPrice: null,
      fillSize: null,
      fee: 0,
      error: 'LIVE trading not implemented',
    };
  }

  private async rollbackHedge(longResult: OrderResult, shortResult: OrderResult): Promise<void> {
    // If one leg filled, close it to avoid naked exposure
    if (longResult.success && longResult.orderId) {
      await this.audit.log('warn', 'HEDGE_ROLLBACK_LONG', 'order', longResult.orderId, {});
      // TODO: Close long position
    }
    
    if (shortResult.success && shortResult.orderId) {
      await this.audit.log('warn', 'HEDGE_ROLLBACK_SHORT', 'order', shortResult.orderId, {});
      // TODO: Close short position
    }
  }
}
