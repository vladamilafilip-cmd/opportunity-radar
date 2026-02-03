// src/types/autopilot.ts - TypeScript types for LIVE Autopilot System

export type RiskTier = 'safe' | 'medium' | 'high';
export type AutopilotMode = 'off' | 'live' | 'dryrun';
export type PositionStatus = 'open' | 'closed' | 'stopped';
export type AuditLevel = 'info' | 'warn' | 'error' | 'action';
export type RiskLevel = 'normal' | 'cautious' | 'stopped';

// Exchange balance structure
export interface ExchangeBalance {
  code: string;
  name: string;
  allocation: number;      // Total allocated
  deployed: number;        // Currently deployed
  available: number;       // Available for new positions
  purpose: 'long' | 'short' | 'both';
}

// Hedge position (combines long + short legs)
export interface HedgePosition {
  id: string;
  hedgeId: string;         // Links both legs
  mode: AutopilotMode;
  symbol: string;
  symbolId: string | null;
  
  // Long leg
  longExchange: string;
  longMarketId: string | null;
  longEntryPrice: number;
  longCurrentPrice: number | null;
  
  // Short leg
  shortExchange: string;
  shortMarketId: string | null;
  shortEntryPrice: number;
  shortCurrentPrice: number | null;
  
  // Position info
  hedgeSizeEur: number;     // Total (both legs)
  legSizeEur: number;       // Per leg
  leverage: number;
  riskTier: RiskTier;
  
  // Timing
  entryTs: string;
  exitTs: string | null;
  
  // Funding & PnL
  entryFundingSpread8h: number;
  entryScore: number;
  fundingCollectedEur: number;
  intervalsCollected: number;
  unrealizedPnlEur: number;
  unrealizedPnlPercent: number;
  realizedPnlEur: number | null;
  realizedPnlPercent: number | null;
  
  // Status
  status: PositionStatus;
  exitReason: string | null;
  
  // Risk
  pnlDrift: number;        // Delta-neutral drift %
  riskSnapshot: Record<string, unknown>;
}

// Database types (raw from Supabase)
export interface AutopilotPosition {
  id: string;
  hedge_id: string | null;
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
  pnl_drift: number;
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
  dry_run_enabled: boolean;
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
  
  // Validation
  isValid: boolean;
  rejectionReason: string | null;
}

export interface BucketAllocation {
  safe: { current: number; max: number; percent: number };
  medium: { current: number; max: number; percent: number };
  high: { current: number; max: number; percent: number };
}

export interface RiskBudget {
  used: number;
  total: number;
  available: number;
  dailyDrawdown: number;
  stressTestExposure: number;
  riskLevel: RiskLevel;
  canOpenNew: boolean;
}

// Store state
export interface AutopilotStoreState {
  // State from DB
  mode: AutopilotMode;
  isRunning: boolean;
  dryRunEnabled: boolean;
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
  exchangeBalances: ExchangeBalance[];
  riskLevel: RiskLevel;
  
  // Stats
  todayPnl: number;
  weeklyPnl: number;
  
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
  setDryRun: (enabled: boolean) => Promise<void>;
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
