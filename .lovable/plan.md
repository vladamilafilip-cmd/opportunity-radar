
# Local-First Autopilot System for Crypto Arbitrage

## Overview

Kompletan sistem za automatizovano paper trading sa funding arbitrage mogucnostima. Radi lokalno na tvom racunaru, koristi Supabase (Cloud ili Local), i omogucava full automation uz striktnu kontrolu rizika.

---

## Arhitektura Sistema

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DIADONUM AUTOPILOT                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │   React UI      │────│   Zustand       │────│   Supabase      │         │
│  │   Dashboard     │    │   Stores        │    │   (Cloud/Local) │         │
│  │   + Autopilot   │    │   + Autopilot   │    │   PostgreSQL    │         │
│  │     Panel       │    │     Store       │    │   + Edge Fns    │         │
│  └─────────────────┘    └─────────────────┘    └────────┬────────┘         │
│                                                          │                  │
│  ┌───────────────────────────────────────────────────────┴──────────────┐  │
│  │                         LOCAL WORKER (Node.js)                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │  │
│  │  │  Scheduler   │  │  Opportunity │  │   Position   │  │   Risk    │ │  │
│  │  │  (60s loop)  │──│    Engine    │──│   Manager    │──│  Manager  │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └───────────┘ │  │
│  │                           │                                           │  │
│  │                    ┌──────┴──────┐                                    │  │
│  │                    │  Audit Log  │                                    │  │
│  │                    └─────────────┘                                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Struktura Fajlova (Novo)

```text
project/
├── config/
│   └── autopilot.ts                 # Jedini config fajl (single source of truth)
│
├── worker/
│   ├── package.json                 # Node.js dependencies za worker
│   ├── tsconfig.json                # TypeScript config za worker
│   ├── src/
│   │   ├── index.ts                 # Entry point + scheduler loop
│   │   ├── supabaseClient.ts        # Supabase client za worker
│   │   ├── engine/
│   │   │   ├── opportunityEngine.ts # Skeniranje i ranking prilika
│   │   │   ├── positionManager.ts   # Open/close/monitor pozicije
│   │   │   ├── riskManager.ts       # Kill switch, drawdown kontrola
│   │   │   └── formulas.ts          # Sve formule na jednom mestu
│   │   ├── adapters/
│   │   │   └── exchangeAdapter.ts   # Skeleton za LIVE (placeholder)
│   │   └── utils/
│   │       └── auditLog.ts          # Logovanje svih akcija
│   └── README.md                    # Worker dokumentacija
│
├── src/
│   ├── components/
│   │   ├── AutopilotPanel.tsx       # Kontrolni panel (OFF/PAPER/LIVE)
│   │   ├── AutopilotStatus.tsx      # Status widget za header
│   │   ├── BucketAllocation.tsx     # SAFE/MEDIUM/HIGH vizualizacija
│   │   ├── RiskBudgetDisplay.tsx    # Risk budget meter
│   │   ├── ExplainDrawer.tsx        # Explain modal za svaku akciju
│   │   └── AutopilotPositions.tsx   # Aktivne autopilot pozicije
│   ├── store/
│   │   └── autopilotStore.ts        # Zustand store za autopilot state
│   ├── types/
│   │   └── autopilot.ts             # TypeScript tipovi za autopilot
│   └── pages/
│       └── Dashboard.tsx            # Integracija AutopilotPanel-a
│
├── supabase/
│   └── migrations/
│       └── 20240204_autopilot_tables.sql   # Nove tabele
│
└── README.md                        # Kompletna dokumentacija
```

---

## 2. Konfiguracija (config/autopilot.ts)

```typescript
// config/autopilot.ts - Single Source of Truth
export const autopilotConfig = {
  // ============ CAPITAL & RISK ============
  capital: {
    totalEur: 200,              // Ukupni kapital
    maxRiskPercent: 10,         // Max drawdown = 20 EUR
    positionSizeEur: 10,        // Fiksna velicina pozicije
    reinvestThresholdEur: 400,  // Povecaj size tek na 400 EUR
  },
  
  // ============ BUCKET ALLOCATION ============
  buckets: {
    safe: { percent: 70, maxPositions: 14 },    // 70% = 140 EUR / 10 = 14 pos
    medium: { percent: 20, maxPositions: 4 },   // 20% = 40 EUR / 10 = 4 pos
    high: { percent: 10, maxPositions: 2 },     // 10% = 20 EUR / 10 = 2 pos
  },
  
  // ============ EXCHANGES ============
  allowedExchanges: [
    'binance', 'bybit', 'okx', 'bitget', 'gate', 
    'kucoin', 'htx', 'mexc', 'dydx', 'hyperliquid'
  ],
  
  // ============ FUNDING INTERVALS ============
  fundingIntervals: {
    binance: 8, bybit: 8, okx: 8, bitget: 8, gate: 8,
    kucoin: 8, htx: 8, mexc: 8, deribit: 8,
    dydx: 1, hyperliquid: 1, kraken: 4,
  },
  
  // ============ PROFIT THRESHOLDS (po risk tier) ============
  thresholds: {
    safe: {
      minProfitBps: 15,        // 0.15% minimum po intervalu
      maxSpreadBps: 10,        // Max bid-ask spread
      minLiquidityScore: 70,   // Liquidity filter
    },
    medium: {
      minProfitBps: 25,        // 0.25% za medium
      maxSpreadBps: 20,
      minLiquidityScore: 50,
    },
    high: {
      minProfitBps: 50,        // 0.50% za high risk
      maxSpreadBps: 50,
      minLiquidityScore: 30,
    },
  },
  
  // ============ FEE & COST MODEL ============
  costs: {
    takerFeeBps: 4,            // 4 bps po strani (8 total)
    slippageBps: 2,            // Estimirani slippage
    safetyBufferBps: 5,        // Extra buffer (0.05%)
  },
  
  // ============ EXIT RULES ============
  exit: {
    holdingPeriodIntervals: 1, // Min 1 funding interval
    maxHoldingHours: 24,       // Max 24h drzanja pozicije
    profitExitThresholdBps: 5, // Exit ako profit padne ispod 0.05%
    pnlDriftLimitPercent: 2,   // Max delta-neutral drift
    spreadSpikeMultiplier: 3,  // Exit na 3x spike spread-a
  },
  
  // ============ RISK MANAGER ============
  risk: {
    maxDailyDrawdownEur: 20,   // Kill switch trigger
    maxConcurrentPositions: 20,
    stressTestMultiplier: 2,   // 2x worst case scenario
    killSwitchCooldownHours: 24,
  },
  
  // ============ WORKER SETTINGS ============
  worker: {
    scanIntervalSeconds: 60,   // Koliko cesto skenira
    priceUpdateSeconds: 30,    // PnL refresh
    auditRetentionDays: 30,    // Koliko dugo cuva logove
  },
  
  // ============ MODE ============
  mode: 'paper' as 'off' | 'paper' | 'live',
  
  // ============ PRICE ARB (OFF by default) ============
  priceArb: {
    enabled: false,
    requiresOnChainTransfer: true, // Auto HIGH risk
  },
};

export type AutopilotConfig = typeof autopilotConfig;
export type RiskTier = 'safe' | 'medium' | 'high';
export type AutopilotMode = 'off' | 'paper' | 'live';
```

---

## 3. Database Migracija

Nova SQL migracija za autopilot tabele:

```sql
-- ============================================
-- AUTOPILOT POSITIONS (Paper + Live ready)
-- ============================================
CREATE TABLE IF NOT EXISTS autopilot_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode TEXT NOT NULL DEFAULT 'paper' CHECK (mode IN ('paper', 'live')),
  symbol TEXT NOT NULL,
  symbol_id UUID REFERENCES symbols(id),
  long_exchange TEXT NOT NULL,
  short_exchange TEXT NOT NULL,
  long_market_id UUID REFERENCES markets(id),
  short_market_id UUID REFERENCES markets(id),
  
  -- Position details
  size_eur NUMERIC NOT NULL,
  leverage NUMERIC NOT NULL DEFAULT 1,
  risk_tier TEXT NOT NULL CHECK (risk_tier IN ('safe', 'medium', 'high')),
  
  -- Entry data
  entry_ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  entry_long_price NUMERIC NOT NULL,
  entry_short_price NUMERIC NOT NULL,
  entry_funding_spread_8h NUMERIC NOT NULL,
  entry_score INTEGER NOT NULL,
  
  -- Current state
  current_long_price NUMERIC,
  current_short_price NUMERIC,
  funding_collected_eur NUMERIC NOT NULL DEFAULT 0,
  intervals_collected INTEGER NOT NULL DEFAULT 0,
  unrealized_pnl_eur NUMERIC NOT NULL DEFAULT 0,
  unrealized_pnl_percent NUMERIC NOT NULL DEFAULT 0,
  
  -- Exit data (null if open)
  exit_ts TIMESTAMPTZ,
  exit_long_price NUMERIC,
  exit_short_price NUMERIC,
  realized_pnl_eur NUMERIC,
  realized_pnl_percent NUMERIC,
  exit_reason TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'stopped')),
  
  -- Risk snapshot at entry
  risk_snapshot JSONB NOT NULL DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_autopilot_positions_status ON autopilot_positions(status);
CREATE INDEX idx_autopilot_positions_mode ON autopilot_positions(mode);
CREATE INDEX idx_autopilot_positions_symbol ON autopilot_positions(symbol);

-- ============================================
-- AUTOPILOT AUDIT LOG
-- ============================================
CREATE TABLE IF NOT EXISTS autopilot_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error', 'action')),
  action TEXT NOT NULL,
  entity_type TEXT, -- 'position', 'config', 'risk', 'system'
  entity_id UUID,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partitioned by month for performance
CREATE INDEX idx_audit_log_ts ON autopilot_audit_log(ts DESC);
CREATE INDEX idx_audit_log_action ON autopilot_audit_log(action);

-- ============================================
-- AUTOPILOT STATE (singleton config/status)
-- ============================================
CREATE TABLE IF NOT EXISTS autopilot_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode TEXT NOT NULL DEFAULT 'off' CHECK (mode IN ('off', 'paper', 'live')),
  is_running BOOLEAN NOT NULL DEFAULT false,
  last_scan_ts TIMESTAMPTZ,
  last_trade_ts TIMESTAMPTZ,
  total_realized_pnl_eur NUMERIC NOT NULL DEFAULT 0,
  total_funding_collected_eur NUMERIC NOT NULL DEFAULT 0,
  daily_drawdown_eur NUMERIC NOT NULL DEFAULT 0,
  kill_switch_active BOOLEAN NOT NULL DEFAULT false,
  kill_switch_reason TEXT,
  config_snapshot JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default state
INSERT INTO autopilot_state (mode, is_running) 
VALUES ('off', false)
ON CONFLICT DO NOTHING;

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE autopilot_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE autopilot_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE autopilot_state ENABLE ROW LEVEL SECURITY;

-- Allow public read (single user system)
CREATE POLICY "Public read autopilot_positions" ON autopilot_positions
  FOR SELECT USING (true);

CREATE POLICY "Public read autopilot_audit_log" ON autopilot_audit_log
  FOR SELECT USING (true);

CREATE POLICY "Public read autopilot_state" ON autopilot_state
  FOR SELECT USING (true);
```

---

## 4. Worker Implementation (worker/src/)

### 4.1 Entry Point (index.ts)

```typescript
// worker/src/index.ts
import { autopilotConfig } from '../../config/autopilot';
import { createSupabaseClient } from './supabaseClient';
import { OpportunityEngine } from './engine/opportunityEngine';
import { PositionManager } from './engine/positionManager';
import { RiskManager } from './engine/riskManager';
import { AuditLog } from './utils/auditLog';

async function runCycle() {
  const supabase = createSupabaseClient();
  const audit = new AuditLog(supabase);
  const risk = new RiskManager(supabase, autopilotConfig, audit);
  const positions = new PositionManager(supabase, autopilotConfig, audit, risk);
  const engine = new OpportunityEngine(supabase, autopilotConfig);
  
  try {
    // 1. Check risk limits
    if (await risk.isKillSwitchActive()) {
      await audit.log('warn', 'CYCLE_SKIP', 'system', null, { reason: 'Kill switch active' });
      return;
    }
    
    // 2. Update existing positions
    await positions.updateAllPositions();
    
    // 3. Check exit conditions
    await positions.checkExitConditions();
    
    // 4. Scan for new opportunities
    const opportunities = await engine.scanAndRank();
    
    // 5. Select best opportunities within risk budget
    const selected = await risk.filterWithinBudget(opportunities);
    
    // 6. Open new positions
    for (const opp of selected) {
      await positions.openPosition(opp);
    }
    
    // 7. Update state
    await risk.updateDailyStats();
    
  } catch (error) {
    await audit.log('error', 'CYCLE_ERROR', 'system', null, { error: String(error) });
  }
}

// Main loop
async function main() {
  console.log('[Autopilot] Starting worker...');
  
  const intervalMs = autopilotConfig.worker.scanIntervalSeconds * 1000;
  
  // Initial run
  await runCycle();
  
  // Scheduler loop
  setInterval(runCycle, intervalMs);
}

main().catch(console.error);
```

### 4.2 Opportunity Engine (formule)

```typescript
// worker/src/engine/formulas.ts
import { autopilotConfig, RiskTier } from '../../../config/autopilot';

export interface OpportunityCalc {
  symbol: string;
  symbolId: string;
  longExchange: string;
  shortExchange: string;
  longMarketId: string;
  shortMarketId: string;
  
  // Raw data
  longFundingRate: number;
  shortFundingRate: number;
  longIntervalHours: number;
  shortIntervalHours: number;
  longPrice: number;
  shortPrice: number;
  bidAskSpreadBps: number;
  
  // Computed
  fundingSpread8h: number;
  grossProfitBps: number;
  totalCostBps: number;
  netProfitBps: number;
  netProfitPercent: number;
  netProfitEur: number; // Za 10 EUR poziciju
  apr: number;
  score: number;
  riskTier: RiskTier;
  reasons: string[];
}

/**
 * Normalize funding rate to 8h equivalent
 */
export function normalizeTo8h(rate: number, intervalHours: number): number {
  if (intervalHours <= 0) return 0;
  return rate * (8 / intervalHours);
}

/**
 * Calculate opportunity metrics
 */
export function calculateOpportunity(
  symbol: string,
  symbolId: string,
  longExchange: string,
  shortExchange: string,
  longMarketId: string,
  shortMarketId: string,
  longFundingRate: number,
  shortFundingRate: number,
  longIntervalHours: number,
  shortIntervalHours: number,
  longPrice: number,
  shortPrice: number,
  bidAskSpreadBps: number,
  symbolRiskTier: RiskTier
): OpportunityCalc | null {
  const reasons: string[] = [];
  
  // Normalize to 8h
  const longFunding8h = normalizeTo8h(longFundingRate, longIntervalHours);
  const shortFunding8h = normalizeTo8h(shortFundingRate, shortIntervalHours);
  
  // Funding spread (we want to be LONG on low/negative, SHORT on high)
  // Profit = short_funding - long_funding (collect high, pay low)
  const fundingSpread8h = shortFunding8h - longFunding8h;
  
  if (fundingSpread8h <= 0) {
    return null; // No arbitrage opportunity
  }
  
  // Gross profit per 8h in bps
  const grossProfitBps = fundingSpread8h * 10000;
  
  // Total costs
  const { takerFeeBps, slippageBps, safetyBufferBps } = autopilotConfig.costs;
  const totalCostBps = (takerFeeBps * 2) + slippageBps + safetyBufferBps;
  
  // Net profit
  const netProfitBps = grossProfitBps - totalCostBps;
  const netProfitPercent = netProfitBps / 100;
  const netProfitEur = autopilotConfig.capital.positionSizeEur * (netProfitPercent / 100);
  
  // APR (annualized)
  const intervalsPerYear = (365 * 24) / 8;
  const apr = netProfitPercent * intervalsPerYear;
  
  // Determine risk tier
  const riskTier = symbolRiskTier;
  const thresholds = autopilotConfig.thresholds[riskTier];
  
  // Validate thresholds
  if (netProfitBps < thresholds.minProfitBps) {
    reasons.push(`Net profit ${netProfitBps.toFixed(1)}bps < min ${thresholds.minProfitBps}bps`);
    return null;
  }
  
  if (bidAskSpreadBps > thresholds.maxSpreadBps) {
    reasons.push(`Spread ${bidAskSpreadBps}bps > max ${thresholds.maxSpreadBps}bps`);
    return null;
  }
  
  // Score calculation
  // Higher score = better opportunity
  // Factors: net profit (50%), liquidity (30%), stability (20%)
  const profitScore = Math.min(100, netProfitBps);
  const liquidityScore = Math.max(0, 100 - bidAskSpreadBps);
  const stabilityScore = 50; // Placeholder - could use funding history volatility
  
  const score = Math.round(
    profitScore * 0.5 +
    liquidityScore * 0.3 +
    stabilityScore * 0.2
  );
  
  reasons.push(`Net: ${netProfitBps.toFixed(1)}bps, APR: ${apr.toFixed(0)}%, Score: ${score}`);
  
  return {
    symbol,
    symbolId,
    longExchange,
    shortExchange,
    longMarketId,
    shortMarketId,
    longFundingRate,
    shortFundingRate,
    longIntervalHours,
    shortIntervalHours,
    longPrice,
    shortPrice,
    bidAskSpreadBps,
    fundingSpread8h,
    grossProfitBps,
    totalCostBps,
    netProfitBps,
    netProfitPercent,
    netProfitEur,
    apr,
    score,
    riskTier,
    reasons,
  };
}
```

### 4.3 Risk Manager

```typescript
// worker/src/engine/riskManager.ts
export class RiskManager {
  async isKillSwitchActive(): Promise<boolean> {
    const state = await this.getState();
    return state.kill_switch_active;
  }
  
  async filterWithinBudget(opportunities: OpportunityCalc[]): Promise<OpportunityCalc[]> {
    const openPositions = await this.getOpenPositions();
    const bucketCounts = this.countByBucket(openPositions);
    const selected: OpportunityCalc[] = [];
    
    // Track symbols to avoid duplicates
    const usedSymbols = new Set(openPositions.map(p => p.symbol));
    
    for (const opp of opportunities) {
      // Skip if symbol already has position
      if (usedSymbols.has(opp.symbol)) continue;
      
      // Check bucket limits
      const bucket = autopilotConfig.buckets[opp.riskTier];
      if (bucketCounts[opp.riskTier] >= bucket.maxPositions) continue;
      
      // Check total position limit
      const totalOpen = Object.values(bucketCounts).reduce((a, b) => a + b, 0);
      if (totalOpen >= autopilotConfig.risk.maxConcurrentPositions) break;
      
      // Check risk budget (stress test)
      const worstCaseLoss = this.calculateStressLoss(openPositions, opp);
      if (worstCaseLoss > autopilotConfig.capital.maxRiskPercent * autopilotConfig.capital.totalEur / 100) {
        continue;
      }
      
      selected.push(opp);
      bucketCounts[opp.riskTier]++;
      usedSymbols.add(opp.symbol);
    }
    
    return selected;
  }
  
  async triggerKillSwitch(reason: string): Promise<void> {
    await this.supabase
      .from('autopilot_state')
      .update({
        kill_switch_active: true,
        kill_switch_reason: reason,
        mode: 'off',
        is_running: false,
      })
      .eq('id', this.stateId);
    
    await this.audit.log('error', 'KILL_SWITCH', 'risk', null, { reason });
  }
}
```

---

## 5. UI Components

### 5.1 AutopilotPanel.tsx

```typescript
// src/components/AutopilotPanel.tsx
export function AutopilotPanel() {
  const { 
    mode, 
    isRunning, 
    bucketAllocation, 
    riskBudget,
    positions,
    start, 
    stop, 
    stopAll 
  } = useAutopilotStore();
  
  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Autopilot Control Center
          </div>
          <ModeToggle mode={mode} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode Selector: OFF / PAPER / LIVE */}
        <div className="flex gap-2">
          <Button variant={mode === 'off' ? 'default' : 'outline'}>OFF</Button>
          <Button variant={mode === 'paper' ? 'default' : 'outline'}>PAPER</Button>
          <Button variant={mode === 'live' ? 'destructive' : 'outline'} disabled>
            LIVE (Locked)
          </Button>
        </div>
        
        {/* Bucket Allocation Visual */}
        <BucketAllocation 
          safe={bucketAllocation.safe}
          medium={bucketAllocation.medium}
          high={bucketAllocation.high}
        />
        
        {/* Risk Budget Meter */}
        <RiskBudgetDisplay 
          used={riskBudget.used} 
          total={riskBudget.total}
          dailyDrawdown={riskBudget.dailyDrawdown}
        />
        
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={start} disabled={isRunning || mode === 'off'}>
            <Play className="h-4 w-4 mr-2" /> Start
          </Button>
          <Button variant="secondary" onClick={stop} disabled={!isRunning}>
            <Pause className="h-4 w-4 mr-2" /> Stop
          </Button>
          <Button variant="destructive" onClick={stopAll}>
            <StopCircle className="h-4 w-4 mr-2" /> Stop All
          </Button>
        </div>
        
        {/* Warnings */}
        {mode === 'off' && (
          <Alert variant="warning">
            Autopilot is OFF. No trades will be executed.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
```

### 5.2 ExplainDrawer.tsx

```typescript
// src/components/ExplainDrawer.tsx
export function ExplainDrawer({ opportunity, position }: Props) {
  return (
    <Sheet>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Trade Explanation</SheetTitle>
        </SheetHeader>
        
        <div className="space-y-4 mt-4">
          {/* Formula Breakdown */}
          <div className="bg-muted p-4 rounded-lg font-mono text-sm">
            <p>Gross Profit = Short Funding - Long Funding</p>
            <p className="text-primary">= {opportunity.shortFunding8h}% - {opportunity.longFunding8h}%</p>
            <p className="text-primary">= {opportunity.fundingSpread8h}% per 8h</p>
            
            <Separator className="my-2" />
            
            <p>Costs = Fees + Slippage + Buffer</p>
            <p className="text-muted-foreground">= 8bps + 2bps + 5bps = 15bps</p>
            
            <Separator className="my-2" />
            
            <p className="text-success font-bold">
              Net Profit = {opportunity.netProfitBps}bps = €{opportunity.netProfitEur.toFixed(2)}
            </p>
            <p className="text-success">APR = {opportunity.apr.toFixed(0)}%</p>
          </div>
          
          {/* Risk Assessment */}
          <div>
            <h4 className="font-medium mb-2">Risk Assessment</h4>
            <Badge variant={opportunity.riskTier === 'safe' ? 'success' : 'warning'}>
              {opportunity.riskTier.toUpperCase()}
            </Badge>
            <ul className="mt-2 text-sm space-y-1">
              {opportunity.reasons.map((r, i) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

---

## 6. Health Check Prosirenje

Azuriranje Index.tsx da ukljuci autopilot status:

```typescript
// Novi health checks u src/pages/Index.tsx
const additionalChecks = [
  { name: "Worker Status", icon: <Bot />, status: "loading" },
  { name: "Last Ingest", icon: <Clock />, status: "loading" },
  { name: "Open Positions", icon: <TrendingUp />, status: "loading" },
  { name: "Audit Log", icon: <FileText />, status: "loading" },
];

// Worker status check
const { data: state } = await supabase
  .from('autopilot_state')
  .select('*')
  .single();

if (state?.last_scan_ts) {
  const lastScan = new Date(state.last_scan_ts);
  const minutesAgo = (Date.now() - lastScan.getTime()) / 60000;
  
  updateCheck("Worker Status", {
    status: minutesAgo < 5 ? "ok" : "warning",
    message: minutesAgo < 5 ? "Running" : `Last seen ${minutesAgo.toFixed(0)}m ago`,
  });
}
```

---

## 7. README Dokumentacija

```markdown
# Diadonum - Crypto Arbitrage Autopilot

## Quick Start

### 1. Frontend
npm install
npm run dev

### 2. Worker (Local Node.js)
cd worker
npm install
npm run dev

### 3. Database (Cloud or Local)
# Cloud: Automatski preko Lovable
# Local: docker compose up -d supabase

## Konfiguracija

Sva podesavanja su u `config/autopilot.ts`:
- Kapital: 200 EUR
- Max risk: 10% (20 EUR)
- Position size: 10 EUR
- Bucket alokacija: 70% SAFE, 20% MEDIUM, 10% HIGH

## Paper Trading Simulacija

1. Worker skenira prilike svakih 60 sekundi
2. Bira najbolje po score-u unutar bucket limita
3. Otvara "paper" pozicije u bazi
4. Simulira funding payments svakog intervala
5. Zatvara po exit pravilima

## Exit Pravila

- Min 1 funding interval (8h za vecinu)
- Max 24h drzanja
- Profit pad ispod 0.05%
- PnL drift > 2%
- Spread spike 3x

## Kill Switch

Automatski se aktivira ako:
- Dnevni drawdown > 20 EUR
- Stress test prelazi limit

Zahteva rucno odobrenje za restart.

## Troubleshooting

- Worker ne radi? Proveri `autopilot_state.last_scan_ts`
- Nema trade-ova? Proveri threshold-e u config-u
- Kill switch aktivan? Vidi `autopilot_state.kill_switch_reason`
```

---

## 8. Fajlovi za Kreiranje/Izmenu

| Fajl | Akcija | Opis |
|------|--------|------|
| `config/autopilot.ts` | CREATE | Jedini config fajl |
| `worker/package.json` | CREATE | Node.js dependencies |
| `worker/tsconfig.json` | CREATE | TypeScript config |
| `worker/src/index.ts` | CREATE | Entry + scheduler |
| `worker/src/supabaseClient.ts` | CREATE | Supabase client |
| `worker/src/engine/opportunityEngine.ts` | CREATE | Skeniranje |
| `worker/src/engine/positionManager.ts` | CREATE | Pozicije |
| `worker/src/engine/riskManager.ts` | CREATE | Risk kontrola |
| `worker/src/engine/formulas.ts` | CREATE | Sve formule |
| `worker/src/adapters/exchangeAdapter.ts` | CREATE | LIVE skeleton |
| `worker/src/utils/auditLog.ts` | CREATE | Audit logging |
| `src/store/autopilotStore.ts` | CREATE | Zustand store |
| `src/types/autopilot.ts` | CREATE | TypeScript tipovi |
| `src/components/AutopilotPanel.tsx` | CREATE | Kontrolni panel |
| `src/components/AutopilotStatus.tsx` | CREATE | Header widget |
| `src/components/BucketAllocation.tsx` | CREATE | Bucket vizualizacija |
| `src/components/RiskBudgetDisplay.tsx` | CREATE | Risk meter |
| `src/components/ExplainDrawer.tsx` | CREATE | Explain modal |
| `src/components/AutopilotPositions.tsx` | CREATE | Pozicije lista |
| `src/pages/Index.tsx` | UPDATE | Dodati autopilot checks |
| `src/pages/Dashboard.tsx` | UPDATE | Integrisati panel |
| `supabase/migrations/xxx.sql` | CREATE | Nove tabele |
| `README.md` | UPDATE | Kompletna dokumentacija |
| `package.json` | UPDATE | Dodati worker script |

---

## Sledeci Koraci

1. **Implementacija** - Kreiram sve fajlove
2. **Testiranje** - Pokreni worker lokalno
3. **Fine-tuning** - Zategnemo logiku da ne lovi meme-high-risk gluposti
4. **Smart throttling** - Dodamo rate limiting
5. **Pravila** - Ne pretrguje (max X trade-ova dnevno)

Ovaj plan ti daje profesionalan autopilot sistem sa:
- Jasnim formulama (sve na jednom mestu)
- Strogom kontrolom rizika (kill switch)
- Transparentnoscu (explain drawer + audit log)
- Paper-first pristupom (LIVE je zakljucan)
