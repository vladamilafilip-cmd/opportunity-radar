// config/autopilot.ts - Single Source of Truth for Autopilot System
// All settings in one place for easy modification

export type RiskTier = 'safe' | 'medium' | 'high';
export type AutopilotMode = 'off' | 'paper' | 'live';

export interface BucketConfig {
  percent: number;
  maxPositions: number;
}

export interface ThresholdConfig {
  minProfitBps: number;
  maxSpreadBps: number;
  minLiquidityScore: number;
}

export interface AutopilotConfig {
  // Capital & Risk
  capital: {
    totalEur: number;
    maxRiskPercent: number;
    positionSizeEur: number;
    reinvestThresholdEur: number;
  };
  
  // Bucket Allocation
  buckets: Record<RiskTier, BucketConfig>;
  
  // Exchanges
  allowedExchanges: string[];
  
  // Funding Intervals (hours)
  fundingIntervals: Record<string, number>;
  
  // Profit Thresholds per Risk Tier
  thresholds: Record<RiskTier, ThresholdConfig>;
  
  // Fee & Cost Model
  costs: {
    takerFeeBps: number;
    slippageBps: number;
    safetyBufferBps: number;
  };
  
  // Exit Rules
  exit: {
    holdingPeriodIntervals: number;
    maxHoldingHours: number;
    profitExitThresholdBps: number;
    pnlDriftLimitPercent: number;
    spreadSpikeMultiplier: number;
  };
  
  // Risk Manager
  risk: {
    maxDailyDrawdownEur: number;
    maxConcurrentPositions: number;
    stressTestMultiplier: number;
    killSwitchCooldownHours: number;
  };
  
  // Worker Settings
  worker: {
    scanIntervalSeconds: number;
    priceUpdateSeconds: number;
    auditRetentionDays: number;
  };
  
  // Mode
  mode: AutopilotMode;
  
  // Price Arb (OFF by default)
  priceArb: {
    enabled: boolean;
    requiresOnChainTransfer: boolean;
  };
}

export const autopilotConfig: AutopilotConfig = {
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
  
  // ============ FUNDING INTERVALS (hours) ============
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
  mode: 'paper',
  
  // ============ PRICE ARB (OFF by default) ============
  priceArb: {
    enabled: false,
    requiresOnChainTransfer: true, // Auto HIGH risk
  },
};

// Helper functions
export function getTotalCostBps(config: AutopilotConfig = autopilotConfig): number {
  return (config.costs.takerFeeBps * 2) + config.costs.slippageBps + config.costs.safetyBufferBps;
}

export function getMaxRiskEur(config: AutopilotConfig = autopilotConfig): number {
  return config.capital.totalEur * (config.capital.maxRiskPercent / 100);
}

export function getFundingIntervalHours(exchange: string, config: AutopilotConfig = autopilotConfig): number {
  return config.fundingIntervals[exchange.toLowerCase()] ?? 8;
}

export function isExchangeAllowed(exchange: string, config: AutopilotConfig = autopilotConfig): boolean {
  return config.allowedExchanges.includes(exchange.toLowerCase());
}
