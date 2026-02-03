// worker/src/config/exchangeBalances.ts
// Per-exchange allocation configuration for LIVE trading

export interface ExchangeConfig {
  code: string;
  name: string;
  allocation: number;        // EUR allocated
  purpose: 'long' | 'short' | 'both';
  fundingInterval: number;   // hours
  takerFeeBps: number;       // Exchange-specific fee
  makerFeeBps: number;
  apiSupported: boolean;     // Whether CCXT adapter exists
  testnetAvailable: boolean;
}

export const exchangeConfigs: ExchangeConfig[] = [
  {
    code: 'hyperliquid',
    name: 'Hyperliquid',
    allocation: 60,
    purpose: 'short',
    fundingInterval: 1,
    takerFeeBps: 3.5,
    makerFeeBps: 0.2,
    apiSupported: true,
    testnetAvailable: true,
  },
  {
    code: 'binance',
    name: 'Binance',
    allocation: 40,
    purpose: 'long',
    fundingInterval: 8,
    takerFeeBps: 4,
    makerFeeBps: 2,
    apiSupported: true,
    testnetAvailable: true,
  },
  {
    code: 'bybit',
    name: 'Bybit',
    allocation: 30,
    purpose: 'both',
    fundingInterval: 8,
    takerFeeBps: 5.5,
    makerFeeBps: 2,
    apiSupported: true,
    testnetAvailable: true,
  },
  {
    code: 'okx',
    name: 'OKX',
    allocation: 30,
    purpose: 'both',
    fundingInterval: 8,
    takerFeeBps: 5,
    makerFeeBps: 2,
    apiSupported: true,
    testnetAvailable: true,
  },
  {
    code: 'dydx',
    name: 'dYdX',
    allocation: 20,
    purpose: 'short',
    fundingInterval: 1,
    takerFeeBps: 5,
    makerFeeBps: 2,
    apiSupported: true,
    testnetAvailable: true,
  },
  {
    code: 'kucoin',
    name: 'KuCoin',
    allocation: 20,
    purpose: 'long',
    fundingInterval: 8,
    takerFeeBps: 6,
    makerFeeBps: 2,
    apiSupported: true,
    testnetAvailable: false,
  },
];

export function getExchangeConfig(code: string): ExchangeConfig | undefined {
  return exchangeConfigs.find(e => e.code.toLowerCase() === code.toLowerCase());
}

export function getAllowedExchanges(): string[] {
  return exchangeConfigs.map(e => e.code);
}

export function getTotalAllocation(): number {
  return exchangeConfigs.reduce((sum, e) => sum + e.allocation, 0);
}

export function getExchangesByPurpose(purpose: 'long' | 'short' | 'both'): ExchangeConfig[] {
  return exchangeConfigs.filter(e => e.purpose === purpose || e.purpose === 'both');
}

export function isValidHedgePair(longExchange: string, shortExchange: string): boolean {
  const longConfig = getExchangeConfig(longExchange);
  const shortConfig = getExchangeConfig(shortExchange);
  
  if (!longConfig || !shortConfig) return false;
  if (longExchange.toLowerCase() === shortExchange.toLowerCase()) return false;
  
  // Long exchange must support long positions
  if (longConfig.purpose !== 'long' && longConfig.purpose !== 'both') return false;
  
  // Short exchange must support short positions
  if (shortConfig.purpose !== 'short' && shortConfig.purpose !== 'both') return false;
  
  return true;
}

export function getEffectiveFeeBps(longExchange: string, shortExchange: string): number {
  const longConfig = getExchangeConfig(longExchange);
  const shortConfig = getExchangeConfig(shortExchange);
  
  if (!longConfig || !shortConfig) return 16; // Conservative default
  
  // Both sides use taker fees for market orders
  return longConfig.takerFeeBps + shortConfig.takerFeeBps;
}
