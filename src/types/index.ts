// Plan type - matches database plan_tier enum
export type Plan = 'free' | 'pro' | 'elite' | 'team';

// User & Auth Types
export interface User {
  id: string;
  email: string;
  name: string | null;
  plan: Plan;
  isAdmin: boolean;
  createdAt: string;
  isActive: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Funding Types
export interface FundingRate {
  exchange: string;
  symbol: string;
  fundingRate: number;
  nextFundingTime: string;
  riskTier: RiskTier;
}

export type RiskTier = 'safe' | 'medium' | 'high';

// Arbitrage Types
export interface FundingArbitrage {
  id: string;
  symbol: string;
  longExchange: string;
  shortExchange: string;
  longFundingRate: number;
  shortFundingRate: number;
  spread: number;
  score: number;
  riskTier: RiskTier;
}

export interface PriceArbitrage {
  id: string;
  symbol: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  spreadPercent: number;
  netAfterFees: number;
  score: number;
  riskTier: RiskTier;
}

// Opportunity Types
export interface Opportunity {
  id: string;
  symbol: string;
  type: 'funding' | 'price';
  score: number;
  riskTier: RiskTier;
  potentialReturn: number;
  exchanges: string[];
  description: string;
  updatedAt: string;
}

export interface OpportunityDetails extends Opportunity {
  priceHistory: PricePoint[];
  fundingHistory: FundingPoint[];
  exchangeComparison: ExchangeData[];
}

export interface PricePoint {
  timestamp: string;
  price: number;
}

export interface FundingPoint {
  timestamp: string;
  rate: number;
  exchange: string;
}

export interface ExchangeData {
  exchange: string;
  price: number;
  volume24h: number;
  fundingRate: number;
  openInterest: number;
}

// Paper Trading Types
export interface PaperPosition {
  id: string;
  symbol: string;
  longExchange: string;
  shortExchange: string;
  entryPrice: number;
  currentPrice: number;
  size: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  openedAt: string;
  status: 'open' | 'closed';
}

export interface PaperTrade {
  id: string;
  symbol: string;
  longExchange: string;
  shortExchange: string;
  entryPrice: number;
  exitPrice: number;
  size: number;
  realizedPnl: number;
  realizedPnlPercent: number;
  openedAt: string;
  closedAt: string;
}

export interface TradingStats {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  totalPnlPercent: number;
  bestTrade: number;
  worstTrade: number;
  averageTrade: number;
}

// Subscription Types
export interface PlanDetails {
  id: Plan;
  name: string;
  price: number;
  currency: string;
  features: string[];
  limitations?: string[];
  isPopular?: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// Admin Types
export interface AdminUser extends User {
  subscriptionStatus: 'active' | 'cancelled' | 'expired';
  lastLogin: string;
  totalTrades: number;
}
