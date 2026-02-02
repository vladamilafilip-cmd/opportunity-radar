// Exchange Funding Intervals (in hours)
export const EXCHANGE_FUNDING_INTERVALS: Record<string, number> = {
  // 8h Standard Funding
  'Binance': 8,
  'Bybit': 8,
  'OKX': 8,
  'Bitget': 8,
  'Gate.io': 8,
  'KuCoin': 8,
  'HTX': 8,
  'MEXC': 8,
  'Deribit': 8,
  
  // 4h Medium Funding
  'Kraken': 4,
  
  // 1h Fast Funding
  'dYdX': 1,
  'Hyperliquid': 1,
};

export type FundingIntervalType = '1h' | '4h' | '8h';

export interface FundingIntervalInfo {
  hours: number;
  type: FundingIntervalType;
  label: string;
  color: string;
  paymentsPerDay: number;
}

export const getFundingInterval = (exchange: string): number => {
  return EXCHANGE_FUNDING_INTERVALS[exchange] || 8;
};

export const getFundingIntervalInfo = (exchange: string): FundingIntervalInfo => {
  const hours = getFundingInterval(exchange);
  
  if (hours === 1) {
    return {
      hours: 1,
      type: '1h',
      label: 'Fast',
      color: 'text-success bg-success/10 border-success/20',
      paymentsPerDay: 24,
    };
  } else if (hours === 4) {
    return {
      hours: 4,
      type: '4h',
      label: 'Medium',
      color: 'text-warning bg-warning/10 border-warning/20',
      paymentsPerDay: 6,
    };
  } else {
    return {
      hours: 8,
      type: '8h',
      label: 'Standard',
      color: 'text-primary bg-primary/10 border-primary/20',
      paymentsPerDay: 3,
    };
  }
};

/**
 * Calculate APR from spread percentage and funding interval
 * @param spreadPercent - Spread per funding interval (e.g., 0.60 for 0.60%)
 * @param intervalHours - Funding interval in hours (1, 4, or 8)
 * @returns APR as a percentage (e.g., 657 for 657%)
 */
export const calculateAPR = (spreadPercent: number, intervalHours: number = 8): number => {
  const intervalsPerYear = (365 * 24) / intervalHours;
  return spreadPercent * intervalsPerYear;
};

/**
 * Calculate net profit after fees
 * @param grossSpreadPercent - Gross spread percentage
 * @param positionSize - Position size in USD
 * @param takerFeeBps - Taker fee in basis points (default 4 bps per side = 8 total)
 * @param slippageBps - Slippage in basis points (default 2 bps)
 * @returns Net profit in USD
 */
export const calculateNetProfit = (
  grossSpreadPercent: number,
  positionSize: number,
  takerFeeBps: number = 8, // 4 bps per side × 2 sides
  slippageBps: number = 2
): { gross: number; fees: number; slippage: number; net: number } => {
  const gross = positionSize * (grossSpreadPercent / 100);
  const fees = positionSize * (takerFeeBps / 10000);
  const slippage = positionSize * (slippageBps / 10000);
  const net = gross - fees - slippage;
  
  return { gross, fees, slippage, net };
};

/**
 * Get next funding time for an exchange
 * Standard funding times are 00:00, 08:00, 16:00 UTC for 8h
 * 00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC for 4h
 * Every hour for 1h
 */
export const getNextFundingTime = (exchange: string): Date => {
  const interval = getFundingInterval(exchange);
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  
  // Calculate next funding hour
  const currentHourDecimal = utcHours + utcMinutes / 60;
  const nextInterval = Math.ceil(currentHourDecimal / interval) * interval;
  
  // Create next funding date
  const nextFunding = new Date(now);
  nextFunding.setUTCHours(nextInterval % 24, 0, 0, 0);
  
  // If we've passed today's intervals, go to tomorrow
  if (nextInterval >= 24 || (nextInterval === utcHours && utcMinutes > 0)) {
    nextFunding.setUTCDate(nextFunding.getUTCDate() + (nextInterval >= 24 ? 1 : 0));
    nextFunding.setUTCHours(nextInterval % 24, 0, 0, 0);
  }
  
  return nextFunding;
};

/**
 * Format time remaining until next funding
 */
export const formatTimeUntilFunding = (targetDate: Date): string => {
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  
  if (diffMs <= 0) return '00:00';
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  
  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  } else {
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  }
};

/**
 * Calculate how many funding payments have occurred since a position was opened
 */
export const calculateFundingPayments = (
  openedAt: string,
  longExchange: string,
  shortExchange: string
): { longPayments: number; shortPayments: number; totalPayments: number } => {
  const hoursOpen = (Date.now() - new Date(openedAt).getTime()) / (1000 * 60 * 60);
  
  const longInterval = getFundingInterval(longExchange);
  const shortInterval = getFundingInterval(shortExchange);
  
  const longPayments = Math.floor(hoursOpen / longInterval);
  const shortPayments = Math.floor(hoursOpen / shortInterval);
  
  return {
    longPayments,
    shortPayments,
    totalPayments: longPayments + shortPayments,
  };
};

/**
 * Simulate funding collected based on position and time
 * @returns Estimated funding collected in USD
 */
export const simulateFundingCollected = (
  positionSize: number,
  openedAt: string,
  longExchange: string,
  shortExchange: string,
  spreadPercent: number = 0.1 // Average spread per interval
): number => {
  const { totalPayments } = calculateFundingPayments(openedAt, longExchange, shortExchange);
  
  // Each payment collects approximately spreadPercent / 2 per side
  return totalPayments * positionSize * (spreadPercent / 100 / 2);
};

/**
 * Format duration since position opened
 */
export const formatDurationSinceOpen = (openedAt: string): string => {
  const now = new Date();
  const opened = new Date(openedAt);
  const diffMs = now.getTime() - opened.getTime();
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

/**
 * Estimate daily income from a position
 */
export const estimateDailyIncome = (
  positionSize: number,
  spreadPercent: number,
  longExchange: string,
  shortExchange: string
): number => {
  const longInterval = getFundingInterval(longExchange);
  const shortInterval = getFundingInterval(shortExchange);
  
  // Use the shorter interval for more frequent payments
  const minInterval = Math.min(longInterval, shortInterval);
  const paymentsPerDay = 24 / minInterval;
  
  // Each payment collects approximately spreadPercent / 2
  return paymentsPerDay * positionSize * (spreadPercent / 100 / 2);
};
