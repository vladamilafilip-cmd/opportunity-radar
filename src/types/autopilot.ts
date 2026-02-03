// src/types/autopilot.ts - TypeScript types for Autopilot System

export type RiskTier = 'safe' | 'medium' | 'high';
export type AutopilotMode = 'off' | 'paper' | 'live';
export type PositionStatus = 'open' | 'closed' | 'stopped';
export type AuditLevel = 'info' | 'warn' | 'error' | 'action';

// Database types
export interface AutopilotPosition {
  id: string;
  mode: AutopilotMode;
  symbol: string;
  symbol_id: string | null;
  long_exchange: string;
  short_exchange: string;
  long_market_id: string | null;
  short_market_id: string | null;
  size_eur: number;
  leverage: number;
  risk_tier: RiskTier;
  entry_ts: string;
  entry_long_price: number;
  entry_short_price: number;
  entry_funding_spread_8h: number;
  entry_score: number;
  current_long_price: number | null;
  current_short_price: number | null;
  funding_collected_eur: number;
  intervals_collected: number;
  unrealized_pnl_eur: number;
  unrealized_pnl_percent: number;
  exit_ts: string | null;
  exit_long_price: number | null;
  exit_short_price: number | null;
  realized_pnl_eur: number | null;
  realized_pnl_percent: number | null;
  exit_reason: string | null;
  status: PositionStatus;
  risk_snapshot: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AutopilotAuditLog {
  id: string;
  ts: string;
  level: AuditLevel;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface AutopilotState {
  id: string;
  mode: AutopilotMode;
  is_running: boolean;
  last_scan_ts: string | null;
  last_trade_ts: string | null;
  total_realized_pnl_eur: number;
  total_funding_collected_eur: number;
  daily_drawdown_eur: number;
  kill_switch_active: boolean;
  kill_switch_reason: string | null;
  config_snapshot: Record<string, unknown>;
  updated_at: string;
}

// Computed types for UI
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

export interface BucketAllocation {
  safe: { current: number; max: number; percent: number };
  medium: { current: number; max: number; percent: number };
  high: { current: number; max: number; percent: number };
}

export interface RiskBudget {
  used: number;
  total: number;
  dailyDrawdown: number;
  stressTestExposure: number;
}

// Store state
export interface AutopilotStoreState {
  // State from DB
  mode: AutopilotMode;
  isRunning: boolean;
  killSwitchActive: boolean;
  killSwitchReason: string | null;
  lastScanTs: string | null;
  lastTradeTs: string | null;
  totalRealizedPnl: number;
  totalFundingCollected: number;
  dailyDrawdown: number;
  
  // Computed
  positions: AutopilotPosition[];
  auditLogs: AutopilotAuditLog[];
  bucketAllocation: BucketAllocation;
  riskBudget: RiskBudget;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
}

export interface AutopilotStoreActions {
  // Fetch data
  fetchState: () => Promise<void>;
  fetchPositions: () => Promise<void>;
  fetchAuditLogs: (limit?: number) => Promise<void>;
  
  // Control actions
  setMode: (mode: AutopilotMode) => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  stopAll: () => Promise<void>;
  closePosition: (positionId: string, reason: string) => Promise<void>;
  resetKillSwitch: () => Promise<void>;
  
  // Subscriptions
  subscribeToState: () => () => void;
  subscribeToPositions: () => () => void;
}

export type AutopilotStore = AutopilotStoreState & AutopilotStoreActions;
