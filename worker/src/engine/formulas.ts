// worker/src/engine/formulas.ts
// Core formulas for opportunity calculation

// Import config (in worker context we need to handle this carefully)
// For now, define the config interface and use environment or passed config

export type RiskTier = 'safe' | 'medium' | 'high';

export interface CostConfig {
  takerFeeBps: number;
  slippageBps: number;
  safetyBufferBps: number;
}

export interface ThresholdConfig {
  minProfitBps: number;
  maxSpreadBps: number;
  minLiquidityScore: number;
}

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
  liquidityScore: number;
  
  // Computed
  fundingSpread8h: number;
  grossProfitBps: number;
  totalCostBps: number;
  netProfitBps: number;
  netProfitPercent: number;
  netProfitEur: number;
  apr: number;
  score: number;
  riskTier: RiskTier;
  reasons: string[];
}

/**
 * Normalize funding rate to 8h equivalent
 * Handles different funding intervals (1h, 4h, 8h)
 */
export function normalizeTo8h(rate: number, intervalHours: number): number {
  if (intervalHours <= 0) return 0;
  return rate * (8 / intervalHours);
}

/**
 * Annualize an 8h rate
 * 3 intervals per day × 365 days = 1095
 */
export function annualize8hRate(rate8h: number): number {
  return rate8h * 1095;
}

/**
 * Calculate total cost in bps
 */
export function calculateTotalCostBps(costs: CostConfig): number {
  return (costs.takerFeeBps * 2) + costs.slippageBps + costs.safetyBufferBps;
}

/**
 * Determine risk tier based on symbol properties
 */
export function determineRiskTier(
  isMeme: boolean,
  volatilityMultiplier: number,
  liquidityScore: number
): RiskTier {
  // Meme coins are always HIGH risk
  if (isMeme) return 'high';
  
  // High volatility = MEDIUM or HIGH
  if (volatilityMultiplier > 2) return 'high';
  if (volatilityMultiplier > 1.5) return 'medium';
  
  // Low liquidity = MEDIUM or HIGH
  if (liquidityScore < 30) return 'high';
  if (liquidityScore < 50) return 'medium';
  
  return 'safe';
}

/**
 * Calculate opportunity score
 * Factors: profit (50%), liquidity (30%), stability (20%)
 */
export function calculateScore(
  netProfitBps: number,
  liquidityScore: number,
  stabilityScore: number = 50
): number {
  const profitScore = Math.min(100, Math.max(0, netProfitBps));
  const liqScore = Math.min(100, Math.max(0, liquidityScore));
  const stabScore = Math.min(100, Math.max(0, stabilityScore));
  
  return Math.round(
    profitScore * 0.5 +
    liqScore * 0.3 +
    stabScore * 0.2
  );
}

/**
 * Main opportunity calculation
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
  liquidityScore: number,
  symbolRiskTier: RiskTier,
  costs: CostConfig,
  thresholds: Record<RiskTier, ThresholdConfig>,
  positionSizeEur: number
): OpportunityCalc | null {
  const reasons: string[] = [];
  
  // Normalize to 8h
  const longFunding8h = normalizeTo8h(longFundingRate, longIntervalHours);
  const shortFunding8h = normalizeTo8h(shortFundingRate, shortIntervalHours);
  
  // Funding spread: profit = short - long
  // We go LONG where funding is low/negative (we receive or pay less)
  // We go SHORT where funding is high/positive (we receive)
  const fundingSpread8h = shortFunding8h - longFunding8h;
  
  // Only positive spreads are opportunities
  if (fundingSpread8h <= 0) {
    return null;
  }
  
  // Gross profit per 8h in bps
  const grossProfitBps = fundingSpread8h * 10000;
  
  // Total costs
  const totalCostBps = calculateTotalCostBps(costs);
  
  // Net profit
  const netProfitBps = grossProfitBps - totalCostBps;
  const netProfitPercent = netProfitBps / 100;
  const netProfitEur = positionSizeEur * (netProfitPercent / 100);
  
  // APR (annualized)
  const apr = annualize8hRate(netProfitPercent);
  
  // Get thresholds for this risk tier
  const tierThresholds = thresholds[symbolRiskTier];
  
  // Validate against thresholds
  if (netProfitBps < tierThresholds.minProfitBps) {
    reasons.push(`Net profit ${netProfitBps.toFixed(1)}bps < min ${tierThresholds.minProfitBps}bps`);
    return null;
  }
  
  if (bidAskSpreadBps > tierThresholds.maxSpreadBps) {
    reasons.push(`Spread ${bidAskSpreadBps.toFixed(1)}bps > max ${tierThresholds.maxSpreadBps}bps`);
    return null;
  }
  
  if (liquidityScore < tierThresholds.minLiquidityScore) {
    reasons.push(`Liquidity ${liquidityScore.toFixed(0)} < min ${tierThresholds.minLiquidityScore}`);
    return null;
  }
  
  // Calculate score
  const score = calculateScore(netProfitBps, liquidityScore);
  
  // Add success reasons
  reasons.push(`Net: ${netProfitBps.toFixed(1)}bps per 8h`);
  reasons.push(`APR: ${apr.toFixed(0)}%`);
  reasons.push(`Score: ${score}`);
  reasons.push(`Long: ${longExchange} (${(longFunding8h * 100).toFixed(4)}%)`);
  reasons.push(`Short: ${shortExchange} (${(shortFunding8h * 100).toFixed(4)}%)`);
  
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
    liquidityScore,
    fundingSpread8h,
    grossProfitBps,
    totalCostBps,
    netProfitBps,
    netProfitPercent,
    netProfitEur,
    apr,
    score,
    riskTier: symbolRiskTier,
    reasons,
  };
}

/**
 * Calculate unrealized PnL for a position
 */
export function calculateUnrealizedPnL(
  entryLongPrice: number,
  entryShortPrice: number,
  currentLongPrice: number,
  currentShortPrice: number,
  sizeEur: number
): { pnlEur: number; pnlPercent: number; drift: number } {
  // Long position PnL = (current - entry) / entry
  const longPnlPercent = (currentLongPrice - entryLongPrice) / entryLongPrice;
  
  // Short position PnL = (entry - current) / entry
  const shortPnlPercent = (entryShortPrice - currentShortPrice) / entryShortPrice;
  
  // Combined PnL (delta-neutral should be ~0 from price moves)
  const totalPnlPercent = (longPnlPercent + shortPnlPercent) / 2;
  const pnlEur = sizeEur * totalPnlPercent;
  
  // Drift = how much the position has deviated from delta-neutral
  const drift = Math.abs(longPnlPercent + shortPnlPercent) * 100;
  
  return {
    pnlEur,
    pnlPercent: totalPnlPercent * 100,
    drift,
  };
}

/**
 * Calculate funding payment for a position
 */
export function calculateFundingPayment(
  fundingRate: number,
  sizeEur: number,
  isLong: boolean
): number {
  // Long pays funding when rate is positive, receives when negative
  // Short receives funding when rate is positive, pays when negative
  const direction = isLong ? -1 : 1;
  return sizeEur * fundingRate * direction;
}
