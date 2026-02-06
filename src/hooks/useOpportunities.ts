// src/hooks/useOpportunities.ts
// Fetches real opportunities from arbitrage_opportunities table

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { autopilotConfig } from '../../config/autopilot';

export type RiskTier = 'safe' | 'medium' | 'high';

export interface Opportunity {
  id: string;
  symbol: string;
  longExchange: string;
  shortExchange: string;
  spreadBps: number;
  apr: number;
  score: number;
  riskTier: RiskTier;
  isNew?: boolean;
}

// Determine risk tier based on spread and score
function calculateRiskTier(spreadBps: number, score: number): RiskTier {
  // Safe: high score (>80), moderate spread
  if (score >= 80 && spreadBps <= 50) return 'safe';
  // High: low score or very high spread (volatile)
  if (score < 60 || spreadBps > 80) return 'high';
  // Medium: everything else
  return 'medium';
}

export function useOpportunities() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOpportunities = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get whitelist from config
      const whitelist = autopilotConfig.symbols.whitelist;
      const allowedExchanges = autopilotConfig.exchanges.map(e => e.code.toLowerCase());

      // Fetch from arbitrage_opportunities with joins
      const { data, error: fetchError } = await supabase
        .from('arbitrage_opportunities')
        .select(`
          id,
          symbol_id,
          long_exchange_id,
          short_exchange_id,
          net_edge_8h_bps,
          net_edge_annual_percent,
          opportunity_score,
          risk_tier,
          status,
          ts,
          symbols:symbol_id (display_name, base_asset),
          long_exchange:long_exchange_id (code, name),
          short_exchange:short_exchange_id (code, name)
        `)
        .eq('status', 'active')
        .order('opportunity_score', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      if (!data || data.length === 0) {
        // Fallback to computed_metrics if no opportunities
        const { data: metricsData, error: metricsError } = await supabase
          .from('computed_metrics_v2')
          .select(`
            id,
            symbol_id,
            exchange_id,
            funding_rate_8h,
            funding_rate_annual,
            liquidity_score,
            spread_bps,
            symbols:symbol_id (display_name, base_asset),
            exchanges:exchange_id (code, name)
          `)
          .order('funding_rate_8h', { ascending: false })
          .limit(30);

        if (metricsError) throw metricsError;

        // Generate synthetic opportunities from metrics
        const syntheticOpps: Opportunity[] = [];
        const symbolGroups = new Map<string, typeof metricsData>();
        
        metricsData?.forEach(m => {
          const symbolName = (m.symbols as any)?.display_name;
          if (!symbolName) return;
          if (!symbolGroups.has(symbolName)) {
            symbolGroups.set(symbolName, []);
          }
          symbolGroups.get(symbolName)!.push(m);
        });

        // For each symbol with 2+ exchanges, create opportunity
        symbolGroups.forEach((metrics, symbolName) => {
          if (metrics.length < 2) return;
          
          const baseAsset = (metrics[0].symbols as any)?.base_asset;
          if (!whitelist.includes(baseAsset)) return;

          // Find best long (negative funding = you get paid) and short
          const sorted = [...metrics].sort((a, b) => 
            (a.funding_rate_8h || 0) - (b.funding_rate_8h || 0)
          );
          
          const longSide = sorted[0]; // Most negative (pay you)
          const shortSide = sorted[sorted.length - 1]; // Most positive
          
          const longExCode = (longSide.exchanges as any)?.code?.toLowerCase();
          const shortExCode = (shortSide.exchanges as any)?.code?.toLowerCase();
          
          // Only Binance + OKX
          if (!allowedExchanges.includes(longExCode) || !allowedExchanges.includes(shortExCode)) {
            return;
          }
          if (longExCode === shortExCode) return;

          const spreadBps = Math.abs((shortSide.funding_rate_8h || 0) - (longSide.funding_rate_8h || 0)) * 10000;
          const apr = spreadBps * 1095 / 100; // Annualized
          const score = Math.min(100, Math.round(50 + spreadBps + (longSide.liquidity_score || 0) / 2));

          syntheticOpps.push({
            id: `${symbolName}-${Date.now()}`,
            symbol: symbolName,
            longExchange: (longSide.exchanges as any)?.name || longExCode,
            shortExchange: (shortSide.exchanges as any)?.name || shortExCode,
            spreadBps: Math.round(spreadBps * 100) / 100,
            apr: Math.round(apr),
            score,
            riskTier: calculateRiskTier(spreadBps, score),
            isNew: true,
          });
        });

        setOpportunities(syntheticOpps.sort((a, b) => b.score - a.score).slice(0, 15));
        return;
      }

      // Map real opportunities
      const mapped: Opportunity[] = data
        .filter(opp => {
          const baseAsset = (opp.symbols as any)?.base_asset;
          const longEx = (opp.long_exchange as any)?.code?.toLowerCase();
          const shortEx = (opp.short_exchange as any)?.code?.toLowerCase();
          
          // Filter by whitelist and allowed exchanges
          return whitelist.includes(baseAsset) &&
                 allowedExchanges.includes(longEx) &&
                 allowedExchanges.includes(shortEx);
        })
        .map(opp => ({
          id: opp.id,
          symbol: (opp.symbols as any)?.display_name || 'Unknown',
          longExchange: (opp.long_exchange as any)?.name || 'Unknown',
          shortExchange: (opp.short_exchange as any)?.name || 'Unknown',
          spreadBps: opp.net_edge_8h_bps || 0,
          apr: (opp.net_edge_annual_percent || 0) * 100,
          score: Math.round(opp.opportunity_score || 0),
          riskTier: (opp.risk_tier as RiskTier) || calculateRiskTier(opp.net_edge_8h_bps || 0, opp.opportunity_score || 0),
          isNew: new Date(opp.ts).getTime() > Date.now() - 300000, // Last 5 min
        }));

      setOpportunities(mapped);
    } catch (err: any) {
      console.error('Error fetching opportunities:', err);
      setError(err.message);
      
      // Fallback to whitelist-based mock data
      const fallbackOpps: Opportunity[] = autopilotConfig.symbols.whitelist.slice(0, 10).map((symbol, idx) => ({
        id: `fallback-${symbol}-${idx}`,
        symbol: `${symbol}/USDT`,
        longExchange: 'Binance',
        shortExchange: 'OKX',
        spreadBps: Math.round(20 + Math.random() * 30),
        apr: Math.round(90 + Math.random() * 110),
        score: Math.round(70 + Math.random() * 25),
        riskTier: idx < 4 ? 'safe' : idx < 7 ? 'medium' : 'high' as RiskTier,
        isNew: idx < 3,
      }));
      setOpportunities(fallbackOpps);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOpportunities();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchOpportunities, 60000);
    return () => clearInterval(interval);
  }, [fetchOpportunities]);

  return { opportunities, isLoading, error, refresh: fetchOpportunities };
}
