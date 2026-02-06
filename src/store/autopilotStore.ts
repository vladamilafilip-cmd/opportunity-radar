// src/store/autopilotStore.ts - Zustand store for LIVE Autopilot state

import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { 
  AutopilotStore, 
  AutopilotPosition, 
  AutopilotAuditLog, 
  AutopilotState,
  AutopilotMode,
  BucketAllocation,
  RiskBudget,
  ExchangeBalance,
  RiskLevel
} from '@/types/autopilot';
import { autopilotConfig, getRiskLevel, canOpenNewHedge } from '../../config/autopilot';

const defaultBucketAllocation: BucketAllocation = {
  safe: { current: 0, max: autopilotConfig.buckets.safe.maxPositions, percent: 0 },
  medium: { current: 0, max: autopilotConfig.buckets.medium.maxPositions, percent: 0 },
  high: { current: 0, max: autopilotConfig.buckets.high.maxPositions, percent: 0 },
};

const defaultRiskBudget: RiskBudget = {
  used: 0,
  total: autopilotConfig.capital.maxDeployedEur,
  available: autopilotConfig.capital.maxDeployedEur,
  dailyDrawdown: 0,
  stressTestExposure: 0,
  riskLevel: 'normal',
  canOpenNew: true,
};

const defaultExchangeBalances: ExchangeBalance[] = autopilotConfig.exchanges.map(e => ({
  code: e.code,
  name: e.name,
  allocation: e.allocation,
  deployed: 0,
  available: e.allocation,
  purpose: e.purpose,
}));

function calculateBucketAllocation(positions: AutopilotPosition[]): BucketAllocation {
  const openPositions = positions.filter(p => p.status === 'open');
  
  const safeCurrent = openPositions.filter(p => p.risk_tier === 'safe').length;
  const mediumCurrent = openPositions.filter(p => p.risk_tier === 'medium').length;
  const highCurrent = openPositions.filter(p => p.risk_tier === 'high').length;
  
  return {
    safe: {
      current: safeCurrent,
      max: autopilotConfig.buckets.safe.maxPositions,
      percent: (safeCurrent / autopilotConfig.buckets.safe.maxPositions) * 100,
    },
    medium: {
      current: mediumCurrent,
      max: autopilotConfig.buckets.medium.maxPositions,
      percent: (mediumCurrent / autopilotConfig.buckets.medium.maxPositions) * 100,
    },
    high: {
      current: highCurrent,
      max: autopilotConfig.buckets.high.maxPositions,
      percent: (highCurrent / autopilotConfig.buckets.high.maxPositions) * 100,
    },
  };
}

function calculateRiskBudget(positions: AutopilotPosition[], dailyDrawdown: number): RiskBudget {
  const openPositions = positions.filter(p => p.status === 'open');
  const totalDeployed = openPositions.reduce((sum, p) => sum + p.size_eur, 0);
  const maxDeployable = autopilotConfig.capital.maxDeployedEur;
  
  // Stress test: assume worst case scenario
  const stressTestExposure = openPositions.reduce((sum, p) => {
    const worstCase = p.size_eur * (autopilotConfig.risk.stressTestMultiplier / 100);
    return sum + worstCase;
  }, 0);
  
  const riskLevel = getRiskLevel(Math.abs(dailyDrawdown));
  const available = maxDeployable - totalDeployed;
  const canOpen = canOpenNewHedge(openPositions.length, totalDeployed, Math.abs(dailyDrawdown));
  
  return {
    used: totalDeployed,
    total: maxDeployable,
    available,
    dailyDrawdown: Math.abs(dailyDrawdown),
    stressTestExposure,
    riskLevel,
    canOpenNew: canOpen,
  };
}

function calculateExchangeBalances(positions: AutopilotPosition[]): ExchangeBalance[] {
  const openPositions = positions.filter(p => p.status === 'open');
  
  return autopilotConfig.exchanges.map(e => {
    // Calculate deployed on this exchange (as long or short leg)
    const deployedAsLong = openPositions
      .filter(p => p.long_exchange.toLowerCase() === e.code.toLowerCase())
      .reduce((sum, p) => sum + (p.size_eur / 2), 0); // Half for each leg
    
    const deployedAsShort = openPositions
      .filter(p => p.short_exchange.toLowerCase() === e.code.toLowerCase())
      .reduce((sum, p) => sum + (p.size_eur / 2), 0);
    
    const deployed = deployedAsLong + deployedAsShort;
    
    return {
      code: e.code,
      name: e.name,
      allocation: e.allocation,
      deployed,
      available: e.allocation - deployed,
      purpose: e.purpose,
    };
  });
}

function calculateTodayPnl(positions: AutopilotPosition[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return positions
    .filter(p => new Date(p.entry_ts) >= today)
    .reduce((sum, p) => sum + p.unrealized_pnl_eur, 0);
}

function calculateWeeklyPnl(positions: AutopilotPosition[]): number {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  return positions
    .filter(p => new Date(p.entry_ts) >= weekAgo)
    .reduce((sum, p) => {
      if (p.status === 'closed' && p.realized_pnl_eur !== null) {
        return sum + p.realized_pnl_eur;
      }
      return sum + p.unrealized_pnl_eur;
    }, 0);
}

export const useAutopilotStore = create<AutopilotStore>((set, get) => ({
  // Initial state
  mode: 'off',
  isRunning: false,
  dryRunEnabled: false,
  killSwitchActive: false,
  killSwitchReason: null,
  lastScanTs: null,
  lastTradeTs: null,
  totalRealizedPnl: 0,
  totalFundingCollected: 0,
  dailyDrawdown: 0,
  positions: [],
  auditLogs: [],
  bucketAllocation: defaultBucketAllocation,
  riskBudget: defaultRiskBudget,
  exchangeBalances: defaultExchangeBalances,
  riskLevel: 'normal' as RiskLevel,
  todayPnl: 0,
  weeklyPnl: 0,
  isLoading: false,
  error: null,

  fetchState: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const { data, error } = await supabase
        .from('autopilot_state')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        const state = data as unknown as AutopilotState;
        const riskLevel = getRiskLevel(Math.abs(state.daily_drawdown_eur));
        set({
          mode: state.mode as AutopilotMode,
          isRunning: state.is_running,
          dryRunEnabled: state.dry_run_enabled ?? false,
          killSwitchActive: state.kill_switch_active,
          killSwitchReason: state.kill_switch_reason,
          lastScanTs: state.last_scan_ts,
          lastTradeTs: state.last_trade_ts,
          totalRealizedPnl: state.total_realized_pnl_eur,
          totalFundingCollected: state.total_funding_collected_eur,
          dailyDrawdown: state.daily_drawdown_eur,
          riskLevel,
        });
      }
    } catch (error) {
      set({ error: String(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPositions: async () => {
    try {
      const { data, error } = await supabase
        .from('autopilot_positions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const positions = (data || []) as unknown as AutopilotPosition[];
      const bucketAllocation = calculateBucketAllocation(positions);
      const riskBudget = calculateRiskBudget(positions, get().dailyDrawdown);
      const exchangeBalances = calculateExchangeBalances(positions);
      const todayPnl = calculateTodayPnl(positions);
      const weeklyPnl = calculateWeeklyPnl(positions);
      
      set({ 
        positions, 
        bucketAllocation, 
        riskBudget, 
        exchangeBalances,
        todayPnl,
        weeklyPnl,
      });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  fetchAuditLogs: async (limit = 50) => {
    try {
      const { data, error } = await supabase
        .from('autopilot_audit_log')
        .select('*')
        .order('ts', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      set({ auditLogs: (data || []) as unknown as AutopilotAuditLog[] });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  setMode: async (mode: AutopilotMode) => {
    try {
      const { error } = await supabase.functions.invoke('autopilot-control', {
        body: { action: 'set_mode', mode },
      });
      if (error) throw error;

      set({ mode });
      await get().fetchState();
    } catch (error) {
      set({ error: String(error) });
    }
  },

  setDryRun: async (enabled: boolean) => {
    try {
      const { data: stateData } = await supabase
        .from('autopilot_state')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (stateData) {
        const { error } = await supabase
          .from('autopilot_state')
          .update({ dry_run_enabled: enabled, updated_at: new Date().toISOString() })
          .eq('id', stateData.id);
        if (error) throw error;
      }

      set({ dryRunEnabled: enabled });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  start: async () => {
    try {
      const { error } = await supabase.functions.invoke('autopilot-control', {
        body: { action: 'set_running', is_running: true },
      });
      if (error) throw error;

      set({ isRunning: true });
      await get().fetchState();
    } catch (error) {
      set({ error: String(error) });
    }
  },

  stop: async () => {
    try {
      const { error } = await supabase.functions.invoke('autopilot-control', {
        body: { action: 'set_running', is_running: false },
      });
      if (error) throw error;

      set({ isRunning: false });
      await get().fetchState();
    } catch (error) {
      set({ error: String(error) });
    }
  },

  stopAll: async () => {
    try {
      const { error } = await supabase.functions.invoke('autopilot-control', {
        body: { action: 'stop_all' },
      });
      if (error) throw error;

      set({ isRunning: false });
      await Promise.all([get().fetchState(), get().fetchPositions()]);
    } catch (error) {
      set({ error: String(error) });
    }
  },

  closePosition: async (positionId: string, reason: string) => {
    try {
      const { error } = await supabase.functions.invoke('autopilot-control', {
        body: { action: 'close_position', position_id: positionId, reason },
      });
      if (error) throw error;

      await get().fetchPositions();
    } catch (error) {
      set({ error: String(error) });
    }
  },

  resetKillSwitch: async () => {
    try {
      const { error } = await supabase.functions.invoke('autopilot-control', {
        body: { action: 'reset_kill_switch' },
      });
      if (error) throw error;

      set({
        killSwitchActive: false,
        killSwitchReason: null,
        dailyDrawdown: 0,
        riskLevel: 'normal',
      });

      await get().fetchState();
    } catch (error) {
      set({ error: String(error) });
    }
  },

  subscribeToState: () => {
    const channel = supabase
      .channel('autopilot_state_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'autopilot_state' },
        () => {
          get().fetchState();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  },

  subscribeToPositions: () => {
    const channel = supabase
      .channel('autopilot_positions_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'autopilot_positions' },
        () => {
          get().fetchPositions();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
