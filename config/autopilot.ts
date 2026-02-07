// config/autopilot.ts - Optimized for $500 Capital, Binance + OKX Only
// Minimalist funding arbitrage configuration

export type RiskTier = 'safe' | 'medium' | 'high';
export type AutopilotMode = 'off' | 'paper' | 'live';
export type RiskLevel = 'normal' | 'cautious' | 'stopped';

export interface ExchangeAllocation {
  code: string;
  name: string;
  allocation: number;
  purpose: 'long' | 'short' | 'both';
  fundingInterval: number;
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
  capital: {
    totalUsd: number;
    totalEur: number;
    maxRiskPercent: number;
    hedgeSizeEur: number;
    legSizeEur: number;
    bufferEur: number;
    maxDeployedEur: number;
  };
  
  buckets: Record<RiskTier, BucketConfig>;
  exchanges: ExchangeAllocation[];
  fundingIntervals: Record<string, number>;
  thresholds: Record<RiskTier, ThresholdConfig>;
  
  costs: {
    takerFeeBps: number;
    slippageBps: number;
    safetyBufferBps: number;
    maxTotalCostBps: number;
  };
  
  exit: {
    holdingPeriodIntervals: number;
    maxHoldingHours: number;
    profitExitThresholdBps: number;
    pnlDriftLimitPercent: number;
  };
  
  risk: {
    maxDailyDrawdownEur: number;
    cautionDrawdownEur: number;
    maxConcurrentHedges: number;
    killSwitchCooldownHours: number;
    stressTestMultiplier: number;
  };
  
  worker: {
    scanIntervalSeconds: number;
    priceUpdateSeconds: number;
  };
  
  mode: AutopilotMode;
  
  symbols: {
    whitelist: string[];
    blacklist: string[];
  };
}

// ============ $500 OPTIMIZED CONFIG ============
export const autopilotConfig: AutopilotConfig = {
  capital: {
    totalUsd: 500,
    totalEur: 460,
    maxRiskPercent: 11,           // €50 max drawdown
    hedgeSizeEur: 50,             // €25 LONG + €25 SHORT
    legSizeEur: 25,
    bufferEur: 60,                // 13% always reserved
    maxDeployedEur: 400,          // 8 hedges × €50
  },
  
  // Bucket allocation with display for all tiers
  buckets: {
    safe: { percent: 70, maxPositions: 6 },
    medium: { percent: 25, maxPositions: 2 },
    high: { percent: 5, maxPositions: 0 },  // Display only, no auto-trade
  },
  
  // ONLY Binance + OKX (where you have funds)
  exchanges: [
    { code: 'binance', name: 'Binance', allocation: 230, purpose: 'both', fundingInterval: 8 },
    { code: 'okx', name: 'OKX', allocation: 230, purpose: 'both', fundingInterval: 8 },
  ],
  
  fundingIntervals: {
    binance: 8,
    okx: 8,
  },
  
  // Optimized thresholds for Binance + OKX arbitrage
  thresholds: {
    safe: {
      minProfitBps: 5,            // 0.005% min per 8h (sniženo sa 30)
      maxSpreadBps: 25,           // 0.25% max bid-ask (povećano sa 15)
      maxTotalCostBps: 10,
      minLiquidityScore: 60,      // Sniženo sa 70
    },
    medium: {
      minProfitBps: 10,           // Sniženo sa 40
      maxSpreadBps: 35,           // Povećano sa 20
      maxTotalCostBps: 12,
      minLiquidityScore: 50,
    },
    high: {
      minProfitBps: 15,           // Sniženo sa 50
      maxSpreadBps: 50,
      maxTotalCostBps: 15,
      minLiquidityScore: 40,
    },
  },
  
  costs: {
    takerFeeBps: 3,               // VIP nivo (sniženo sa 4)
    slippageBps: 1,               // Visoka likvidnost (sniženo sa 2)
    safetyBufferBps: 2,           // Sniženo sa 3
    maxTotalCostBps: 8,           // Ukupno 8 bps (sniženo sa 12)
  },
  
  exit: {
    holdingPeriodIntervals: 1,    // Min 8h
    maxHoldingHours: 24,
    profitExitThresholdBps: 1,    // Exit if < 0.01%
    pnlDriftLimitPercent: 0.5,
  },
  
  risk: {
    maxDailyDrawdownEur: 50,      // Kill switch at €50
    cautionDrawdownEur: 25,
    maxConcurrentHedges: 8,
    killSwitchCooldownHours: 24,
    stressTestMultiplier: 2,
  },
  
  worker: {
    scanIntervalSeconds: 60,
    priceUpdateSeconds: 30,
  },
  
  mode: 'paper',                   // Default to PAPER mode
  
  symbols: {
    whitelist: [
      // Tier 1 - Major coins
      'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'DOT', 'LINK',
      'TRX', 'MATIC', 'SHIB', 'LTC', 'BCH', 'ATOM', 'UNI', 'XLM', 'ETC', 'FIL',
      // Tier 2 - Large altcoins
      'APT', 'ARB', 'OP', 'NEAR', 'INJ', 'SUI', 'SEI', 'TIA', 'JUP', 'STX',
      'IMX', 'RENDER', 'FET', 'GRT', 'THETA', 'FTM', 'ALGO', 'VET', 'HBAR', 'ICP',
      'SAND', 'MANA', 'AXS', 'GALA', 'ENJ', 'FLOW', 'CHZ', 'ROSE', 'ZIL', 'ENS',
      // Tier 3 - DeFi
      'AAVE', 'CRV', 'SNX', 'MKR', 'COMP', 'LDO', 'RPL', 'GMX', 'DYDX', 'SUSHI',
      '1INCH', 'BAL', 'YFI', 'RUNE', 'PENDLE', 'JTO', 'EIGEN', 'ENA', 'ETHFI',
      // Tier 4 - Meme (visok rizik ali visoke funding rate)
      'PEPE', 'WIF', 'BONK', 'FLOKI', 'MEME', 'TURBO', 'NEIRO', 'PNUT', 'ACT',
      // Tier 5 - Other popular
      'APE', 'BLUR', 'ID', 'MASK', 'SSV', 'ARKM', 'WLD', 'PYTH', 'STRK', 'ZRO',
      'W', 'ONDO', 'TAO', 'KAS', 'TON', 'NOT', 'DOGS', 'HMSTR', 'CATI', 'BOME',
      'ORDI', 'SATS', 'RATS', '1000PEPE', '1000SHIB', '1000BONK', '1000FLOKI'
    ],
    blacklist: [],
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

export function calculateAPR(spreadBps: number): number {
  const periodsPerYear = (365 * 24) / 8; // 8h intervals
  return spreadBps * periodsPerYear / 100;
}
