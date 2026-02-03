// src/store/autopilotStore.ts - Zustand store for Autopilot state

import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { 
  AutopilotStore, 
  AutopilotPosition, 
  AutopilotAuditLog, 
  AutopilotState,
  AutopilotMode,
  BucketAllocation,
  RiskBudget 
} from '@/types/autopilot';
import { autopilotConfig } from '../../config/autopilot';

const defaultBucketAllocation: BucketAllocation = {
  safe: { current: 0, max: autopilotConfig.buckets.safe.maxPositions, percent: 0 },
  medium: { current: 0, max: autopilotConfig.buckets.medium.maxPositions, percent: 0 },
  high: { current: 0, max: autopilotConfig.buckets.high.maxPositions, percent: 0 },
};

const defaultRiskBudget: RiskBudget = {
  used: 0,
  total: autopilotConfig.capital.totalEur * (autopilotConfig.capital.maxRiskPercent / 100),
  dailyDrawdown: 0,
  stressTestExposure: 0,
};

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
  const totalExposure = openPositions.reduce((sum, p) => sum + p.size_eur, 0);
  const maxRisk = autopilotConfig.capital.totalEur * (autopilotConfig.capital.maxRiskPercent / 100);
  
  // Stress test: assume 2x worst case
  const stressTestExposure = openPositions.reduce((sum, p) => {
    const worstCase = p.size_eur * (autopilotConfig.risk.stressTestMultiplier / 100);
    return sum + worstCase;
  }, 0);
  
  return {
    used: totalExposure,
    total: maxRisk,
    dailyDrawdown: Math.abs(dailyDrawdown),
    stressTestExposure,
  };
}

export const useAutopilotStore = create<AutopilotStore>((set, get) => ({
  // Initial state
  mode: 'off',
  isRunning: false,
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
        set({
          mode: state.mode,
          isRunning: state.is_running,
          killSwitchActive: state.kill_switch_active,
          killSwitchReason: state.kill_switch_reason,
          lastScanTs: state.last_scan_ts,
          lastTradeTs: state.last_trade_ts,
          totalRealizedPnl: state.total_realized_pnl_eur,
          totalFundingCollected: state.total_funding_collected_eur,
          dailyDrawdown: state.daily_drawdown_eur,
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
      
      set({ positions, bucketAllocation, riskBudget });
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
      // Get current state ID
      const { data: stateData } = await supabase
        .from('autopilot_state')
        .select('id')
        .limit(1)
        .maybeSingle();
      
      if (!stateData) {
        // Create initial state
        const { error } = await supabase
          .from('autopilot_state')
          .insert({ mode, is_running: false });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('autopilot_state')
          .update({ mode, updated_at: new Date().toISOString() })
          .eq('id', stateData.id);
        if (error) throw error;
      }
      
      set({ mode });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  start: async () => {
    try {
      const { data: stateData } = await supabase
        .from('autopilot_state')
        .select('id')
        .limit(1)
        .maybeSingle();
      
      if (stateData) {
        const { error } = await supabase
          .from('autopilot_state')
          .update({ is_running: true, updated_at: new Date().toISOString() })
          .eq('id', stateData.id);
        if (error) throw error;
      }
      
      set({ isRunning: true });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  stop: async () => {
    try {
      const { data: stateData } = await supabase
        .from('autopilot_state')
        .select('id')
        .limit(1)
        .maybeSingle();
      
      if (stateData) {
        const { error } = await supabase
          .from('autopilot_state')
          .update({ is_running: false, updated_at: new Date().toISOString() })
          .eq('id', stateData.id);
        if (error) throw error;
      }
      
      set({ isRunning: false });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  stopAll: async () => {
    try {
      // Stop autopilot
      await get().stop();
      
      // Close all open positions
      const { error } = await supabase
        .from('autopilot_positions')
        .update({
          status: 'stopped',
          exit_ts: new Date().toISOString(),
          exit_reason: 'Manual stop all',
          updated_at: new Date().toISOString(),
        })
        .eq('status', 'open');
      
      if (error) throw error;
      
      await get().fetchPositions();
    } catch (error) {
      set({ error: String(error) });
    }
  },

  closePosition: async (positionId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('autopilot_positions')
        .update({
          status: 'closed',
          exit_ts: new Date().toISOString(),
          exit_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', positionId);
      
      if (error) throw error;
      
      await get().fetchPositions();
    } catch (error) {
      set({ error: String(error) });
    }
  },

  resetKillSwitch: async () => {
    try {
      const { data: stateData } = await supabase
        .from('autopilot_state')
        .select('id')
        .limit(1)
        .maybeSingle();
      
      if (stateData) {
        const { error } = await supabase
          .from('autopilot_state')
          .update({
            kill_switch_active: false,
            kill_switch_reason: null,
            daily_drawdown_eur: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', stateData.id);
        if (error) throw error;
      }
      
      set({ killSwitchActive: false, killSwitchReason: null, dailyDrawdown: 0 });
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
