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

// Helper functions
const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;
const randomRiskTier = (): RiskTier => {
  const rand = Math.random();
  if (rand < 0.4) return 'safe';
  if (rand < 0.75) return 'medium';
  return 'high';
};

// Exchanges
export const EXCHANGES = ['Binance', 'Bybit', 'OKX', 'Bitget', 'Gate.io', 'KuCoin'];
export const SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'DOGE/USDT', 'ARB/USDT', 'OP/USDT', 'AVAX/USDT', 'MATIC/USDT', 'LINK/USDT'];

// Mock Funding Rates
export const generateFundingRates = (): FundingRate[] => {
  const rates: FundingRate[] = [];
  
  EXCHANGES.forEach(exchange => {
    SYMBOLS.forEach(symbol => {
      const fundingRate = randomBetween(-0.05, 0.15);
      rates.push({
        exchange,
        symbol,
        fundingRate,
        nextFundingTime: new Date(Date.now() + randomBetween(1, 8) * 3600000).toISOString(),
        riskTier: Math.abs(fundingRate) > 0.1 ? 'high' : Math.abs(fundingRate) > 0.05 ? 'medium' : 'safe',
      });
    });
  });
  
  return rates.sort((a, b) => Math.abs(b.fundingRate) - Math.abs(a.fundingRate));
};

// Mock Funding Arbitrage
export const generateFundingArbitrage = (): FundingArbitrage[] => {
  const opportunities: FundingArbitrage[] = [];
  
  for (let i = 0; i < 15; i++) {
    const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const longExchange = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
    let shortExchange = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
    while (shortExchange === longExchange) {
      shortExchange = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
    }
    
    const longFundingRate = randomBetween(-0.08, 0.02);
    const shortFundingRate = randomBetween(0.02, 0.15);
    const spread = shortFundingRate - longFundingRate;
    
    opportunities.push({
      id: `fa-${i}`,
      symbol,
      longExchange,
      shortExchange,
      longFundingRate,
      shortFundingRate,
      spread,
      score: Math.round(spread * 1000 + randomBetween(0, 20)),
      riskTier: randomRiskTier(),
    });
  }
  
  return opportunities.sort((a, b) => b.score - a.score);
};

// Mock Price Arbitrage
export const generatePriceArbitrage = (): PriceArbitrage[] => {
  const opportunities: PriceArbitrage[] = [];
  
  for (let i = 0; i < 12; i++) {
    const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const buyExchange = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
    let sellExchange = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
    while (sellExchange === buyExchange) {
      sellExchange = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
    }
    
    const basePrice = symbol.includes('BTC') ? 65000 : symbol.includes('ETH') ? 3500 : randomBetween(1, 200);
    const buyPrice = basePrice * (1 - randomBetween(0.001, 0.01));
    const sellPrice = basePrice * (1 + randomBetween(0.001, 0.01));
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
      score: Math.round(netAfterFees * 100 + randomBetween(0, 15)),
    });
  }
  
  return opportunities.sort((a, b) => b.score - a.score);
};

// Mock Opportunities
export const generateOpportunities = (): Opportunity[] => {
  const fundingArbs = generateFundingArbitrage();
  const priceArbs = generatePriceArbitrage();
  
  const opportunities: Opportunity[] = [
    ...fundingArbs.slice(0, 8).map(fa => ({
      id: fa.id,
      symbol: fa.symbol,
      type: 'funding' as const,
      score: fa.score,
      riskTier: fa.riskTier,
      potentialReturn: fa.spread * 100,
      exchanges: [fa.longExchange, fa.shortExchange],
      description: `Funding rate arbitrage: Long on ${fa.longExchange}, Short on ${fa.shortExchange}`,
      updatedAt: new Date().toISOString(),
    })),
    ...priceArbs.slice(0, 6).map(pa => ({
      id: pa.id,
      symbol: pa.symbol,
      type: 'price' as const,
      score: pa.score,
      riskTier: randomRiskTier(),
      potentialReturn: pa.netAfterFees,
      exchanges: [pa.buyExchange, pa.sellExchange],
      description: `Price arbitrage: Buy on ${pa.buyExchange}, Sell on ${pa.sellExchange}`,
      updatedAt: new Date().toISOString(),
    })),
  ];
  
  return opportunities.sort((a, b) => b.score - a.score);
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
    openInterest: randomBetween(10000000, 200000000),
  }));
  
  return {
    ...opportunity,
    priceHistory,
    fundingHistory,
    exchangeComparison,
  };
};

// Mock Paper Positions
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
      openedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      status: 'open',
    },
    {
      id: 'pos-2',
      symbol: 'ETH/USDT',
      longExchange: 'OKX',
      shortExchange: 'Binance',
      entryPrice: 3450,
      currentPrice: 3420,
      size: 500,
      unrealizedPnl: -4.35,
      unrealizedPnlPercent: -0.87,
      openedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      status: 'open',
    },
  ];
};

// Mock Paper Trade History
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

// Plan Details
export const PLAN_DETAILS: PlanDetails[] = [
  {
    id: 'free',
    name: 'FREE',
    price: 0,
    currency: 'GBP',
    features: [
      'Funding radar only',
      'Limited refresh (5 min)',
      'First 50 users only',
    ],
    limitations: [
      'No arbitrage signals',
      'No paper trading',
    ],
  },
  {
    id: 'pro',
    name: 'PRO',
    price: 20,
    currency: 'GBP',
    features: [
      'Funding arbitrage signals',
      'Price arbitrage signals',
      'Paper trading simulator',
      '1 minute refresh',
      'Email support',
    ],
    isPopular: true,
  },
  {
    id: 'pro_plus',
    name: 'PRO+',
    price: 50,
    currency: 'GBP',
    features: [
      'Everything in PRO',
      'Real-time refresh',
      'Priority ranking',
      'Discord alerts',
      'Telegram alerts',
      'Priority support',
    ],
  },
  {
    id: 'full',
    name: 'FULL',
    price: 100,
    currency: 'GBP',
    features: [
      'Everything in PRO+',
      'API access',
      'Custom alerts',
      'White-label option',
      'Dedicated support',
    ],
  },
];

// Mock Admin Users
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
      plan: 'full',
      isAdmin: true,
      createdAt: new Date(Date.now() - 86400000 * 90).toISOString(),
      isActive: true,
      subscriptionStatus: 'active',
      lastLogin: new Date().toISOString(),
      totalTrades: 156,
    },
  ];
};
