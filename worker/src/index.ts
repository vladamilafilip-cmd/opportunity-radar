// worker/src/index.ts
// Main entry point for the autopilot worker

import { createSupabaseClient } from './supabaseClient.js';
import { OpportunityEngine } from './engine/opportunityEngine.js';
import { PositionManager } from './engine/positionManager.js';
import { RiskManager } from './engine/riskManager.js';
import { AuditLog } from './utils/auditLog.js';

// Configuration - matches config/autopilot.ts
const config = {
  capital: {
    totalEur: 200,
    maxRiskPercent: 10,
    positionSizeEur: 10,
    reinvestThresholdEur: 400,
  },
  buckets: {
    safe: { percent: 70, maxPositions: 14 },
    medium: { percent: 20, maxPositions: 4 },
    high: { percent: 10, maxPositions: 2 },
  } as const,
  allowedExchanges: [
    'binance', 'bybit', 'okx', 'bitget', 'gate',
    'kucoin', 'htx', 'mexc', 'dydx', 'hyperliquid'
  ],
  fundingIntervals: {
    binance: 8, bybit: 8, okx: 8, bitget: 8, gate: 8,
    kucoin: 8, htx: 8, mexc: 8, deribit: 8,
    dydx: 1, hyperliquid: 1, kraken: 4,
  },
  thresholds: {
    safe: { minProfitBps: 15, maxSpreadBps: 10, minLiquidityScore: 70 },
    medium: { minProfitBps: 25, maxSpreadBps: 20, minLiquidityScore: 50 },
    high: { minProfitBps: 50, maxSpreadBps: 50, minLiquidityScore: 30 },
  } as const,
  costs: {
    takerFeeBps: 4,
    slippageBps: 2,
    safetyBufferBps: 5,
  },
  exit: {
    holdingPeriodIntervals: 1,
    maxHoldingHours: 24,
    profitExitThresholdBps: 5,
    pnlDriftLimitPercent: 2,
    spreadSpikeMultiplier: 3,
  },
  risk: {
    maxDailyDrawdownEur: 20,
    maxConcurrentPositions: 20,
    stressTestMultiplier: 2,
    killSwitchCooldownHours: 24,
  },
  worker: {
    scanIntervalSeconds: 60,
    priceUpdateSeconds: 30,
    auditRetentionDays: 30,
  },
};

let isShuttingDown = false;

async function runCycle(
  supabase: ReturnType<typeof createSupabaseClient>,
  audit: AuditLog,
  risk: RiskManager,
  positions: PositionManager,
  engine: OpportunityEngine
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

    console.log('[Cycle] Starting cycle...');

    // 3. Simulate funding collection for open positions
    await positions.simulateFundingCollection();

    // 4. Update existing positions with latest prices
    await positions.updateAllPositions();

    // 5. Check exit conditions
    await positions.checkExitConditions();

    // 6. Scan for new opportunities
    const opportunities = await engine.scanAndRank();
    
    if (opportunities.length === 0) {
      console.log('[Cycle] No opportunities found');
      await risk.updateDailyStats();
      return;
    }

    // 7. Select best opportunities within risk budget
    const selected = await risk.filterWithinBudget(opportunities);
    
    if (selected.length === 0) {
      console.log('[Cycle] No opportunities within budget');
    } else {
      console.log(`[Cycle] Opening ${selected.length} position(s)...`);
      
      // 8. Open new positions
      for (const opp of selected) {
        await positions.openPosition(opp);
      }
    }

    // 9. Update daily stats
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
  console.log('  DIADONUM AUTOPILOT WORKER');
  console.log('  Mode: PAPER TRADING');
  console.log('='.repeat(60));
  console.log('');
  console.log('Configuration:');
  console.log(`  Capital: €${config.capital.totalEur}`);
  console.log(`  Max Risk: ${config.capital.maxRiskPercent}% (€${config.capital.totalEur * config.capital.maxRiskPercent / 100})`);
  console.log(`  Position Size: €${config.capital.positionSizeEur}`);
  console.log(`  Scan Interval: ${config.worker.scanIntervalSeconds}s`);
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
  const positions = new PositionManager(supabase, config, audit, risk);
  const engine = new OpportunityEngine(supabase, {
    costs: config.costs,
    thresholds: config.thresholds,
    positionSizeEur: config.capital.positionSizeEur,
    allowedExchanges: config.allowedExchanges,
    fundingIntervals: config.fundingIntervals,
  });

  await audit.log('info', 'WORKER_STARTED', 'system', null, {
    config: {
      capital: config.capital.totalEur,
      maxRisk: config.capital.maxRiskPercent,
      positionSize: config.capital.positionSizeEur,
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
  await runCycle(supabase, audit, risk, positions, engine);

  // Scheduler loop
  const intervalMs = config.worker.scanIntervalSeconds * 1000;
  console.log(`[Worker] Starting scheduler (every ${config.worker.scanIntervalSeconds}s)...`);
  
  setInterval(async () => {
    if (!isShuttingDown) {
      await runCycle(supabase, audit, risk, positions, engine);
    }
  }, intervalMs);
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
