// worker/src/index.ts
// Main entry point for the LIVE delta-neutral hedge autopilot worker

import { createSupabaseClient } from './supabaseClient.js';
import { OpportunityEngine } from './engine/opportunityEngine.js';
import { PositionManager } from './engine/positionManager.js';
import { RiskManager } from './engine/riskManager.js';
import { AuditLog } from './utils/auditLog.js';
import { HedgeExecutor } from './adapters/hedgeExecutor.js';

// Configuration - LIVE delta-neutral hedge settings
const config = {
  capital: {
    totalEur: 200,
    maxRiskPercent: 10,
    hedgeSizeEur: 20,           // Total per hedge
    legSizeEur: 10,             // Per leg
    bufferEur: 40,              // Always reserved
    maxDeployedEur: 160,        // 8 hedges × 20 EUR
  },
  buckets: {
    safe: { percent: 60, maxPositions: 5 },
    medium: { percent: 30, maxPositions: 2 },
    high: { percent: 10, maxPositions: 1 },
  } as const,
  allowedExchanges: [
    'hyperliquid', 'binance', 'bybit', 'okx', 'dydx', 'kucoin'
  ],
  fundingIntervals: {
    binance: 8, bybit: 8, okx: 8, kucoin: 8,
    dydx: 1, hyperliquid: 1,
  },
  thresholds: {
    safe: { minProfitBps: 25, maxSpreadBps: 20, maxTotalCostBps: 15, minLiquidityScore: 70 },
    medium: { minProfitBps: 35, maxSpreadBps: 25, maxTotalCostBps: 18, minLiquidityScore: 60 },
    high: { minProfitBps: 50, maxSpreadBps: 35, maxTotalCostBps: 25, minLiquidityScore: 40 },
  } as const,
  costs: {
    takerFeeBps: 4,
    slippageBps: 3,
    safetyBufferBps: 4,
    maxTotalCostBps: 15,
  },
  exit: {
    holdingPeriodIntervals: 1,
    maxHoldingHours: 24,
    profitExitThresholdBps: 5,
    pnlDriftLimitPercent: 0.6,     // STRICT for LIVE
    spreadCollapseThresholdBps: 5,
    spreadSpikeThresholdBps: 35,
    dataStaleTimeoutSeconds: 120,
    profitTargetPercent: 60,
  },
  risk: {
    maxDailyDrawdownEur: 20,
    cautionDrawdownEur: 10,
    maxConcurrentHedges: 8,
    stressTestMultiplier: 2,
    killSwitchCooldownHours: 24,
    notionalMatchTolerancePercent: 1,
    maxLeverage: 2,
    defaultLeverage: 1,
  },
  worker: {
    scanIntervalSeconds: 60,
    priceUpdateSeconds: 30,
    auditRetentionDays: 30,
  },
  dryRun: {
    enabled: true,  // Default to DRY RUN for safety
    logOnly: true,
    mockFills: true,
  },
};

let isShuttingDown = false;

async function runCycle(
  supabase: ReturnType<typeof createSupabaseClient>,
  audit: AuditLog,
  risk: RiskManager,
  positions: PositionManager,
  engine: OpportunityEngine,
  hedgeExecutor: HedgeExecutor
): Promise<void> {
  const cycleStart = Date.now();
  
  try {
    // 1. Check if running
    if (!(await risk.isRunning())) {
      console.log('[Cycle] Autopilot is stopped, skipping cycle');
      return;
    }

    // 2. Check kill switch
    if (await risk.isKillSwitchActive()) {
      await audit.log('warn', 'CYCLE_SKIP', 'system', null, { reason: 'Kill switch active' });
      return;
    }

    console.log('[Cycle] Starting LIVE hedge cycle...');

    // 3. Check data freshness (STRICT for LIVE)
    const lastDataTs = await engine.getLastDataTimestamp();
    if (lastDataTs) {
      const dataAgeSeconds = (Date.now() - new Date(lastDataTs).getTime()) / 1000;
      if (dataAgeSeconds > config.exit.dataStaleTimeoutSeconds) {
        await audit.log('error', 'DATA_STALE', 'system', null, { 
          ageSeconds: dataAgeSeconds, 
          limit: config.exit.dataStaleTimeoutSeconds 
        });
        // Don't open new positions, but continue managing existing
        await positions.updateAllPositions();
        await positions.checkExitConditions();
        return;
      }
    }

    // 4. Simulate funding collection for open positions
    await positions.simulateFundingCollection();

    // 5. Update existing positions with latest prices
    await positions.updateAllPositions();

    // 6. Check exit conditions (STRICT rules for LIVE)
    await positions.checkExitConditions();

    // 7. Check risk level before scanning for new opportunities
    const riskLevel = await risk.getRiskLevel();
    if (riskLevel === 'stopped') {
      await audit.log('warn', 'RISK_STOPPED', 'system', null, { reason: 'Drawdown >= €20' });
      return;
    }
    
    if (riskLevel === 'cautious') {
      console.log('[Cycle] Risk level CAUTIOUS - not opening new positions');
      await audit.log('info', 'RISK_CAUTIOUS', 'system', null, { reason: 'Drawdown €10-20' });
      await risk.updateDailyStats();
      return;
    }

    // 8. Scan for new opportunities
    const opportunities = await engine.scanAndRank();
    
    if (opportunities.length === 0) {
      console.log('[Cycle] No valid opportunities found');
      await risk.updateDailyStats();
      return;
    }

    // 9. Select best opportunities within risk budget
    const selected = await risk.filterWithinBudget(opportunities);
    
    if (selected.length === 0) {
      console.log('[Cycle] No opportunities within budget');
    } else {
      console.log(`[Cycle] Opening ${selected.length} hedge position(s)...`);
      
      // 10. Execute atomic hedges
      for (const opp of selected) {
        if (config.dryRun.enabled) {
          // DRY RUN: Log decision but use mock fills
          await audit.log('info', 'HEDGE_DECISION_DRYRUN', 'opportunity', null, {
            symbol: opp.symbol,
            longExchange: opp.longExchange,
            shortExchange: opp.shortExchange,
            netProfitBps: opp.netProfitBps,
            score: opp.score,
          });
        }
        
        const result = await hedgeExecutor.executeHedge(opp, config.capital.legSizeEur);
        
        if (result.success && result.hedgeId) {
          // Record in database
          await positions.openHedgePosition(opp, result);
        }
      }
    }

    // 11. Update daily stats
    await risk.updateDailyStats();

    const duration = Date.now() - cycleStart;
    console.log(`[Cycle] Completed in ${duration}ms`);
    
  } catch (error) {
    console.error('[Cycle] Error:', error);
    await audit.log('error', 'CYCLE_ERROR', 'system', null, { error: String(error) });
  }
}

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('  DIADONUM FUNDING ARBITRAGE AUTOPILOT');
  console.log('  Mode: LIVE (Delta-Neutral Hedge)');
  console.log('  DRY RUN:', config.dryRun.enabled ? 'ENABLED' : 'DISABLED');
  console.log('='.repeat(60));
  console.log('');
  console.log('Configuration:');
  console.log(`  Capital: €${config.capital.totalEur}`);
  console.log(`  Hedge Size: €${config.capital.hedgeSizeEur} (€${config.capital.legSizeEur} per leg)`);
  console.log(`  Buffer: €${config.capital.bufferEur} (always reserved)`);
  console.log(`  Max Risk: €${config.risk.maxDailyDrawdownEur} (kill switch)`);
  console.log(`  Caution: €${config.risk.cautionDrawdownEur} (stop new positions)`);
  console.log(`  Max Hedges: ${config.risk.maxConcurrentHedges}`);
  console.log(`  Scan Interval: ${config.worker.scanIntervalSeconds}s`);
  console.log(`  Exchanges: ${config.allowedExchanges.join(', ')}`);
  console.log('');
  console.log('Risk Controls:');
  console.log(`  Min Profit: ${config.thresholds.safe.minProfitBps}bps (SAFE)`);
  console.log(`  Max Spread: ${config.thresholds.safe.maxSpreadBps}bps`);
  console.log(`  PnL Drift Limit: ${config.exit.pnlDriftLimitPercent}%`);
  console.log(`  Data Stale Timeout: ${config.exit.dataStaleTimeoutSeconds}s`);
  console.log('');

  // Initialize Supabase
  let supabase;
  try {
    supabase = createSupabaseClient();
  } catch (error) {
    console.error('Failed to initialize Supabase client. Exiting.');
    process.exit(1);
  }

  // Initialize components
  const audit = new AuditLog(supabase);
  const risk = new RiskManager(supabase, config, audit);
  const hedgeExecutor = new HedgeExecutor(supabase, audit, config.dryRun.enabled);
  const positions = new PositionManager(supabase, config, audit, risk, hedgeExecutor);
  const engine = new OpportunityEngine(supabase, {
    costs: config.costs,
    thresholds: config.thresholds,
    hedgeSizeEur: config.capital.hedgeSizeEur,
    allowedExchanges: config.allowedExchanges,
    fundingIntervals: config.fundingIntervals,
  });

  await audit.log('info', 'WORKER_STARTED', 'system', null, {
    mode: 'live',
    dryRun: config.dryRun.enabled,
    config: {
      capital: config.capital.totalEur,
      hedgeSize: config.capital.hedgeSizeEur,
      maxRisk: config.risk.maxDailyDrawdownEur,
      maxHedges: config.risk.maxConcurrentHedges,
    },
  });

  // Graceful shutdown
  const shutdown = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    console.log('\n[Worker] Shutting down...');
    await audit.log('info', 'WORKER_STOPPED', 'system', null, {});
    await audit.close();
    
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Initial run
  console.log('[Worker] Running initial cycle...');
  await runCycle(supabase, audit, risk, positions, engine, hedgeExecutor);

  // Scheduler loop
  const intervalMs = config.worker.scanIntervalSeconds * 1000;
  console.log(`[Worker] Starting scheduler (every ${config.worker.scanIntervalSeconds}s)...`);
  
  setInterval(async () => {
    if (!isShuttingDown) {
      await runCycle(supabase, audit, risk, positions, engine, hedgeExecutor);
    }
  }, intervalMs);
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
