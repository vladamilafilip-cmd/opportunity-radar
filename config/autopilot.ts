// config/autopilot.ts - Single Source of Truth for LIVE Delta-Neutral Hedge Autopilot
// All settings in one place for easy modification

export type RiskTier = 'safe' | 'medium' | 'high';
export type AutopilotMode = 'off' | 'live' | 'dryrun';
export type RiskLevel = 'normal' | 'cautious' | 'stopped';

// Exchange allocation structure
export interface ExchangeAllocation {
  code: string;
  name: string;
  allocation: number;    // EUR allocated
  purpose: 'long' | 'short' | 'both';
  fundingInterval: number; // hours
}

export interface BucketConfig {
  percent: number;
  maxPositions: number;
}

export interface ThresholdConfig {
  minProfitBps: number;
  maxSpreadBps: number;
  maxTotalCostBps: number;
  minLiquidityScore: number;
}

export interface AutopilotConfig {
  // Capital & Risk
  capital: {
    totalEur: number;
    maxRiskPercent: number;
    hedgeSizeEur: number;         // Total per hedge (both legs)
    legSizeEur: number;           // Per leg (half of hedge)
    bufferEur: number;            // Always reserved
    maxDeployedEur: number;       // Max capital in positions
    reinvestThresholdEur: number;
  };
  
  // Bucket Allocation (for hedge positions)
  buckets: Record<RiskTier, BucketConfig>;
  
  // Exchange Whitelist with Allocations
  exchanges: ExchangeAllocation[];
  
  // Funding Intervals (hours)
  fundingIntervals: Record<string, number>;
  
  // Profit Thresholds per Risk Tier (STRICTER for LIVE)
  thresholds: Record<RiskTier, ThresholdConfig>;
  
  // Fee & Cost Model
  costs: {
    takerFeeBps: number;
    slippageBps: number;
    safetyBufferBps: number;
    maxTotalCostBps: number;
  };
  
  // Exit Rules (STRICTER)
  exit: {
    holdingPeriodIntervals: number;
    maxHoldingHours: number;
    profitExitThresholdBps: number;
    pnlDriftLimitPercent: number;
    spreadCollapseThresholdBps: number;
    spreadSpikeThresholdBps: number;
    dataStaleTimeoutSeconds: number;
    profitTargetPercent: number;
  };
  
  // Risk Manager (STRICTER)
  risk: {
    maxDailyDrawdownEur: number;
    cautionDrawdownEur: number;      // Stop opening new positions
    maxConcurrentHedges: number;
    stressTestMultiplier: number;
    killSwitchCooldownHours: number;
    notionalMatchTolerancePercent: number;
    maxLeverage: number;
    defaultLeverage: number;
  };
  
  // Worker Settings
  worker: {
    scanIntervalSeconds: number;
    priceUpdateSeconds: number;
    auditRetentionDays: number;
  };
  
  // Mode
  mode: AutopilotMode;
  
  // DRY RUN Settings
  dryRun: {
    enabled: boolean;
    logOnly: boolean;
    mockFills: boolean;
  };
  
  // Symbol Whitelist
  symbols: {
    tier1: string[];    // Always allowed
    tier2: string[];    // Max 10 additional liquid
    blacklist: string[];
  };
}

export const autopilotConfig: AutopilotConfig = {
  // ============ CAPITAL & RISK ============
  capital: {
    totalEur: 200,              
    maxRiskPercent: 10,         // Max drawdown = 20 EUR
    hedgeSizeEur: 20,           // Total hedge size (10 EUR per leg)
    legSizeEur: 10,             // Per leg
    bufferEur: 40,              // Always reserved
    maxDeployedEur: 160,        // 8 hedges × 20 EUR
    reinvestThresholdEur: 400,  
  },
  
  // ============ BUCKET ALLOCATION ============
  // For hedge positions (not legs)
  buckets: {
    safe: { percent: 60, maxPositions: 5 },     // 5 hedges max
    medium: { percent: 30, maxPositions: 2 },   // 2 hedges max
    high: { percent: 10, maxPositions: 1 },     // 1 hedge max (OFF by default)
  },
  
  // ============ EXCHANGE WHITELIST ============
  exchanges: [
    { code: 'hyperliquid', name: 'Hyperliquid', allocation: 60, purpose: 'short', fundingInterval: 1 },
    { code: 'binance', name: 'Binance', allocation: 40, purpose: 'long', fundingInterval: 8 },
    { code: 'bybit', name: 'Bybit', allocation: 30, purpose: 'both', fundingInterval: 8 },
    { code: 'okx', name: 'OKX', allocation: 30, purpose: 'both', fundingInterval: 8 },
    { code: 'dydx', name: 'dYdX', allocation: 20, purpose: 'short', fundingInterval: 1 },
    { code: 'kucoin', name: 'KuCoin', allocation: 20, purpose: 'long', fundingInterval: 8 },
  ],
  
  // ============ FUNDING INTERVALS (hours) ============
  fundingIntervals: {
    binance: 8, bybit: 8, okx: 8, kucoin: 8,
    dydx: 1, hyperliquid: 1,
  },
  
  // ============ PROFIT THRESHOLDS (STRICTER for LIVE) ============
  thresholds: {
    safe: {
      minProfitBps: 25,          // 0.25% minimum per 8h
      maxSpreadBps: 20,          // Max bid-ask spread 0.20%
      maxTotalCostBps: 15,       // Max total costs 0.15%
      minLiquidityScore: 70,     
    },
    medium: {
      minProfitBps: 35,          
      maxSpreadBps: 25,
      maxTotalCostBps: 18,
      minLiquidityScore: 60,
    },
    high: {
      minProfitBps: 50,          // HIGH tier OFF by default
      maxSpreadBps: 35,
      maxTotalCostBps: 25,
      minLiquidityScore: 40,
    },
  },
  
  // ============ FEE & COST MODEL ============
  costs: {
    takerFeeBps: 4,              // 4 bps per side (8 total)
    slippageBps: 3,              // Estimated slippage
    safetyBufferBps: 4,          // Extra buffer
    maxTotalCostBps: 15,         // Hard limit
  },
  
  // ============ EXIT RULES (STRICTER) ============
  exit: {
    holdingPeriodIntervals: 1,   // Min 1 funding interval
    maxHoldingHours: 24,         
    profitExitThresholdBps: 5,   // Exit if profit falls below 0.05%
    pnlDriftLimitPercent: 0.6,   // STRICTER: Max delta-neutral drift
    spreadCollapseThresholdBps: 5, // Exit if spread < 0.05%
    spreadSpikeThresholdBps: 35,   // Exit if spread > 0.35%
    dataStaleTimeoutSeconds: 120,  // Close all if no data > 2min
    profitTargetPercent: 60,       // Exit after 60% of expected profit
  },
  
  // ============ RISK MANAGER (STRICTER) ============
  risk: {
    maxDailyDrawdownEur: 20,     // Kill switch trigger
    cautionDrawdownEur: 10,      // Stop opening new positions
    maxConcurrentHedges: 8,      // Max 8 hedges (160 EUR)
    stressTestMultiplier: 2,     
    killSwitchCooldownHours: 24,
    notionalMatchTolerancePercent: 1, // Legs must match within 1%
    maxLeverage: 2,              // Max 2x
    defaultLeverage: 1,          // Default 1x
  },
  
  // ============ WORKER SETTINGS ============
  worker: {
    scanIntervalSeconds: 60,     
    priceUpdateSeconds: 30,      
    auditRetentionDays: 30,      
  },
  
  // ============ MODE ============
  mode: 'live',                  // Default LIVE (not paper)
  
  // ============ DRY RUN SETTINGS ============
  dryRun: {
    enabled: false,              // Toggle in UI
    logOnly: true,               
    mockFills: false,            // No paper PnL simulation
  },
  
  // ============ SYMBOL WHITELIST ============
  symbols: {
    tier1: ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'BNB', 'LINK', 'LTC'],
    tier2: ['ADA', 'AVAX', 'MATIC', 'DOT', 'ATOM', 'UNI', 'AAVE', 'ARB', 'OP', 'SUI'],
    blacklist: [], // Auto-reject is_meme=true from DB
  },
};

// ============ HELPER FUNCTIONS ============

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
  return config.exchanges.some(e => e.code.toLowerCase() === exchange.toLowerCase());
}

export function getExchangeAllocation(exchange: string, config: AutopilotConfig = autopilotConfig): ExchangeAllocation | undefined {
  return config.exchanges.find(e => e.code.toLowerCase() === exchange.toLowerCase());
}

export function isSymbolWhitelisted(symbol: string, config: AutopilotConfig = autopilotConfig): boolean {
  const upperSymbol = symbol.toUpperCase().replace(/USDT?$/, '');
  return config.symbols.tier1.includes(upperSymbol) || config.symbols.tier2.includes(upperSymbol);
}

export function isSymbolBlacklisted(symbol: string, config: AutopilotConfig = autopilotConfig): boolean {
  const upperSymbol = symbol.toUpperCase().replace(/USDT?$/, '');
  return config.symbols.blacklist.includes(upperSymbol);
}

export function getRiskLevel(drawdownEur: number, config: AutopilotConfig = autopilotConfig): RiskLevel {
  if (drawdownEur >= config.risk.maxDailyDrawdownEur) return 'stopped';
  if (drawdownEur >= config.risk.cautionDrawdownEur) return 'cautious';
  return 'normal';
}

export function getAvailableCapital(deployedEur: number, config: AutopilotConfig = autopilotConfig): number {
  return Math.max(0, config.capital.maxDeployedEur - deployedEur);
}

export function canOpenNewHedge(
  currentHedges: number, 
  deployedEur: number, 
  drawdownEur: number,
  config: AutopilotConfig = autopilotConfig
): boolean {
  const riskLevel = getRiskLevel(drawdownEur, config);
  if (riskLevel !== 'normal') return false;
  if (currentHedges >= config.risk.maxConcurrentHedges) return false;
  if (deployedEur + config.capital.hedgeSizeEur > config.capital.maxDeployedEur) return false;
  return true;
}
