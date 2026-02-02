import type {
  FundingRate,
  FundingArbitrage,
  PriceArbitrage,
  Opportunity,
  OpportunityDetails,
  PaperPosition,
  PaperTrade,
  TradingStats,
  PlanDetails,
  AdminUser,
  RiskTier,
} from '@/types';

import { calculateAPR, getNextFundingTime } from './fundingUtils';
const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;
const randomRiskTier = (): RiskTier => {
  const rand = Math.random();
  if (rand < 0.4) return 'safe';
  if (rand < 0.75) return 'medium';
  return 'high';
};

// Exchanges with funding intervals (hours)
export const EXCHANGES = ['Binance', 'Bybit', 'OKX', 'Bitget', 'Gate.io', 'KuCoin', 'MEXC', 'Huobi', 'Kraken', 'Deribit', 'dYdX', 'Hyperliquid'];

export const EXCHANGE_FUNDING_INTERVALS: Record<string, number> = {
  'Binance': 8,
  'Bybit': 8,
  'OKX': 8,
  'Bitget': 8,
  'Gate.io': 8,
  'KuCoin': 8,
  'MEXC': 8,
  'Huobi': 8,
  'HTX': 8,
  'Kraken': 4,
  'Deribit': 8,
  'dYdX': 1,
  'Hyperliquid': 1,
  'BitMEX': 8,
};

// Get funding interval for exchange (default 8h)
export const getFundingInterval = (exchange: string): number => {
  return EXCHANGE_FUNDING_INTERVALS[exchange] ?? 8;
};

// Normalize any funding rate to 8h equivalent
export const normalizeTo8h = (rate: number, intervalHours: number): number => {
  if (intervalHours <= 0) return 0;
  return rate * (8 / intervalHours);
};

// ==================== SYMBOLS BY RISK TIER ====================

// TIER 1: SAFE - Blue chip, high liquidity, stable
export const SAFE_SYMBOLS = [
  'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'BNB/USDT',
  'LTC/USDT', 'ADA/USDT', 'AVAX/USDT', 'LINK/USDT', 'DOT/USDT'
];

// TIER 2: MEDIUM - Established altcoins, moderate risk
export const MEDIUM_SYMBOLS = [
  // Layer 2 & Infrastructure
  'ARB/USDT', 'OP/USDT', 'SUI/USDT', 'APT/USDT', 'INJ/USDT',
  'SEI/USDT', 'TIA/USDT', 'JUP/USDT', 'NEAR/USDT', 'ATOM/USDT',
  // DeFi Blue Chips
  'UNI/USDT', 'AAVE/USDT', 'FIL/USDT', 'ICP/USDT', 'MKR/USDT',
  'LDO/USDT', 'FTM/USDT', 'CRV/USDT', 'SNX/USDT', 'RUNE/USDT',
  // Other Established
  'ALGO/USDT', 'EOS/USDT', 'HBAR/USDT', 'VET/USDT', 'XLM/USDT'
];

// TIER 3: HIGH RISK - Gaming, newer DeFi, volatile
export const HIGH_RISK_ALTCOINS = [
  // Gaming & Metaverse
  'AXS/USDT', 'GALA/USDT', 'IMX/USDT', 'GMT/USDT', 'ENJ/USDT',
  'SAND/USDT', 'MANA/USDT', 'BLUR/USDT', 'PIXEL/USDT', 'PORTAL/USDT',
  // DeFi & Infrastructure
  'DYDX/USDT', 'GMX/USDT', 'LRC/USDT', 'ENS/USDT', 'KAVA/USDT',
  'PENDLE/USDT', 'STX/USDT', 'WLD/USDT', 'STRK/USDT', 'ONDO/USDT',
  // AI & Emerging
  'FET/USDT', 'RNDR/USDT', 'TAO/USDT', 'OCEAN/USDT', 'ARKM/USDT'
];

// TIER 4: EXTREME RISK - Meme coins (SPECIAL WARNING!)
export const MEME_COINS = [
  // Classic Memes
  'DOGE/USDT', 'SHIB/USDT', 'PEPE/USDT', 'FLOKI/USDT', 'BONK/USDT',
  // Solana Memes
  'WIF/USDT', 'BOME/USDT', 'SLERF/USDT', 'MYRO/USDT', 'PONKE/USDT',
  'POPCAT/USDT', 'BOOK/USDT', 'MICHI/USDT', 'GOAT/USDT', 'FWOG/USDT',
  // Newer Memes
  'MEME/USDT', 'TURBO/USDT', 'BRETT/USDT', 'MOG/USDT', 'NEIRO/USDT',
  'SUNDOG/USDT', 'GIGA/USDT', 'SPX/USDT', 'MOODENG/USDT', 'PNUT/USDT',
  // More Memes
  'ACT/USDT', 'LUCE/USDT', 'CHILLGUY/USDT', 'HIPPO/USDT', 'COQ/USDT',
  'TOSHI/USDT', 'BABYDOGE/USDT', 'ELON/USDT', 'LADYS/USDT', 'AIDOGE/USDT'
];

// Combined high risk (altcoins + memes)
export const HIGH_RISK_SYMBOLS = [...HIGH_RISK_ALTCOINS, ...MEME_COINS];

// All symbols combined (100+ total)
export const SYMBOLS = [...SAFE_SYMBOLS, ...MEDIUM_SYMBOLS, ...HIGH_RISK_SYMBOLS];

// Volatility multipliers by symbol type
export const VOLATILITY_MULTIPLIERS: Record<string, number> = {
  // Meme coins have highest volatility
  ...Object.fromEntries(MEME_COINS.map(s => [s, 3.0])),
  // High risk altcoins
  ...Object.fromEntries(HIGH_RISK_ALTCOINS.map(s => [s, 2.0])),
  // Medium risk
  ...Object.fromEntries(MEDIUM_SYMBOLS.map(s => [s, 1.5])),
  // Safe
  ...Object.fromEntries(SAFE_SYMBOLS.map(s => [s, 1.0])),
};

// Check if symbol is a meme coin
export const isMemeCoin = (symbol: string): boolean => {
  return MEME_COINS.includes(symbol);
};

// Get volatility multiplier for symbol
export const getVolatilityMultiplier = (symbol: string): number => {
  return VOLATILITY_MULTIPLIERS[symbol] ?? 1.5;
};

// Symbol risk mapping helper
export const getSymbolRiskLevel = (symbol: string): RiskTier => {
  if (MEME_COINS.includes(symbol) || HIGH_RISK_ALTCOINS.includes(symbol)) return 'high';
  if (MEDIUM_SYMBOLS.includes(symbol)) return 'medium';
  return 'safe';
};

// Get symbol tier (1-4)
export const getSymbolTier = (symbol: string): number => {
  if (SAFE_SYMBOLS.includes(symbol)) return 1;
  if (MEDIUM_SYMBOLS.includes(symbol)) return 2;
  if (HIGH_RISK_ALTCOINS.includes(symbol)) return 3;
  if (MEME_COINS.includes(symbol)) return 4;
  return 3; // Default to tier 3
};

// Mock Funding Rates - different ranges based on symbol risk
export const generateFundingRates = (): FundingRate[] => {
  const rates: FundingRate[] = [];
  
  EXCHANGES.forEach(exchange => {
    const interval = getFundingInterval(exchange);
    
    SYMBOLS.forEach(symbol => {
      const symbolRisk = getSymbolRiskLevel(symbol);
      const isMeme = isMemeCoin(symbol);
      
      // Higher risk coins have more extreme funding rates
      let fundingRate: number;
      if (isMeme) {
        fundingRate = randomBetween(-0.25, 0.50); // Memes: extreme swings
      } else if (symbolRisk === 'high') {
        fundingRate = randomBetween(-0.15, 0.35); // High risk: wild swings
      } else if (symbolRisk === 'medium') {
        fundingRate = randomBetween(-0.08, 0.20); // Altcoins: moderate
      } else {
        fundingRate = randomBetween(-0.03, 0.10); // Safe: stable
      }
      
      rates.push({
        exchange,
        symbol,
        fundingRate,
        fundingInterval: interval,
        fundingRate8hEquiv: normalizeTo8h(fundingRate, interval),
        nextFundingTime: new Date(Date.now() + randomBetween(0.5, interval) * 3600000).toISOString(),
        riskTier: symbolRisk,
        isMeme,
        volatilityMultiplier: getVolatilityMultiplier(symbol),
      });
    });
  });
  
  return rates.sort((a, b) => Math.abs(b.fundingRate) - Math.abs(a.fundingRate));
};

// Mock Funding Arbitrage - higher spreads for riskier coins
export const generateFundingArbitrage = (): FundingArbitrage[] => {
  const opportunities: FundingArbitrage[] = [];
  
  // Generate 200 opportunities - 70% high-risk, 20% medium, 10% safe
  for (let i = 0; i < 200; i++) {
    // Prioritize high-risk symbols (70% chance)
    const rand = Math.random();
    let symbol: string;
    if (rand < 0.70) {
      symbol = HIGH_RISK_SYMBOLS[Math.floor(Math.random() * HIGH_RISK_SYMBOLS.length)];
    } else if (rand < 0.90) {
      symbol = MEDIUM_SYMBOLS[Math.floor(Math.random() * MEDIUM_SYMBOLS.length)];
    } else {
      symbol = SAFE_SYMBOLS[Math.floor(Math.random() * SAFE_SYMBOLS.length)];
    }
    
    const symbolRisk = getSymbolRiskLevel(symbol);
    const isMeme = isMemeCoin(symbol);
    
    const longExchange = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
    let shortExchange = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
    while (shortExchange === longExchange) {
      shortExchange = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
    }
    
    const longInterval = getFundingInterval(longExchange);
    const shortInterval = getFundingInterval(shortExchange);
    
    // EXTREME spreads for meme coins - up to 1.3% per 8h (~60% APR!)
    let longFundingRate: number, shortFundingRate: number;
    if (isMeme) {
      longFundingRate = randomBetween(-0.50, 0.10);
      shortFundingRate = randomBetween(0.25, 0.80);
    } else if (symbolRisk === 'high') {
      longFundingRate = randomBetween(-0.30, 0.05);
      shortFundingRate = randomBetween(0.15, 0.50);
    } else if (symbolRisk === 'medium') {
      longFundingRate = randomBetween(-0.15, 0.02);
      shortFundingRate = randomBetween(0.08, 0.25);
    } else {
      longFundingRate = randomBetween(-0.05, 0.01);
      shortFundingRate = randomBetween(0.02, 0.10);
    }
    
    // Normalize to 8h for comparison
    const long8h = normalizeTo8h(longFundingRate, longInterval);
    const short8h = normalizeTo8h(shortFundingRate, shortInterval);
    const spread = short8h - long8h;
    
    // Calculate APR and net profit
    const minInterval = Math.min(longInterval, shortInterval);
    const apr = calculateAPR(spread, minInterval);
    const netProfitPer8h = spread * 10000 / 100; // For $10,000 position
    const totalFeeBps = 8; // 4 bps per side
    
    // Get next funding time (use shorter interval exchange)
    const nextExchange = longInterval <= shortInterval ? longExchange : shortExchange;
    const nextFundingTime = getNextFundingTime(nextExchange).toISOString();
    
    opportunities.push({
      id: `fa-${i}`,
      symbol,
      longExchange,
      shortExchange,
      longFundingRate,
      shortFundingRate,
      longFundingInterval: longInterval,
      shortFundingInterval: shortInterval,
      longFunding8h: long8h,
      shortFunding8h: short8h,
      spread,
      score: Math.round(spread * 1000 + randomBetween(0, 50)),
      riskTier: symbolRisk,
      isMeme,
      volatilityMultiplier: getVolatilityMultiplier(symbol),
      // Enhanced fields
      apr,
      netProfitPer8h,
      nextFundingTime,
      totalFeeBps,
    });
  }
  
  return opportunities.sort((a, b) => b.score - a.score);
};

// Mock Price Arbitrage - EXTREME spreads for volatile/shitcoins
export const generatePriceArbitrage = (): PriceArbitrage[] => {
  const opportunities: PriceArbitrage[] = [];
  
  // 150 opportunities - 70% high-risk, 20% medium, 10% safe
  for (let i = 0; i < 150; i++) {
    // Prioritize high-risk symbols (70% chance)
    const rand = Math.random();
    let symbol: string;
    if (rand < 0.70) {
      symbol = HIGH_RISK_SYMBOLS[Math.floor(Math.random() * HIGH_RISK_SYMBOLS.length)];
    } else if (rand < 0.90) {
      symbol = MEDIUM_SYMBOLS[Math.floor(Math.random() * MEDIUM_SYMBOLS.length)];
    } else {
      symbol = SAFE_SYMBOLS[Math.floor(Math.random() * SAFE_SYMBOLS.length)];
    }
    
    const symbolRisk = getSymbolRiskLevel(symbol);
    const isMeme = isMemeCoin(symbol);
    
    const buyExchange = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
    let sellExchange = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
    while (sellExchange === buyExchange) {
      sellExchange = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
    }
    
    // Base prices based on coin type
    let basePrice: number;
    if (symbol.includes('BTC')) basePrice = 65000;
    else if (symbol.includes('ETH')) basePrice = 3500;
    else if (symbol.includes('SOL')) basePrice = 150;
    else if (symbol.includes('BNB')) basePrice = 600;
    else if (isMeme) basePrice = randomBetween(0.000001, 0.01);
    else if (symbolRisk === 'high') basePrice = randomBetween(0.01, 10);
    else if (symbolRisk === 'medium') basePrice = randomBetween(1, 50);
    else basePrice = randomBetween(5, 200);
    
    // EXTREME spreads - up to 12% for memes!
    let spreadMultiplier: number;
    if (isMeme) {
      spreadMultiplier = randomBetween(0.02, 0.12); // 2% - 12% spreads!
    } else if (symbolRisk === 'high') {
      spreadMultiplier = randomBetween(0.01, 0.08); // 1% - 8%
    } else if (symbolRisk === 'medium') {
      spreadMultiplier = randomBetween(0.005, 0.04); // 0.5% - 4%
    } else {
      spreadMultiplier = randomBetween(0.001, 0.015); // 0.1% - 1.5%
    }
    
    const buyPrice = basePrice * (1 - spreadMultiplier);
    const sellPrice = basePrice * (1 + spreadMultiplier);
    const spreadPercent = ((sellPrice - buyPrice) / buyPrice) * 100;
    const fees = 0.1; // 0.1% per trade
    const netAfterFees = spreadPercent - (fees * 2);
    
    opportunities.push({
      id: `pa-${i}`,
      symbol,
      buyExchange,
      sellExchange,
      buyPrice,
      sellPrice,
      spreadPercent,
      netAfterFees,
      score: Math.round(netAfterFees * 100 + randomBetween(0, 30)),
      riskTier: symbolRisk,
      isMeme,
      volatilityMultiplier: getVolatilityMultiplier(symbol),
    });
  }
  
  return opportunities.sort((a, b) => b.score - a.score);
};

// Mock Opportunities - 50 total, sorted by highest return
export const generateOpportunities = (): Opportunity[] => {
  const fundingArbs = generateFundingArbitrage();
  const priceArbs = generatePriceArbitrage();
  
  const opportunities: Opportunity[] = [
    ...fundingArbs.slice(0, 30).map(fa => ({
      id: fa.id,
      symbol: fa.symbol,
      type: 'funding' as const,
      score: fa.score,
      riskTier: fa.riskTier,
      potentialReturn: fa.spread * 100,
      exchanges: [fa.longExchange, fa.shortExchange],
      description: `Funding rate arbitrage: Long on ${fa.longExchange}, Short on ${fa.shortExchange}`,
      updatedAt: new Date().toISOString(),
      isMeme: fa.isMeme,
      volatilityMultiplier: fa.volatilityMultiplier,
    })),
    ...priceArbs.slice(0, 20).map(pa => ({
      id: pa.id,
      symbol: pa.symbol,
      type: 'price' as const,
      score: pa.score,
      riskTier: pa.riskTier,
      potentialReturn: pa.netAfterFees,
      exchanges: [pa.buyExchange, pa.sellExchange],
      description: `Price arbitrage: Buy on ${pa.buyExchange}, Sell on ${pa.sellExchange}`,
      updatedAt: new Date().toISOString(),
      isMeme: pa.isMeme,
      volatilityMultiplier: pa.volatilityMultiplier,
    })),
  ];
  
  // Sort by potential return (highest first)
  return opportunities.sort((a, b) => b.potentialReturn - a.potentialReturn);
};

// Mock Opportunity Details
export const generateOpportunityDetails = (id: string): OpportunityDetails => {
  const opportunity = generateOpportunities().find(o => o.id === id) || generateOpportunities()[0];
  
  // Generate price history
  const priceHistory = [];
  let price = opportunity.symbol.includes('BTC') ? 65000 : opportunity.symbol.includes('ETH') ? 3500 : 100;
  for (let i = 24; i >= 0; i--) {
    price = price * (1 + randomBetween(-0.02, 0.02));
    priceHistory.push({
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      price,
    });
  }
  
  // Generate funding history
  const fundingHistory = [];
  for (let i = 7; i >= 0; i--) {
    opportunity.exchanges.forEach(exchange => {
      fundingHistory.push({
        timestamp: new Date(Date.now() - i * 8 * 3600000).toISOString(),
        rate: randomBetween(-0.05, 0.1),
        exchange,
      });
    });
  }
  
  // Exchange comparison
  const exchangeComparison = opportunity.exchanges.map(exchange => ({
    exchange,
    price: price * (1 + randomBetween(-0.005, 0.005)),
    volume24h: randomBetween(1000000, 50000000),
    fundingRate: randomBetween(-0.05, 0.1),
    fundingInterval: getFundingInterval(exchange),
    openInterest: randomBetween(10000000, 200000000),
  }));
  
  return {
    ...opportunity,
    priceHistory,
    fundingHistory,
    exchangeComparison,
  };
};

// Mock Paper Positions with enhanced tracking
export const generatePaperPositions = (): PaperPosition[] => {
  return [
    {
      id: 'pos-1',
      symbol: 'BTC/USDT',
      longExchange: 'Binance',
      shortExchange: 'Bybit',
      entryPrice: 64500,
      currentPrice: 65200,
      size: 1000,
      unrealizedPnl: 10.85,
      unrealizedPnlPercent: 1.085,
      openedAt: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 hours ago
      status: 'open',
      fundingCollected: 8.50,
      longFundingInterval: 8,
      shortFundingInterval: 8,
      spreadPercent: 0.15,
    },
    {
      id: 'pos-2',
      symbol: 'ETH/USDT',
      longExchange: 'OKX',
      shortExchange: 'dYdX',
      entryPrice: 3450,
      currentPrice: 3420,
      size: 500,
      unrealizedPnl: -4.35,
      unrealizedPnlPercent: -0.87,
      openedAt: new Date(Date.now() - 3600000 * 12).toISOString(), // 12 hours ago
      status: 'open',
      fundingCollected: 15.25,
      longFundingInterval: 8,
      shortFundingInterval: 1,
      spreadPercent: 0.22,
    },
    {
      id: 'pos-3',
      symbol: 'PEPE/USDT',
      longExchange: 'Hyperliquid',
      shortExchange: 'Binance',
      entryPrice: 0.0000089,
      currentPrice: 0.0000092,
      size: 250,
      unrealizedPnl: 8.43,
      unrealizedPnlPercent: 3.37,
      openedAt: new Date(Date.now() - 3600000 * 3).toISOString(), // 3 hours ago
      status: 'open',
      fundingCollected: 4.80,
      longFundingInterval: 1,
      shortFundingInterval: 8,
      spreadPercent: 0.45,
    },
  ];
};

// Mock Paper Trade History with enhanced tracking
export const generatePaperTrades = (): PaperTrade[] => {
  return [
    {
      id: 'trade-1',
      symbol: 'SOL/USDT',
      longExchange: 'Bybit',
      shortExchange: 'OKX',
      entryPrice: 145.5,
      exitPrice: 148.2,
      size: 300,
      realizedPnl: 5.57,
      realizedPnlPercent: 1.86,
      openedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      closedAt: new Date(Date.now() - 86400000).toISOString(),
      fundingCollected: 3.25,
      totalIntervals: 6,
    },
    {
      id: 'trade-2',
      symbol: 'XRP/USDT',
      longExchange: 'Binance',
      shortExchange: 'Gate.io',
      entryPrice: 0.52,
      exitPrice: 0.515,
      size: 200,
      realizedPnl: -1.92,
      realizedPnlPercent: -0.96,
      openedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      closedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      fundingCollected: 1.80,
      totalIntervals: 4,
    },
    {
      id: 'trade-3',
      symbol: 'DOGE/USDT',
      longExchange: 'Hyperliquid',
      shortExchange: 'Bybit',
      entryPrice: 0.128,
      exitPrice: 0.135,
      size: 400,
      realizedPnl: 21.88,
      realizedPnlPercent: 5.47,
      openedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      closedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      fundingCollected: 12.40,
      totalIntervals: 18,
    },
  ];
};

// Mock Trading Stats
export const generateTradingStats = (): TradingStats => {
  return {
    totalTrades: 23,
    winRate: 65.2,
    totalPnl: 127.45,
    totalPnlPercent: 6.37,
    bestTrade: 45.30,
    worstTrade: -18.50,
    averageTrade: 5.54,
  };
};

// Plan Details - Single FREE plan with ALL features unlocked
export const PLAN_DETAILS: PlanDetails[] = [
  {
    id: 'free',
    name: 'FREE',
    price: 0,
    currency: 'GBP',
    features: [
      'Real-time data refresh',
      'Funding rate radar',
      'Funding arbitrage signals',
      'Price arbitrage signals',
      'Paper trading (educational)',
      '100+ trading pairs',
      '40+ meme coins',
      'Discord & Telegram alerts',
      'API access',
      'Priority support',
    ],
  },
];

// Mock Admin Users - matching database plan_tier enum
export const generateAdminUsers = (): AdminUser[] => {
  return [
    {
      id: 'user-1',
      email: 'john@example.com',
      name: 'John Doe',
      plan: 'pro',
      isAdmin: false,
      createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
      isActive: true,
      subscriptionStatus: 'active',
      lastLogin: new Date(Date.now() - 3600000).toISOString(),
      totalTrades: 45,
    },
    {
      id: 'user-2',
      email: 'jane@example.com',
      name: 'Jane Smith',
      plan: 'free',
      isAdmin: false,
      createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
      isActive: true,
      subscriptionStatus: 'active',
      lastLogin: new Date(Date.now() - 86400000).toISOString(),
      totalTrades: 12,
    },
    {
      id: 'user-3',
      email: 'admin@iq200.com',
      name: 'Admin User',
      plan: 'team',
      isAdmin: true,
      createdAt: new Date(Date.now() - 86400000 * 90).toISOString(),
      isActive: true,
      subscriptionStatus: 'active',
      lastLogin: new Date().toISOString(),
      totalTrades: 156,
    },
  ];
};
