// worker/src/engine/formulas.ts
// Core formulas for LIVE delta-neutral hedge opportunity calculation

export type RiskTier = 'safe' | 'medium' | 'high';

export interface CostConfig {
  takerFeeBps: number;
  slippageBps: number;
  safetyBufferBps: number;
  maxTotalCostBps: number;
}

export interface ThresholdConfig {
  minProfitBps: number;
  maxSpreadBps: number;
  maxTotalCostBps: number;
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
  
  // Validation
  isValid: boolean;
  rejectionReason: string | null;
}

/**
 * Normalize funding rate to 8h equivalent
 */
export function normalizeTo8h(rate: number, intervalHours: number): number {
  if (intervalHours <= 0) return 0;
  return rate * (8 / intervalHours);
}

/**
 * Annualize an 8h rate (3 × 365 = 1095)
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
  if (liquidityScore < 40) return 'high';
  if (liquidityScore < 60) return 'medium';
  
  return 'safe';
}

/**
 * Calculate opportunity score (0-100)
 */
export function calculateScore(
  netProfitBps: number,
  liquidityScore: number,
  stabilityScore: number = 50
): number {
  // Weighted: 50% profit, 30% liquidity, 20% stability
  const profitScore = Math.min(100, Math.max(0, netProfitBps * 2)); // Scale 50bps = 100
  const liqScore = Math.min(100, Math.max(0, liquidityScore));
  const stabScore = Math.min(100, Math.max(0, stabilityScore));
  
  return Math.round(
    profitScore * 0.5 +
    liqScore * 0.3 +
    stabScore * 0.2
  );
}

/**
 * Main opportunity calculation with strict LIVE validation
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
  hedgeSizeEur: number
): OpportunityCalc | null {
  const reasons: string[] = [];
  let isValid = true;
  let rejectionReason: string | null = null;
  
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
  const netProfitEur = hedgeSizeEur * (netProfitPercent / 100);
  
  // APR (annualized)
  const apr = annualize8hRate(netProfitPercent);
  
  // Get thresholds for this risk tier
  const tierThresholds = thresholds[symbolRiskTier];
  
  // === STRICT LIVE VALIDATION ===
  
  // 1. Check minimum profit
  if (netProfitBps < tierThresholds.minProfitBps) {
    isValid = false;
    rejectionReason = `Net profit ${netProfitBps.toFixed(1)}bps < min ${tierThresholds.minProfitBps}bps`;
  }
  
  // 2. Check bid/ask spread (STRICT: 0.20% max for SAFE)
  if (isValid && bidAskSpreadBps > tierThresholds.maxSpreadBps) {
    isValid = false;
    rejectionReason = `Spread ${bidAskSpreadBps.toFixed(1)}bps > max ${tierThresholds.maxSpreadBps}bps`;
  }
  
  // 3. Check total cost limit
  if (isValid && totalCostBps > tierThresholds.maxTotalCostBps) {
    isValid = false;
    rejectionReason = `Total cost ${totalCostBps.toFixed(1)}bps > max ${tierThresholds.maxTotalCostBps}bps`;
  }
  
  // 4. Check liquidity
  if (isValid && liquidityScore < tierThresholds.minLiquidityScore) {
    isValid = false;
    rejectionReason = `Liquidity ${liquidityScore.toFixed(0)} < min ${tierThresholds.minLiquidityScore}`;
  }
  
  // Calculate score
  const score = calculateScore(netProfitBps, liquidityScore);
  
  // Build reasons
  if (isValid) {
    reasons.push(`✓ Net: ${netProfitBps.toFixed(1)}bps per 8h`);
    reasons.push(`✓ APR: ${apr.toFixed(0)}%`);
    reasons.push(`✓ Score: ${score}`);
    reasons.push(`✓ Long: ${longExchange} (${(longFunding8h * 100).toFixed(4)}%)`);
    reasons.push(`✓ Short: ${shortExchange} (${(shortFunding8h * 100).toFixed(4)}%)`);
  } else {
    reasons.push(`✗ ${rejectionReason}`);
  }
  
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
    isValid,
    rejectionReason,
  };
}

/**
 * Calculate unrealized PnL for a hedge position
 */
export function calculateUnrealizedPnL(
  entryLongPrice: number,
  entryShortPrice: number,
  currentLongPrice: number,
  currentShortPrice: number,
  hedgeSizeEur: number
): { pnlEur: number; pnlPercent: number; drift: number } {
  const legSize = hedgeSizeEur / 2;
  
  // Long position PnL = (current - entry) / entry
  const longPnlPercent = (currentLongPrice - entryLongPrice) / entryLongPrice;
  
  // Short position PnL = (entry - current) / entry
  const shortPnlPercent = (entryShortPrice - currentShortPrice) / entryShortPrice;
  
  // Long EUR PnL
  const longPnlEur = legSize * longPnlPercent;
  
  // Short EUR PnL
  const shortPnlEur = legSize * shortPnlPercent;
  
  // Combined PnL (delta-neutral should be ~0 from price moves)
  const totalPnlEur = longPnlEur + shortPnlEur;
  const totalPnlPercent = (totalPnlEur / hedgeSizeEur) * 100;
  
  // Drift = how much the position has deviated from delta-neutral
  // This is the key metric for LIVE - must stay under 0.6%
  const drift = Math.abs(longPnlPercent + shortPnlPercent) * 100;
  
  return {
    pnlEur: totalPnlEur,
    pnlPercent: totalPnlPercent,
    drift,
  };
}

/**
 * Calculate funding payment for a hedge position
 */
export function calculateFundingPayment(
  fundingRate: number,
  legSizeEur: number,
  isLong: boolean
): number {
  // Long pays funding when rate is positive, receives when negative
  // Short receives funding when rate is positive, pays when negative
  const direction = isLong ? -1 : 1;
  return legSizeEur * fundingRate * direction;
}

/**
 * Check if notional values match within tolerance
 */
export function checkNotionalMatch(
  longNotionalEur: number,
  shortNotionalEur: number,
  tolerancePercent: number = 1
): boolean {
  const avg = (longNotionalEur + shortNotionalEur) / 2;
  const diff = Math.abs(longNotionalEur - shortNotionalEur);
  const diffPercent = (diff / avg) * 100;
  return diffPercent <= tolerancePercent;
}

/**
 * Should exit position? Returns reason or null
 */
export function checkExitConditions(
  hoursHeld: number,
  intervalsCollected: number,
  pnlDrift: number,
  currentSpreadBps: number,
  entrySpreadBps: number,
  totalPnlPercent: number,
  expectedProfitPercent: number,
  config: {
    maxHoldingHours: number;
    holdingPeriodIntervals: number;
    pnlDriftLimitPercent: number;
    spreadCollapseThresholdBps: number;
    spreadSpikeThresholdBps: number;
    profitTargetPercent: number;
  },
  volatilityData?: { current: number; entry: number }
): string | null {
  // 1. Max holding time
  if (hoursHeld >= config.maxHoldingHours) {
    return `Max holding time (${config.maxHoldingHours}h) exceeded`;
  }
  
  // Only check other conditions after minimum holding
  if (intervalsCollected < config.holdingPeriodIntervals) {
    return null;
  }
  
  // 2. Profit target reached (60% of expected)
  if (expectedProfitPercent > 0) {
    const actualVsExpected = (totalPnlPercent / expectedProfitPercent) * 100;
    if (actualVsExpected >= config.profitTargetPercent) {
      return `Profit target reached (${actualVsExpected.toFixed(0)}% of expected)`;
    }
  }
  
  // 3. PnL drift (delta-neutral breakdown) - STRICT 0.6%
  if (pnlDrift > config.pnlDriftLimitPercent) {
    return `PnL drift ${pnlDrift.toFixed(2)}% > limit ${config.pnlDriftLimitPercent}%`;
  }
  
  // 4. Spread collapse
  if (currentSpreadBps < config.spreadCollapseThresholdBps) {
    return `Spread collapsed to ${currentSpreadBps.toFixed(1)}bps`;
  }
  
  // 5. Spread spike (liquidity deterioration)
  if (currentSpreadBps > config.spreadSpikeThresholdBps) {
    return `Spread spiked to ${currentSpreadBps.toFixed(1)}bps`;
  }
  
  // 6. Volatility spike check (2x increase triggers exit)
  if (volatilityData && volatilityData.entry > 0) {
    const volatilityRatio = volatilityData.current / volatilityData.entry;
    if (volatilityRatio > 2) {
      return `Volatility spike (${volatilityRatio.toFixed(1)}x increase)`;
    }
  }
  
  return null;
}
